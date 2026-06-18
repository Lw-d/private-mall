import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import {
  AfterSaleActorType,
  AfterSaleStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
  RefundFailureSource,
  RefundStatus,
  UserCouponStatus,
} from '../../generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { WechatService } from '../wechat/wechat.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { CreateWechatPrepayDto } from './dto/create-wechat-prepay.dto';
import { WechatRefundNotifyDto } from './dto/wechat-refund-notify.dto';
import { WechatNotifyDto } from './dto/wechat-notify.dto';
import { RefundWorkflowService } from './refund-workflow.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refundWorkflowService: RefundWorkflowService,
    private readonly wechatService: WechatService,
  ) {}

  isRealWechatPayMode() {
    return this.wechatService.getPayMode() === 'real';
  }

  async createWechatPrepay(userId: string, dto: CreateWechatPrepayDto) {
    const order = await this.findOrderForUser(dto.orderId, userId);

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Only pending payment orders can be paid');
    }

    if (this.wechatService.getPayMode() === 'real') {
      return this.createRealWechatPrepay(order);
    }

    let payment = await this.prisma.payment.findFirst({
      where: {
        orderId: order.id,
        status: PaymentStatus.PENDING,
      },
    });

    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          paymentNo: this.generatePaymentNo(),
          orderId: order.id,
          amount: order.payableAmount,
          prepayId: this.generatePrepayId(),
        },
      });
    }

    return {
      payment,
      wechatPayParams: {
        appId: this.wechatService.getMiniappAppId(),
        timeStamp: Math.floor(Date.now() / 1000).toString(),
        nonceStr: Math.random().toString(36).slice(2, 18),
        package: `prepay_id=${payment.prepayId}`,
        signType: 'RSA',
        paySign: 'mock-pay-sign',
      },
    };
  }

  async handleWechatNotify(
    payload: WechatNotifyDto | unknown,
    context?: {
      headers: Record<string, string | string[] | undefined>;
      rawBody?: string;
    },
  ) {
    if (this.wechatService.getPayMode() === 'real') {
      return this.handleRealWechatNotify(payload, context);
    }

    return this.markWechatPaymentSuccess(this.parseMockWechatNotify(payload));
  }

  async handleWechatRefundNotify(
    payload: WechatRefundNotifyDto | unknown,
    context?: {
      headers: Record<string, string | string[] | undefined>;
      rawBody?: string;
    },
  ) {
    if (this.wechatService.getPayMode() === 'real') {
      return this.handleRealWechatRefundNotify(payload, context);
    }

    return this.markWechatRefundStatus(this.parseMockWechatRefundNotify(payload));
  }

  private async markWechatPaymentSuccess(input: {
    orderId?: string;
    orderNo: string;
    transactionId: string;
    amount: Decimal;
    tradeState?: string;
    notifyPayload: Prisma.InputJsonValue;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const order = input.orderId
        ? await tx.order.findUnique({ where: { id: input.orderId } })
        : await tx.order.findUnique({ where: { orderNo: input.orderNo } });

      if (!order || order.orderNo !== input.orderNo) {
        throw new NotFoundException('Order not found');
      }

      if (input.amount.toFixed(2) !== order.payableAmount.toFixed(2)) {
        throw new BadRequestException('Payment amount mismatch');
      }

      if (input.tradeState && input.tradeState !== 'SUCCESS') {
        const latestPayment = await tx.payment.findFirst({
          where: { orderId: order.id },
          orderBy: { createdAt: 'desc' },
        });

        return {
          received: true,
          idempotent: true,
          payment: latestPayment,
        };
      }

      const existingSuccess = await tx.payment.findUnique({
        where: { transactionId: input.transactionId },
      });

      if (existingSuccess?.status === PaymentStatus.SUCCESS) {
        return {
          received: true,
          idempotent: true,
          payment: existingSuccess,
        };
      }

      const payment = await tx.payment.findFirst({
        where: {
          orderId: order.id,
          status: PaymentStatus.PENDING,
        },
      });

      if (!payment) {
        const latestPayment = await tx.payment.findFirst({
          where: { orderId: order.id },
          orderBy: { createdAt: 'desc' },
        });

        return {
          received: true,
          idempotent: true,
          payment: latestPayment,
        };
      }

      const paidAt = new Date();
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          transactionId: input.transactionId,
          paidAt,
          notifyPayload: input.notifyPayload,
        },
      });

      if (order.status === OrderStatus.PENDING_PAYMENT) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PENDING_DELIVERY,
            paidAt,
          },
        });

        if (order.userCouponId) {
          await tx.userCoupon.updateMany({
            where: {
              id: order.userCouponId,
              status: UserCouponStatus.LOCKED,
              orderId: order.id,
            },
            data: {
              status: UserCouponStatus.USED,
              usedAt: paidAt,
            },
          });
        }

        if (order.couponId) {
          await tx.coupon.update({
            where: { id: order.couponId },
            data: {
              usedCount: {
                increment: 1,
              },
            },
          });
        }
      }

      return {
        received: true,
        idempotent: false,
        payment: updatedPayment,
      };
    });
  }

  private async handleRealWechatNotify(
    payload: unknown,
    context?: {
      headers: Record<string, string | string[] | undefined>;
      rawBody?: string;
    },
  ) {
    if (!context) {
      throw new BadRequestException('Wechat Pay notify context is missing');
    }

    const transaction = await this.wechatService.parsePaymentNotify({
      payload,
      headers: context.headers,
      rawBody: context.rawBody,
    });

    if (!transaction.out_trade_no || !transaction.transaction_id) {
      throw new BadRequestException('Wechat Pay notify transaction is invalid');
    }

    if (typeof transaction.amount?.total !== 'number') {
      throw new BadRequestException('Wechat Pay notify amount is invalid');
    }

    return this.markWechatPaymentSuccess({
      orderNo: transaction.out_trade_no,
      transactionId: transaction.transaction_id,
      amount: new Decimal(transaction.amount.total).div(100),
      tradeState: transaction.trade_state,
      notifyPayload: payload as Prisma.InputJsonValue,
    });
  }

  private parseMockWechatNotify(payload: unknown) {
    const record = this.asRecord(payload);
    const orderId = this.asString(record.orderId);
    const orderNo = this.asString(record.orderNo);
    const transactionId = this.asString(record.transactionId);
    const amount = typeof record.amount === 'number' ? record.amount : undefined;

    if (!orderId || !orderNo || !transactionId || amount === undefined) {
      throw new BadRequestException('Invalid mock WeChat notify payload');
    }

    return {
      orderId,
      orderNo,
      transactionId,
      amount: new Decimal(amount),
      tradeState: this.asString(record.tradeState),
      notifyPayload: payload as Prisma.InputJsonValue,
    };
  }

  private parseMockWechatRefundNotify(payload: unknown) {
    const record = this.asRecord(payload);
    const refundNo = this.asString(record.refundNo);
    const transactionId = this.asString(record.transactionId);
    const amount = typeof record.amount === 'number' ? record.amount : undefined;

    if (!refundNo || !transactionId || amount === undefined) {
      throw new BadRequestException('Invalid mock WeChat refund notify payload');
    }

    return {
      amount: new Decimal(amount),
      notifyPayload: payload as Prisma.InputJsonValue,
      refundNo,
      refundStatus: this.asString(record.refundStatus),
      transactionId,
    };
  }

  private async handleRealWechatRefundNotify(
    payload: unknown,
    context?: {
      headers: Record<string, string | string[] | undefined>;
      rawBody?: string;
    },
  ) {
    if (!context) {
      throw new BadRequestException('Wechat Pay refund notify context is missing');
    }

    const refund = await this.wechatService.parseRefundNotify({
      payload,
      headers: context.headers,
      rawBody: context.rawBody,
    });

    if (!refund.out_refund_no) {
      throw new BadRequestException('Wechat Pay refund notify refund number is invalid');
    }

    const amount = typeof refund.amount?.refund === 'number' ? refund.amount.refund : undefined;

    return this.markWechatRefundStatus({
      amount: amount === undefined ? undefined : new Decimal(amount).div(100),
      notifyPayload: payload as Prisma.InputJsonValue,
      refundNo: refund.out_refund_no,
      refundStatus: refund.refund_status,
      transactionId: refund.refund_id ?? refund.transaction_id,
    });
  }

  private async markWechatRefundStatus(input: {
    amount?: Decimal;
    notifyPayload: Prisma.InputJsonValue;
    refundNo: string;
    refundStatus?: string;
    transactionId?: string;
  }) {
    const status = this.resolveRefundNotifyStatus(input.refundStatus);

    if (!status) {
      const refund = await this.prisma.refund.findUnique({
        where: { refundNo: input.refundNo },
      });

      if (!refund) {
        throw new NotFoundException('Refund not found');
      }

      return {
        received: true,
        idempotent: true,
        refund,
      };
    }

    const refund = await this.refundWorkflowService.updateStatusByRefundNo(input.refundNo, status, {
      amount: input.amount,
      failureReason:
        status === RefundStatus.FAILED ? this.describeRefundFailure(input.refundStatus) : undefined,
      failureSource: status === RefundStatus.FAILED ? RefundFailureSource.WECHAT_NOTIFY : undefined,
      notifyPayload: input.notifyPayload,
      transactionId: input.transactionId,
    });

    return {
      received: true,
      idempotent: false,
      refund,
    };
  }

  private resolveRefundNotifyStatus(status?: string) {
    if (status === 'SUCCESS') {
      return RefundStatus.SUCCESS;
    }

    if (status === 'FAILED' || status === 'CLOSED' || status === 'ABNORMAL') {
      return RefundStatus.FAILED;
    }

    return undefined;
  }

  async getPaymentStatus(userId: string, orderId: string) {
    await this.findOrderForUser(orderId, userId);

    const payments = await this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      orderId,
      payments,
    };
  }

  async createRefund(userId: string, dto: CreateRefundDto) {
    const order = await this.findOrderForUser(dto.orderId, userId);
    const refund = await this.createRefundRecord(order, new Decimal(dto.amount), dto.reason);

    if (this.wechatService.getPayMode() === 'real') {
      return this.createRealWechatRefund(refund.id);
    }

    return refund;
  }

  async createAfterSaleRefund(input: {
    afterSaleId: string;
    orderId: string;
    amount: Decimal | number | string;
    reason: string;
  }) {
    const order = await this.prisma.order.findUnique({
      where: { id: input.orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const refund = await this.createRefundRecord(order, new Decimal(input.amount), input.reason, {
      afterSaleId: input.afterSaleId,
    });

    if (this.wechatService.getPayMode() === 'real') {
      return this.createRealWechatRefund(refund.id);
    }

    return refund;
  }

  private async createRefundRecord(
    order: Pick<
      Prisma.OrderGetPayload<Record<string, never>>,
      'id' | 'orderNo' | 'payableAmount' | 'status' | 'userId'
    >,
    amount: Decimal,
    reason?: string,
    options: { afterSaleId?: string } = {},
  ) {
    if (
      order.status !== OrderStatus.PENDING_DELIVERY &&
      order.status !== OrderStatus.PAID &&
      order.status !== OrderStatus.SHIPPED &&
      order.status !== OrderStatus.COMPLETED
    ) {
      throw new BadRequestException('Only paid orders can be refunded');
    }

    if (amount.lte(0) || amount.gt(order.payableAmount)) {
      throw new BadRequestException('Invalid refund amount');
    }

    const activeRefunds = await this.prisma.refund.findMany({
      where: {
        orderId: order.id,
        status: {
          in: [RefundStatus.PENDING, RefundStatus.SUCCESS],
        },
      },
      select: { amount: true },
    });
    const activeRefundAmount = activeRefunds.reduce(
      (sum, item) => sum.add(item.amount),
      new Decimal(0),
    );

    if (activeRefundAmount.add(amount).gt(order.payableAmount)) {
      throw new BadRequestException('Refund amount exceeds remaining refundable amount');
    }

    const successfulPayment = await this.prisma.payment.findFirst({
      where: {
        orderId: order.id,
        status: PaymentStatus.SUCCESS,
      },
      orderBy: {
        paidAt: 'desc',
      },
    });
    return this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          refundNo: this.generateRefundNo(),
          orderId: order.id,
          paymentId: successfulPayment?.id,
          amount,
          reason,
          status: RefundStatus.PENDING,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.REFUNDING,
        },
      });

      if (order.status === OrderStatus.COMPLETED) {
        await this.refundWorkflowService.syncEarnedPointsDeductForOrder(tx, order);
      }

      if (options.afterSaleId) {
        await tx.afterSale.update({
          where: { id: options.afterSaleId },
          data: {
            refundId: refund.id,
            status: AfterSaleStatus.REFUNDING,
          },
        });

        await tx.afterSaleLog.create({
          data: {
            afterSaleId: options.afterSaleId,
            actorType: AfterSaleActorType.ADMIN,
            action: 'TRIGGER_REFUND',
            content: `后台触发售后退款，退款单号：${refund.refundNo}`,
          },
        });
      }

      return refund;
    });
  }

  async retryWechatRefund(refundId: string) {
    if (this.wechatService.getPayMode() !== 'real') {
      throw new BadRequestException('Only real WeChat refunds can be retried');
    }

    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        order: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.status !== RefundStatus.FAILED) {
      throw new BadRequestException('Only failed refunds can be retried');
    }

    if (
      refund.failureSource !== RefundFailureSource.WECHAT_REQUEST &&
      refund.failureSource !== RefundFailureSource.WECHAT_NOTIFY
    ) {
      throw new BadRequestException('Only failed WeChat refunds can be retried');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.refund.update({
        where: { id: refund.id },
        data: {
          failureReason: null,
          failureSource: null,
          status: RefundStatus.PENDING,
        },
      });

      await tx.order.update({
        where: { id: refund.orderId },
        data: {
          status: OrderStatus.REFUNDING,
        },
      });

      if (refund.order.completedAt) {
        await this.refundWorkflowService.syncEarnedPointsDeductForOrder(tx, refund.order);
      }
    });

    return this.createRealWechatRefund(refund.id);
  }

  private async createRealWechatRefund(refundId: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        order: true,
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    let result: Awaited<ReturnType<typeof this.wechatService.createRefund>>;

    try {
      result = await this.wechatService.createRefund({
        amountCents: this.toAmountCents(refund.amount),
        orderNo: refund.order.orderNo,
        reason: refund.reason ?? undefined,
        refundNo: refund.refundNo,
        totalAmountCents: this.toAmountCents(refund.order.payableAmount),
      });
    } catch (error) {
      await this.refundWorkflowService.updateStatusById(refund.id, RefundStatus.FAILED, {
        failureReason: this.getErrorMessage(error),
        failureSource: RefundFailureSource.WECHAT_REQUEST,
      });
      throw error;
    }

    const status = this.resolveRefundNotifyStatus(result.status);

    if (status) {
      return this.refundWorkflowService.updateStatusByRefundNo(refund.refundNo, status, {
        failureReason:
          status === RefundStatus.FAILED ? this.describeRefundFailure(result.status) : undefined,
        failureSource:
          status === RefundStatus.FAILED ? RefundFailureSource.WECHAT_REQUEST : undefined,
        notifyPayload: result as Prisma.InputJsonValue,
        transactionId: result.refund_id,
      });
    }

    return this.prisma.refund.update({
      where: { id: refund.id },
      data: {
        notifyPayload: result as Prisma.InputJsonValue,
        transactionId: result.refund_id,
      },
    });
  }

  private async findOrderForUser(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Cannot access this order');
    }

    return order;
  }

  private async createRealWechatPrepay(order: Awaited<ReturnType<typeof this.findOrderForUser>>) {
    let payment = await this.prisma.payment.findFirst({
      where: {
        orderId: order.id,
        status: PaymentStatus.PENDING,
      },
    });
    const reusablePrepayId =
      payment?.prepayId && !payment.prepayId.startsWith('wx_prepay_')
        ? payment.prepayId
        : undefined;
    const prepayId =
      reusablePrepayId ??
      (await this.wechatService.createJsapiPrepay({
        orderNo: order.orderNo,
        description: `商城订单 ${order.orderNo}`,
        amountCents: this.toAmountCents(order.payableAmount),
        openId: order.user.openId,
      }));

    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          paymentNo: this.generatePaymentNo(),
          orderId: order.id,
          amount: order.payableAmount,
          prepayId,
        },
      });
    } else if (payment.prepayId !== prepayId) {
      payment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: { prepayId },
      });
    }

    return {
      payment,
      wechatPayParams: await this.wechatService.createJsapiPaymentParams(prepayId),
    };
  }

  private toAmountCents(amount: Decimal) {
    const [yuan, cents] = amount.toFixed(2).split('.');

    return Number(yuan) * 100 + Number(cents);
  }

  private describeRefundFailure(status?: string) {
    return status ? `Wechat refund status: ${status}` : undefined;
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Wechat refund request failed';
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  }

  private asString(value: unknown) {
    return typeof value === 'string' ? value : undefined;
  }

  private generatePaymentNo() {
    return `PAY${this.generateTimeSerial()}`;
  }

  private generatePrepayId() {
    return `wx_prepay_${this.generateTimeSerial()}`;
  }

  private generateRefundNo() {
    return `REF${this.generateTimeSerial()}`;
  }

  private generateTimeSerial() {
    const date = new Date();
    const timestamp = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
      String(date.getHours()).padStart(2, '0'),
      String(date.getMinutes()).padStart(2, '0'),
      String(date.getSeconds()).padStart(2, '0'),
      String(date.getMilliseconds()).padStart(3, '0'),
    ].join('');
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${timestamp}${random}`;
  }
}
