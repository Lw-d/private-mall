import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import {
  CouponStatus,
  OrderStatus,
  PointLedgerType,
  Prisma,
  ProductStatus,
  UserCouponStatus,
} from '../../generated/prisma/client';

import { QueryAdminOrdersDto } from '../admin/dto/query-admin-orders.dto';
import { CartService } from '../cart/cart.service';
import { LogisticsService } from '../logistics/logistics.service';
import { PointService } from '../point/point.service';
import { PrismaService } from '../prisma/prisma.service';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { AddOrderLogisticsTraceDto } from './dto/add-order-logistics-trace.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { ShipOrderDto } from './dto/ship-order.dto';

type ExistingOrder = Prisma.OrderGetPayload<{ include: { items: true } }>;

@Injectable()
export class OrderService {
  private readonly logisticsRefreshCooldownUntil = new Map<string, number>();

  constructor(
    private readonly cartService: CartService,
    private readonly configService: ConfigService,
    private readonly logisticsService: LogisticsService,
    private readonly pointService: PointService,
    private readonly prisma: PrismaService,
  ) {}

  async createFromCart(userId: string, dto: CreateOrderDto) {
    const checkedItems = await this.cartService.getCheckedItems(userId);

    if (checkedItems.length === 0) {
      throw new BadRequestException('No checked cart items');
    }

    const skuIds = checkedItems.map((item) => item.skuId);
    const skuQuantityMap = new Map(checkedItems.map((item) => [item.skuId, item.quantity]));
    const order = await this.prisma.$transaction(async (tx) => {
      const skus = await tx.productSku.findMany({
        where: { id: { in: skuIds } },
        include: {
          product: {
            include: {
              images: {
                orderBy: [{ isMain: 'desc' }, { sort: 'asc' }, { createdAt: 'asc' }],
              },
            },
          },
        },
      });

      if (skus.length !== skuIds.length) {
        throw new BadRequestException('Some SKUs are unavailable');
      }

      const orderItems = skus.map((sku) => {
        const quantity = skuQuantityMap.get(sku.id);

        if (!quantity) {
          throw new BadRequestException('Invalid cart item');
        }

        this.assertSkuPurchasable(sku, quantity);
        const totalAmount = sku.price.mul(quantity);

        return {
          productId: sku.productId,
          skuId: sku.id,
          productName: sku.product.name,
          skuName: sku.name,
          skuSpecs: sku.specs ?? Prisma.JsonNull,
          productImageUrl: sku.product.images[0]?.url,
          unitPrice: sku.price,
          quantity,
          totalAmount,
        };
      });

      const totalAmount = orderItems.reduce(
        (sum, item) => sum.add(item.totalAmount),
        new Decimal(0),
      );
      const couponDiscount = dto.userCouponId
        ? await this.resolveCouponDiscount(tx, userId, dto.userCouponId, totalAmount)
        : undefined;
      const couponDiscountAmount = couponDiscount?.discountAmount ?? new Decimal(0);
      const shippingAddress = await this.resolveShippingAddress(tx, userId, dto.shippingAddressId);
      const amountAfterCoupon = totalAmount.sub(couponDiscountAmount);
      const pointsRedeem = dto.usePoints
        ? await this.resolvePointsRedeem(tx, userId, amountAfterCoupon)
        : { pointsUsed: 0, discountAmount: new Decimal(0) };
      const discountAmount = couponDiscountAmount.add(pointsRedeem.discountAmount);
      const payableAmount = totalAmount.sub(discountAmount);
      const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);

      for (const item of orderItems) {
        const updated = await tx.productSku.updateMany({
          where: {
            id: item.skuId,
            stock: {
              gte: item.quantity,
            },
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        if (updated.count !== 1) {
          throw new BadRequestException('Insufficient SKU stock');
        }
      }

      const createdOrder = await tx.order.create({
        data: {
          orderNo: this.generateOrderNo(),
          userId,
          totalAmount,
          payableAmount,
          discountAmount,
          pointsUsed: pointsRedeem.pointsUsed,
          pointsDiscountAmount: pointsRedeem.discountAmount,
          userCouponId: couponDiscount?.userCoupon.id,
          couponId: couponDiscount?.coupon.id,
          couponCode: couponDiscount?.coupon.code,
          couponName: couponDiscount?.coupon.name,
          couponDiscountAmount: couponDiscount?.discountAmount,
          shippingAddressId: shippingAddress.id,
          receiverName: shippingAddress.receiverName,
          receiverPhone: shippingAddress.receiverPhone,
          receiverProvince: shippingAddress.province,
          receiverCity: shippingAddress.city,
          receiverDistrict: shippingAddress.district,
          receiverDetailAddress: shippingAddress.detailAddress,
          receiverPostalCode: shippingAddress.postalCode,
          totalQuantity,
          remark: dto.remark,
          items: {
            create: orderItems,
          },
        },
        include: this.detailInclude,
      });

      if (couponDiscount) {
        const locked = await tx.userCoupon.updateMany({
          where: {
            id: couponDiscount.userCoupon.id,
            userId,
            status: UserCouponStatus.AVAILABLE,
            orderId: null,
          },
          data: {
            status: UserCouponStatus.LOCKED,
            lockedAt: new Date(),
            orderId: createdOrder.id,
          },
        });

        if (locked.count !== 1) {
          throw new BadRequestException('Coupon is unavailable');
        }
      }

      if (pointsRedeem.pointsUsed > 0) {
        const user = await tx.user.update({
          where: { id: userId },
          data: {
            pointsBalance: {
              decrement: pointsRedeem.pointsUsed,
            },
          },
        });

        await tx.pointLedger.create({
          data: {
            userId,
            orderId: createdOrder.id,
            type: PointLedgerType.ORDER_REDEEM,
            points: -pointsRedeem.pointsUsed,
            balanceAfter: user.pointsBalance,
            description: `订单 ${createdOrder.orderNo} 积分抵扣`,
          },
        });
      }

      return createdOrder;
    });

    await this.cartService.removeCheckedItems(userId, skuIds);
    return order;
  }

  async findMany(userId: string, query: QueryOrdersDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where: Prisma.OrderWhereInput = {
      userId,
      status: query.status,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
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

  async findManyForAdmin(query: QueryAdminOrdersDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const keyword = query.keyword?.trim();
    const where: Prisma.OrderWhereInput = {
      status: query.status,
      logisticsTraces: query.logisticsTraceStatus
        ? {
            some: {
              status: query.logisticsTraceStatus,
            },
          }
        : undefined,
      OR: keyword
        ? [
            { orderNo: { contains: keyword } },
            { user: { is: { openId: { contains: keyword } } } },
            { user: { is: { nickname: { contains: keyword } } } },
            { user: { is: { phone: { contains: keyword } } } },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
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

  async findById(userId: string, id: string) {
    const order = await this.findExisting(id);
    this.assertOrderOwner(order.userId, userId);
    return order;
  }

  async cancel(userId: string, id: string, dto: CancelOrderDto) {
    const order = await this.findExisting(id);
    this.assertOrderOwner(order.userId, userId);

    return this.cancelExisting(id, order, dto.reason ?? 'User cancelled');
  }

  async cancelForAdmin(id: string, dto: CancelOrderDto) {
    const order = await this.findExisting(id);
    return this.cancelExisting(id, order, dto.reason ?? 'Admin cancelled');
  }

  private async cancelExisting(id: string, order: ExistingOrder, reason: string) {
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Only pending payment orders can be cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.productSku.update({
          where: { id: item.skuId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      }

      if (order.userCouponId) {
        await tx.userCoupon.updateMany({
          where: {
            id: order.userCouponId,
            status: UserCouponStatus.LOCKED,
            orderId: order.id,
          },
          data: {
            status: UserCouponStatus.AVAILABLE,
            lockedAt: null,
            orderId: null,
          },
        });
      }

      await this.restoreRedeemedPoints(tx, order, '订单取消返还积分');

      return tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: reason,
        },
        include: this.detailInclude,
      });
    });
  }

  async shipForAdmin(id: string, dto: ShipOrderDto) {
    const order = await this.findExisting(id);

    if (order.status !== OrderStatus.PENDING_DELIVERY) {
      throw new BadRequestException('Only pending delivery orders can be shipped');
    }

    return this.prisma.$transaction(async (tx) => {
      const shippedAt = new Date();
      const logisticsCompany = dto.logisticsCompany?.trim() || undefined;
      const trackingNo = dto.trackingNo?.trim() || undefined;
      const deliveryRemark = dto.remark?.trim() || undefined;

      await tx.orderLogisticsTrace.create({
        data: {
          orderId: id,
          status: OrderStatus.SHIPPED,
          content: trackingNo ? '商家已发货，包裹等待揽收' : '商家已发货',
          logisticsCompany,
          trackingNo,
          occurredAt: shippedAt,
        },
      });

      return tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.SHIPPED,
          shippedAt,
          logisticsCompany,
          trackingNo,
          deliveryRemark,
        },
        include: this.adminDetailInclude,
      });
    });
  }

  async addLogisticsTraceForAdmin(id: string, dto: AddOrderLogisticsTraceDto) {
    const order = await this.findExisting(id);

    if (!order.shippedAt) {
      throw new BadRequestException('Only shipped orders can have logistics traces');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.orderLogisticsTrace.create({
        data: {
          orderId: id,
          status: dto.status.trim(),
          content: dto.content.trim(),
          logisticsCompany: dto.logisticsCompany?.trim() || order.logisticsCompany || undefined,
          trackingNo: dto.trackingNo?.trim() || order.trackingNo || undefined,
        },
      });

      return tx.order.findUniqueOrThrow({
        where: { id },
        include: this.adminDetailInclude,
      });
    });
  }

  async refreshLogisticsTracesForAdmin(id: string) {
    const order = await this.findExisting(id);

    if (!order.shippedAt) {
      throw new BadRequestException('Only shipped orders can refresh logistics traces');
    }

    if (!order.trackingNo) {
      throw new BadRequestException('Tracking number is required to refresh logistics traces');
    }

    this.reserveLogisticsRefreshSlot(id);

    const result = await this.logisticsService.query({
      logisticsCompany: order.logisticsCompany,
      trackingNo: order.trackingNo,
      receiverPhoneTail: this.getPhoneTail(order.receiverPhone),
      orderNo: order.orderNo,
      shippedAt: order.shippedAt,
    });

    return this.prisma.$transaction(async (tx) => {
      const existingTraces = await tx.orderLogisticsTrace.findMany({
        where: { orderId: id },
        select: {
          status: true,
          content: true,
          trackingNo: true,
          occurredAt: true,
        },
      });
      const existingKeys = new Set(
        existingTraces.map((trace) =>
          this.buildLogisticsTraceKey({
            status: trace.status,
            content: trace.content,
            trackingNo: trace.trackingNo,
            occurredAt: trace.occurredAt,
          }),
        ),
      );
      const tracesToCreate = result.traces.filter((trace) => {
        const key = this.buildLogisticsTraceKey({
          status: trace.status,
          content: trace.content,
          trackingNo: order.trackingNo,
          occurredAt: trace.occurredAt,
        });

        if (existingKeys.has(key)) {
          return false;
        }

        existingKeys.add(key);
        return true;
      });

      if (tracesToCreate.length > 0) {
        await tx.orderLogisticsTrace.createMany({
          data: tracesToCreate.map((trace) => ({
            orderId: id,
            status: trace.status,
            content: trace.content,
            logisticsCompany: order.logisticsCompany,
            trackingNo: order.trackingNo,
            occurredAt: trace.occurredAt,
          })),
        });
      }

      return tx.order.findUniqueOrThrow({
        where: { id },
        include: this.adminDetailInclude,
      });
    });
  }

  async complete(userId: string, id: string) {
    const order = await this.findExisting(id);
    this.assertOrderOwner(order.userId, userId);

    if (order.status !== OrderStatus.SHIPPED) {
      throw new BadRequestException('Only shipped orders can be completed');
    }

    return this.prisma.$transaction(async (tx) => {
      const completedOrder = await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: this.detailInclude,
      });
      const points = this.calculateOrderPoints(order.payableAmount);

      if (points > 0) {
        const user = await tx.user.update({
          where: { id: userId },
          data: {
            pointsBalance: {
              increment: points,
            },
          },
        });

        await tx.pointLedger.create({
          data: {
            userId,
            orderId: order.id,
            type: PointLedgerType.ORDER_EARN,
            points,
            balanceAfter: user.pointsBalance,
            description: `订单 ${order.orderNo} 完成发放积分`,
          },
        });
      }

      return completedOrder;
    });
  }

  private async findExisting(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.detailInclude,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  private assertOrderOwner(orderUserId: string, currentUserId: string) {
    if (orderUserId !== currentUserId) {
      throw new ForbiddenException('Cannot access this order');
    }
  }

  private assertSkuPurchasable(
    sku: Prisma.ProductSkuGetPayload<{
      include: {
        product: true;
      };
    }>,
    quantity: number,
  ) {
    if (!sku.isActive) {
      throw new BadRequestException('SKU is inactive');
    }

    if (sku.product.status !== ProductStatus.ON_SALE) {
      throw new BadRequestException('Product is not on sale');
    }

    if (sku.stock < quantity) {
      throw new BadRequestException('Insufficient SKU stock');
    }
  }

  private async resolveCouponDiscount(
    tx: Prisma.TransactionClient,
    userId: string,
    userCouponId: string,
    totalAmount: Decimal,
  ) {
    const userCoupon = await tx.userCoupon.findFirst({
      where: {
        id: userCouponId,
        userId,
        status: UserCouponStatus.AVAILABLE,
      },
      include: {
        coupon: true,
      },
    });

    if (!userCoupon) {
      throw new BadRequestException('Coupon is unavailable');
    }

    const now = new Date();
    const { coupon } = userCoupon;

    if (coupon.status !== CouponStatus.ACTIVE) {
      throw new BadRequestException('Coupon is not active');
    }

    if (coupon.validFrom > now || coupon.validTo < now) {
      throw new BadRequestException('Coupon is expired');
    }

    if (totalAmount.lt(coupon.thresholdAmount)) {
      throw new BadRequestException('Order amount does not meet coupon threshold');
    }

    const discountAmount = coupon.discountAmount.gt(totalAmount)
      ? totalAmount
      : coupon.discountAmount;

    return {
      userCoupon,
      coupon,
      discountAmount,
    };
  }

  private async resolveShippingAddress(
    tx: Prisma.TransactionClient,
    userId: string,
    shippingAddressId?: string,
  ) {
    const address = shippingAddressId
      ? await tx.userAddress.findFirst({
          where: { id: shippingAddressId, userId },
        })
      : await tx.userAddress.findFirst({
          where: { userId },
          orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
        });

    if (!address) {
      throw new BadRequestException('Shipping address is required');
    }

    return address;
  }

  private async resolvePointsRedeem(
    tx: Prisma.TransactionClient,
    userId: string,
    amountAfterCoupon: Decimal,
  ) {
    if (amountAfterCoupon.lte(0)) {
      return {
        pointsUsed: 0,
        discountAmount: new Decimal(0),
      };
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { pointsBalance: true },
    });
    const { enabled, pointsPerYuan } = await this.pointService.getRedeemRules();

    if (!enabled) {
      return {
        pointsUsed: 0,
        discountAmount: new Decimal(0),
      };
    }

    const availablePoints = Math.max(user?.pointsBalance ?? 0, 0);
    const maxPointsByAmount = Math.floor(amountAfterCoupon.mul(pointsPerYuan).toNumber());
    const pointsUsed = Math.min(availablePoints, maxPointsByAmount);

    return {
      pointsUsed,
      discountAmount: new Decimal(pointsUsed).div(pointsPerYuan),
    };
  }

  private async restoreRedeemedPoints(
    tx: Prisma.TransactionClient,
    order: Pick<ExistingOrder, 'id' | 'orderNo' | 'pointsUsed' | 'userId'>,
    reason: string,
  ) {
    if (order.pointsUsed <= 0) {
      return;
    }

    const existingRefundLedger = await tx.pointLedger.findUnique({
      where: {
        orderId_type: {
          orderId: order.id,
          type: PointLedgerType.ORDER_REDEEM_REFUND,
        },
      },
    });

    if (existingRefundLedger) {
      return;
    }

    const user = await tx.user.update({
      where: { id: order.userId },
      data: {
        pointsBalance: {
          increment: order.pointsUsed,
        },
      },
    });

    await tx.pointLedger.create({
      data: {
        userId: order.userId,
        orderId: order.id,
        type: PointLedgerType.ORDER_REDEEM_REFUND,
        points: order.pointsUsed,
        balanceAfter: user.pointsBalance,
        description: `${reason}：${order.orderNo}`,
      },
    });
  }

  private generateOrderNo() {
    const date = new Date();
    const timestamp = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
      String(date.getHours()).padStart(2, '0'),
      String(date.getMinutes()).padStart(2, '0'),
      String(date.getSeconds()).padStart(2, '0'),
    ].join('');
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `MO${timestamp}${random}`;
  }

  private calculateOrderPoints(amount: Decimal) {
    return Math.floor(amount.toNumber());
  }

  private getPhoneTail(phone?: string | null) {
    return phone ? phone.slice(-4) : undefined;
  }

  private buildLogisticsTraceKey(trace: {
    status: string;
    content: string;
    trackingNo?: string | null;
    occurredAt: Date;
  }) {
    return [
      trace.status,
      trace.content,
      trace.trackingNo ?? '',
      trace.occurredAt.toISOString(),
    ].join('|');
  }

  private reserveLogisticsRefreshSlot(orderId: string) {
    const cooldownSeconds = this.resolveLogisticsRefreshCooldownSeconds();

    if (cooldownSeconds <= 0) {
      return;
    }

    const now = Date.now();
    const cooldownUntil = this.logisticsRefreshCooldownUntil.get(orderId);

    if (cooldownUntil && cooldownUntil > now) {
      const retryAfterSeconds = Math.ceil((cooldownUntil - now) / 1000);

      throw new HttpException(
        {
          error: {
            code: 'LOGISTICS_REFRESH_COOLDOWN',
            retryAfterSeconds,
          },
          message: `Logistics refresh is cooling down. Please retry after ${retryAfterSeconds} seconds.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.logisticsRefreshCooldownUntil.set(orderId, now + cooldownSeconds * 1000);
  }

  private resolveLogisticsRefreshCooldownSeconds() {
    const configuredCooldown = this.configService.get<number>('LOGISTICS_REFRESH_COOLDOWN_SECONDS');

    if (configuredCooldown !== undefined) {
      return configuredCooldown;
    }

    const provider = this.configService.get<string>('LOGISTICS_PROVIDER') ?? 'mock';

    return provider === 'mock' ? 0 : 60;
  }

  private readonly detailInclude = {
    items: {
      orderBy: { createdAt: 'asc' },
    },
    refunds: {
      orderBy: { createdAt: 'desc' },
    },
    logisticsTraces: {
      orderBy: { occurredAt: 'desc' },
    },
  } satisfies Prisma.OrderInclude;

  private readonly adminDetailInclude = {
    user: true,
    items: {
      orderBy: { createdAt: 'asc' },
    },
    refunds: {
      orderBy: { createdAt: 'desc' },
    },
    logisticsTraces: {
      orderBy: { occurredAt: 'desc' },
    },
  } satisfies Prisma.OrderInclude;
}
