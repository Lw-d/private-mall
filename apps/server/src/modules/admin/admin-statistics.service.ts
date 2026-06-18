import { Injectable } from '@nestjs/common';
import {
  CouponStatus,
  OrderStatus,
  PointLedgerType,
  ProductStatus,
} from '../../generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminStatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const now = new Date();

    const paidStatuses = [
      OrderStatus.PENDING_DELIVERY,
      OrderStatus.SHIPPED,
      OrderStatus.COMPLETED,
      OrderStatus.REFUNDING,
      OrderStatus.REFUNDED,
    ];

    const [
      totalOrders,
      todayOrders,
      pendingDeliveryOrders,
      paidAmount,
      totalUsers,
      productsOnSale,
      totalProducts,
      activeCoupons,
      couponAggregate,
      orderDiscountAggregate,
      pointsIssuedAggregate,
      pointsBalanceAggregate,
      pointLedgerCount,
      recentOrders,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({
        where: {
          createdAt: {
            gte: todayStart,
          },
        },
      }),
      this.prisma.order.count({
        where: {
          status: OrderStatus.PENDING_DELIVERY,
        },
      }),
      this.prisma.order.aggregate({
        where: {
          status: {
            in: paidStatuses,
          },
          paidAt: {
            not: null,
          },
        },
        _sum: {
          payableAmount: true,
        },
      }),
      this.prisma.user.count(),
      this.prisma.product.count({
        where: {
          status: ProductStatus.ON_SALE,
        },
      }),
      this.prisma.product.count(),
      this.prisma.coupon.count({
        where: {
          status: CouponStatus.ACTIVE,
          validFrom: {
            lte: now,
          },
          validTo: {
            gte: now,
          },
        },
      }),
      this.prisma.coupon.aggregate({
        _sum: {
          claimedCount: true,
          usedCount: true,
        },
      }),
      this.prisma.order.aggregate({
        where: {
          status: {
            in: paidStatuses,
          },
          paidAt: {
            not: null,
          },
        },
        _sum: {
          couponDiscountAmount: true,
        },
      }),
      this.prisma.pointLedger.aggregate({
        where: {
          type: PointLedgerType.ORDER_EARN,
        },
        _sum: {
          points: true,
        },
      }),
      this.prisma.user.aggregate({
        _sum: {
          pointsBalance: true,
        },
      }),
      this.prisma.pointLedger.count(),
      this.prisma.order.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: true,
          items: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      }),
    ]);

    return {
      metrics: {
        gmv: paidAmount._sum.payableAmount?.toFixed(2) ?? '0.00',
        totalOrders,
        todayOrders,
        pendingDeliveryOrders,
        totalUsers,
        productsOnSale,
        totalProducts,
        activeCoupons,
        claimedCoupons: couponAggregate._sum.claimedCount ?? 0,
        usedCoupons: couponAggregate._sum.usedCount ?? 0,
        couponDiscountAmount:
          orderDiscountAggregate._sum.couponDiscountAmount?.toFixed(2) ?? '0.00',
        pointsIssued: pointsIssuedAggregate._sum.points ?? 0,
        pointsBalanceTotal: pointsBalanceAggregate._sum.pointsBalance ?? 0,
        pointLedgerCount,
      },
      recentOrders,
    };
  }
}
