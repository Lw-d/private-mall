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
  AfterSaleType,
  OrderStatus,
  Prisma,
} from '../../generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import { CreateAfterSaleDto } from './dto/create-after-sale.dto';
import {
  QueryAdminAfterSalesDto,
  QueryAfterSalesDto,
  QueryAfterSaleSummaryDto,
} from './dto/query-after-sales.dto';
import {
  ApproveAfterSaleDto,
  ConfirmReturnReceivedDto,
  RejectAfterSaleDto,
  SubmitReturnLogisticsDto,
} from './dto/review-after-sale.dto';

const ACTIVE_AFTER_SALE_STATUSES: AfterSaleStatus[] = [
  AfterSaleStatus.REQUESTED,
  AfterSaleStatus.APPROVED,
  AfterSaleStatus.WAIT_BUYER_RETURN,
  AfterSaleStatus.BUYER_RETURNED,
  AfterSaleStatus.MERCHANT_RECEIVED,
  AfterSaleStatus.REFUNDING,
];

@Injectable()
export class AfterSaleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
  ) {}

  async create(userId: string, dto: CreateAfterSaleDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        afterSales: {
          where: {
            status: {
              in: ACTIVE_AFTER_SALE_STATUSES,
            },
          },
          select: { id: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.assertOrderOwner(order.userId, userId);
    this.assertOrderCanApplyAfterSale(order.status);
    this.assertAfterSaleTypeAllowed(dto.type, order);

    if (order.afterSales.length > 0) {
      throw new BadRequestException('Order already has an active after-sale request');
    }

    const requestedAmount = new Decimal(dto.requestedAmount);
    this.assertRequestedAmount(requestedAmount, order.payableAmount);

    return this.prisma.$transaction(async (tx) => {
      const afterSale = await tx.afterSale.create({
        data: {
          afterSaleNo: this.generateAfterSaleNo(),
          orderId: order.id,
          userId,
          type: dto.type,
          reason: dto.reason.trim(),
          description: dto.description?.trim() || undefined,
          evidenceImageUrls: dto.evidenceImageUrls ?? undefined,
          requestedAmount,
          logs: {
            create: {
              actorType: AfterSaleActorType.USER,
              actorId: userId,
              action: 'CREATE',
              content: '用户提交售后申请',
            },
          },
        },
        include: this.detailInclude,
      });

      return afterSale;
    });
  }

  async findMany(userId: string, query: QueryAfterSalesDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where: Prisma.AfterSaleWhereInput = {
      userId,
      orderId: query.orderId,
      status: query.status,
      type: query.type,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.afterSale.count({ where }),
      this.prisma.afterSale.findMany({
        where,
        include: this.detailInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async getSummary(userId: string, query: QueryAfterSaleSummaryDto) {
    const where: Prisma.AfterSaleWhereInput = {
      userId,
      orderId: query.orderId,
      type: query.type,
    };

    const [total, groupedStatusCounts] = await this.prisma.$transaction([
      this.prisma.afterSale.count({ where }),
      this.prisma.afterSale.groupBy({
        by: ['status'],
        where,
        orderBy: {
          status: 'asc',
        },
        _count: {
          status: true,
        },
      }),
    ]);

    const countMap = new Map(
      groupedStatusCounts.map((item) => {
        const count =
          item._count && typeof item._count === 'object' ? (item._count.status ?? 0) : 0;

        return [item.status, count] as const;
      }),
    );

    return {
      total,
      statusCounts: Object.values(AfterSaleStatus).map((status) => ({
        status,
        count: countMap.get(status) ?? 0,
      })),
    };
  }

  async findById(userId: string, id: string) {
    const afterSale = await this.findExisting(id, false);
    this.assertOrderOwner(afterSale.userId, userId);
    return afterSale;
  }

  async cancel(userId: string, id: string) {
    const afterSale = await this.findExisting(id, false);
    this.assertOrderOwner(afterSale.userId, userId);

    if (
      afterSale.status !== AfterSaleStatus.REQUESTED &&
      afterSale.status !== AfterSaleStatus.WAIT_BUYER_RETURN
    ) {
      throw new BadRequestException('Only pending after-sales can be cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.afterSaleLog.create({
        data: {
          afterSaleId: id,
          actorType: AfterSaleActorType.USER,
          actorId: userId,
          action: 'CANCEL',
          content: '用户取消售后申请',
        },
      });

      return tx.afterSale.update({
        where: { id },
        data: {
          status: AfterSaleStatus.CANCELLED,
          cancelledAt: new Date(),
        },
        include: this.detailInclude,
      });
    });
  }

  async submitReturnLogistics(userId: string, id: string, dto: SubmitReturnLogisticsDto) {
    const afterSale = await this.findExisting(id, false);
    this.assertOrderOwner(afterSale.userId, userId);

    if (afterSale.status !== AfterSaleStatus.WAIT_BUYER_RETURN) {
      throw new BadRequestException('Only after-sales waiting buyer return can submit logistics');
    }

    const returnLogisticsCompany = this.normalizeRequiredText(
      dto.returnLogisticsCompany,
      'Return logistics company is required',
    );
    const returnTrackingNo = this.normalizeRequiredText(
      dto.returnTrackingNo,
      'Return tracking number is required',
    );
    const returnRemark = dto.returnRemark?.trim() || undefined;

    return this.prisma.$transaction(async (tx) => {
      await tx.afterSaleLog.create({
        data: {
          afterSaleId: id,
          actorType: AfterSaleActorType.USER,
          actorId: userId,
          action: 'SUBMIT_RETURN_LOGISTICS',
          content: `用户填写退货物流：${returnLogisticsCompany} ${returnTrackingNo}`,
        },
      });

      return tx.afterSale.update({
        where: { id },
        data: {
          status: AfterSaleStatus.BUYER_RETURNED,
          returnLogisticsCompany,
          returnTrackingNo,
          returnRemark,
          buyerReturnedAt: new Date(),
        },
        include: this.detailInclude,
      });
    });
  }

  async findManyForAdmin(query: QueryAdminAfterSalesDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const keyword = query.keyword?.trim();
    const where: Prisma.AfterSaleWhereInput = {
      orderId: query.orderId,
      status: query.status,
      type: query.type,
      OR: keyword
        ? [
            { afterSaleNo: { contains: keyword } },
            { order: { is: { orderNo: { contains: keyword } } } },
            { user: { is: { openId: { contains: keyword } } } },
            { user: { is: { nickname: { contains: keyword } } } },
            { user: { is: { phone: { contains: keyword } } } },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.afterSale.count({ where }),
      this.prisma.afterSale.findMany({
        where,
        include: this.adminDetailInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  findByIdForAdmin(id: string) {
    return this.findExisting(id, true);
  }

  async approveForAdmin(id: string, dto: ApproveAfterSaleDto) {
    const afterSale = await this.findExisting(id, true);

    if (afterSale.status !== AfterSaleStatus.REQUESTED) {
      throw new BadRequestException('Only requested after-sales can be approved');
    }

    const approvedAmount = dto.approvedAmount
      ? new Decimal(dto.approvedAmount)
      : afterSale.requestedAmount;
    this.assertRequestedAmount(approvedAmount, afterSale.requestedAmount);

    const nextStatus =
      afterSale.type === AfterSaleType.RETURN_REFUND
        ? AfterSaleStatus.WAIT_BUYER_RETURN
        : AfterSaleStatus.APPROVED;

    return this.prisma.$transaction(async (tx) => {
      await tx.afterSaleLog.create({
        data: {
          afterSaleId: id,
          actorType: AfterSaleActorType.ADMIN,
          action: 'APPROVE',
          content:
            nextStatus === AfterSaleStatus.WAIT_BUYER_RETURN
              ? '后台审核通过，等待用户退货'
              : '后台审核通过',
        },
      });

      return tx.afterSale.update({
        where: { id },
        data: {
          status: nextStatus,
          approvedAmount,
          merchantRemark: dto.merchantRemark?.trim() || undefined,
          approvedAt: new Date(),
        },
        include: this.adminDetailInclude,
      });
    });
  }

  async rejectForAdmin(id: string, dto: RejectAfterSaleDto) {
    const afterSale = await this.findExisting(id, true);

    if (afterSale.status !== AfterSaleStatus.REQUESTED) {
      throw new BadRequestException('Only requested after-sales can be rejected');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.afterSaleLog.create({
        data: {
          afterSaleId: id,
          actorType: AfterSaleActorType.ADMIN,
          action: 'REJECT',
          content: dto.rejectReason.trim(),
        },
      });

      return tx.afterSale.update({
        where: { id },
        data: {
          status: AfterSaleStatus.REJECTED,
          rejectReason: dto.rejectReason.trim(),
          merchantRemark: dto.merchantRemark?.trim() || undefined,
          rejectedAt: new Date(),
        },
        include: this.adminDetailInclude,
      });
    });
  }

  async confirmReturnReceivedForAdmin(id: string, dto: ConfirmReturnReceivedDto) {
    const afterSale = await this.findExisting(id, true);

    if (afterSale.status !== AfterSaleStatus.BUYER_RETURNED) {
      throw new BadRequestException('Only returned after-sales can be confirmed received');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.afterSaleLog.create({
        data: {
          afterSaleId: id,
          actorType: AfterSaleActorType.ADMIN,
          action: 'CONFIRM_RETURN_RECEIVED',
          content: dto.merchantRemark?.trim() || '商家确认收到退货',
        },
      });

      return tx.afterSale.update({
        where: { id },
        data: {
          status: AfterSaleStatus.MERCHANT_RECEIVED,
          merchantRemark: dto.merchantRemark?.trim() || afterSale.merchantRemark,
          merchantReceivedAt: new Date(),
        },
        include: this.adminDetailInclude,
      });
    });
  }

  async triggerRefundForAdmin(id: string) {
    const afterSale = await this.findExisting(id, true);

    if (afterSale.refundId) {
      throw new BadRequestException('After-sale refund has already been triggered');
    }

    if (!this.canTriggerRefund(afterSale)) {
      throw new BadRequestException('Current after-sale status cannot trigger refund');
    }

    const refundAmount = afterSale.approvedAmount ?? afterSale.requestedAmount;
    const reason = `售后退款 ${afterSale.afterSaleNo}：${afterSale.reason}`;

    await this.paymentService.createAfterSaleRefund({
      afterSaleId: afterSale.id,
      orderId: afterSale.orderId,
      amount: refundAmount,
      reason,
    });

    return this.findExisting(id, true);
  }

  private async findExisting(id: string, admin: boolean) {
    const afterSale = await this.prisma.afterSale.findUnique({
      where: { id },
      include: admin ? this.adminDetailInclude : this.detailInclude,
    });

    if (!afterSale) {
      throw new NotFoundException('After-sale request not found');
    }

    return afterSale;
  }

  private assertOrderOwner(orderUserId: string, currentUserId: string) {
    if (orderUserId !== currentUserId) {
      throw new ForbiddenException('Cannot access this after-sale request');
    }
  }

  private assertOrderCanApplyAfterSale(status: OrderStatus) {
    if (
      status === OrderStatus.PENDING_PAYMENT ||
      status === OrderStatus.CANCELLED ||
      status === OrderStatus.REFUNDED
    ) {
      throw new BadRequestException('Current order status cannot apply after-sale');
    }
  }

  private assertAfterSaleTypeAllowed(
    type: AfterSaleType,
    order: Pick<Prisma.OrderGetPayload<Record<string, never>>, 'status' | 'shippedAt'>,
  ) {
    if (
      type === AfterSaleType.RETURN_REFUND &&
      order.status !== OrderStatus.SHIPPED &&
      order.status !== OrderStatus.COMPLETED
    ) {
      throw new BadRequestException('Return refund requires a shipped or completed order');
    }
  }

  private assertRequestedAmount(amount: Decimal, maxAmount: Decimal) {
    if (amount.lte(0)) {
      throw new BadRequestException('After-sale amount must be greater than 0');
    }

    if (amount.gt(maxAmount)) {
      throw new BadRequestException('After-sale amount exceeds refundable amount');
    }
  }

  private canTriggerRefund(
    afterSale: Pick<Prisma.AfterSaleGetPayload<Record<string, never>>, 'type' | 'status'>,
  ) {
    return (
      (afterSale.type === AfterSaleType.REFUND_ONLY &&
        afterSale.status === AfterSaleStatus.APPROVED) ||
      (afterSale.type === AfterSaleType.RETURN_REFUND &&
        afterSale.status === AfterSaleStatus.MERCHANT_RECEIVED)
    );
  }

  private normalizeRequiredText(value: string | undefined, message: string) {
    const normalized = value?.trim();
    if (!normalized) {
      throw new BadRequestException(message);
    }

    return normalized;
  }

  private generateAfterSaleNo() {
    const now = new Date();
    const timestamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();

    return `AS${timestamp}${suffix}`;
  }

  private readonly detailInclude = {
    order: {
      select: {
        id: true,
        orderNo: true,
        status: true,
        payableAmount: true,
      },
    },
    logs: {
      orderBy: { createdAt: 'desc' as const },
    },
    refund: {
      select: {
        id: true,
        refundNo: true,
        amount: true,
        status: true,
        failureSource: true,
        failureReason: true,
      },
    },
  };

  private readonly adminDetailInclude = {
    ...this.detailInclude,
    user: {
      select: {
        id: true,
        openId: true,
        nickname: true,
        phone: true,
      },
    },
  };
}
