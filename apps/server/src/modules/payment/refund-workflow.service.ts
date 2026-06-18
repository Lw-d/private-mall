import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AfterSaleActorType,
  AfterSaleStatus,
  AfterSaleType,
  OrderStatus,
  PointLedgerType,
  Prisma,
  RefundFailureSource,
  RefundStatus,
} from '../../generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';

type RefundWithOrder = Prisma.RefundGetPayload<{ include: { order: true } }>;
type RefundTerminalStatus = Extract<RefundStatus, 'SUCCESS' | 'FAILED'>;

@Injectable()
export class RefundWorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  async updateStatusById(
    id: string,
    status: RefundTerminalStatus,
    input: {
      failureReason?: string;
      failureSource?: RefundFailureSource;
      notifyPayload?: Prisma.InputJsonValue;
      transactionId?: string;
    } = {},
  ) {
    const refund = await this.prisma.refund.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    return this.processStatus(refund, status, input);
  }

  async updateStatusByRefundNo(
    refundNo: string,
    status: RefundTerminalStatus,
    input: {
      failureReason?: string;
      failureSource?: RefundFailureSource;
      amount?: Prisma.Decimal;
      notifyPayload?: Prisma.InputJsonValue;
      transactionId?: string;
    } = {},
  ) {
    const refund = await this.prisma.refund.findUnique({
      where: { refundNo },
      include: { order: true },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (input.amount && input.amount.toFixed(2) !== refund.amount.toFixed(2)) {
      throw new BadRequestException('Refund amount mismatch');
    }

    return this.processStatus(refund, status, input);
  }

  private async processStatus(
    refund: RefundWithOrder,
    status: RefundTerminalStatus,
    input: {
      failureReason?: string;
      failureSource?: RefundFailureSource;
      notifyPayload?: Prisma.InputJsonValue;
      transactionId?: string;
    } = {},
  ) {
    if (refund.status === status) {
      return refund;
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('Only pending refunds can be processed');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedRefund = await tx.refund.update({
        where: { id: refund.id },
        data: {
          failureReason: status === RefundStatus.FAILED ? input.failureReason : null,
          failureSource: status === RefundStatus.FAILED ? input.failureSource : null,
          notifyPayload: input.notifyPayload,
          status,
          transactionId: input.transactionId,
        },
      });

      const orderStatus =
        status === RefundStatus.SUCCESS
          ? await this.resolveSuccessfulOrderStatus(tx, refund)
          : this.resolveRejectedOrderStatus(refund);

      await tx.order.update({
        where: { id: refund.orderId },
        data: {
          status: orderStatus,
        },
      });

      if (status === RefundStatus.FAILED) {
        await this.restoreDeductedPoints(tx, refund);
      } else {
        await this.restoreRedeemedPoints(tx, refund);
      }

      await this.syncAfterSaleForRefund(tx, refund, status, input.failureReason);

      return updatedRefund;
    });
  }

  private async syncAfterSaleForRefund(
    tx: Prisma.TransactionClient,
    refund: RefundWithOrder,
    status: RefundTerminalStatus,
    failureReason?: string,
  ) {
    const afterSale = await tx.afterSale.findUnique({
      where: { refundId: refund.id },
      select: {
        id: true,
        type: true,
      },
    });

    if (!afterSale) {
      return;
    }

    if (status === RefundStatus.SUCCESS) {
      await tx.afterSale.update({
        where: { id: afterSale.id },
        data: {
          status: AfterSaleStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      await tx.afterSaleLog.create({
        data: {
          afterSaleId: afterSale.id,
          actorType: AfterSaleActorType.SYSTEM,
          action: 'REFUND_SUCCESS',
          content: `退款成功，退款单号：${refund.refundNo}`,
        },
      });
      return;
    }

    const rollbackStatus =
      afterSale.type === AfterSaleType.RETURN_REFUND
        ? AfterSaleStatus.MERCHANT_RECEIVED
        : AfterSaleStatus.APPROVED;

    await tx.afterSale.update({
      where: { id: afterSale.id },
      data: {
        status: rollbackStatus,
      },
    });

    await tx.afterSaleLog.create({
      data: {
        afterSaleId: afterSale.id,
        actorType: AfterSaleActorType.SYSTEM,
        action: 'REFUND_FAILED',
        content: failureReason
          ? `退款失败，退款单号：${refund.refundNo}，原因：${failureReason}`
          : `退款失败，退款单号：${refund.refundNo}`,
      },
    });
  }

  private resolveRejectedOrderStatus(refund: RefundWithOrder) {
    if (refund.order.completedAt) {
      return OrderStatus.COMPLETED;
    }

    if (refund.order.shippedAt) {
      return OrderStatus.SHIPPED;
    }

    if (refund.order.paidAt) {
      return OrderStatus.PENDING_DELIVERY;
    }

    return OrderStatus.PENDING_DELIVERY;
  }

  private async resolveSuccessfulOrderStatus(
    tx: Prisma.TransactionClient,
    refund: RefundWithOrder,
  ) {
    const successRefunds = await tx.refund.findMany({
      where: {
        orderId: refund.orderId,
        status: RefundStatus.SUCCESS,
      },
      select: { amount: true },
    });
    const successRefundAmount = successRefunds.reduce(
      (sum, item) => sum.add(item.amount),
      new Prisma.Decimal(0),
    );

    if (successRefundAmount.gte(refund.order.payableAmount)) {
      return OrderStatus.REFUNDED;
    }

    return this.resolveRejectedOrderStatus(refund);
  }

  async syncEarnedPointsDeductForOrder(
    tx: Prisma.TransactionClient,
    order: Pick<RefundWithOrder['order'], 'id' | 'orderNo' | 'payableAmount' | 'userId'>,
  ) {
    const earnedLedger = await tx.pointLedger.findUnique({
      where: {
        orderId_type: {
          orderId: order.id,
          type: PointLedgerType.ORDER_EARN,
        },
      },
    });

    if (!earnedLedger || earnedLedger.points <= 0 || order.payableAmount.lte(0)) {
      return;
    }

    const refunds = await tx.refund.findMany({
      where: {
        orderId: order.id,
        status: {
          in: [RefundStatus.PENDING, RefundStatus.SUCCESS],
        },
      },
      select: { amount: true },
    });
    const activeRefundAmount = refunds.reduce(
      (sum, item) => sum.add(item.amount),
      new Prisma.Decimal(0),
    );
    const targetDeductedPoints = Math.min(
      earnedLedger.points,
      Math.max(
        0,
        activeRefundAmount.mul(earnedLedger.points).div(order.payableAmount).floor().toNumber(),
      ),
    );

    const existingDeductLedger = await tx.pointLedger.findUnique({
      where: {
        orderId_type: {
          orderId: order.id,
          type: PointLedgerType.ORDER_REFUND_DEDUCT,
        },
      },
    });
    const currentDeductedPoints =
      existingDeductLedger && existingDeductLedger.points < 0
        ? Math.abs(existingDeductLedger.points)
        : 0;
    const deltaPoints = targetDeductedPoints - currentDeductedPoints;

    if (deltaPoints === 0) {
      return;
    }

    const user = await tx.user.update({
      where: { id: order.userId },
      data: {
        pointsBalance:
          deltaPoints > 0
            ? {
                decrement: deltaPoints,
              }
            : {
                increment: Math.abs(deltaPoints),
              },
      },
    });

    if (targetDeductedPoints <= 0) {
      if (existingDeductLedger) {
        await tx.pointLedger.delete({
          where: { id: existingDeductLedger.id },
        });
      }

      return;
    }

    if (existingDeductLedger) {
      await tx.pointLedger.update({
        where: { id: existingDeductLedger.id },
        data: {
          points: -targetDeductedPoints,
          balanceAfter: user.pointsBalance,
        },
      });
      return;
    }

    await tx.pointLedger.create({
      data: {
        userId: order.userId,
        orderId: order.id,
        type: PointLedgerType.ORDER_REFUND_DEDUCT,
        points: -targetDeductedPoints,
        balanceAfter: user.pointsBalance,
        description: `订单 ${order.orderNo} 退款扣回积分`,
      },
    });
  }

  private async restoreDeductedPoints(tx: Prisma.TransactionClient, refund: RefundWithOrder) {
    await this.syncEarnedPointsDeductForOrder(tx, refund.order);
  }

  private async restoreRedeemedPoints(tx: Prisma.TransactionClient, refund: RefundWithOrder) {
    if (refund.order.pointsUsed <= 0) {
      return;
    }

    const successRefunds = await tx.refund.findMany({
      where: {
        orderId: refund.orderId,
        status: RefundStatus.SUCCESS,
      },
      select: { amount: true },
    });
    const successRefundAmount = successRefunds.reduce(
      (sum, item) => sum.add(item.amount),
      new Prisma.Decimal(0),
    );
    const targetRefundPoints = Math.min(
      refund.order.pointsUsed,
      Math.max(
        0,
        successRefundAmount
          .mul(refund.order.pointsUsed)
          .div(refund.order.payableAmount)
          .floor()
          .toNumber(),
      ),
    );

    const existingRefundLedger = await tx.pointLedger.findUnique({
      where: {
        orderId_type: {
          orderId: refund.orderId,
          type: PointLedgerType.ORDER_REDEEM_REFUND,
        },
      },
    });
    const currentRefundPoints = existingRefundLedger?.points ?? 0;
    const deltaPoints = targetRefundPoints - currentRefundPoints;

    if (deltaPoints <= 0) {
      return;
    }

    const user = await tx.user.update({
      where: { id: refund.order.userId },
      data: {
        pointsBalance: {
          increment: deltaPoints,
        },
      },
    });

    if (existingRefundLedger) {
      await tx.pointLedger.update({
        where: { id: existingRefundLedger.id },
        data: {
          points: targetRefundPoints,
          balanceAfter: user.pointsBalance,
        },
      });
      return;
    }

    await tx.pointLedger.create({
      data: {
        userId: refund.order.userId,
        orderId: refund.orderId,
        type: PointLedgerType.ORDER_REDEEM_REFUND,
        points: targetRefundPoints,
        balanceAfter: user.pointsBalance,
        description: `订单 ${refund.order.orderNo} 退款返还抵扣积分`,
      },
    });
  }
}
