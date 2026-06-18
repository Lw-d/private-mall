import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { CouponStatus, Prisma, UserCouponStatus } from '../../generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { QueryAvailableCouponsDto } from './dto/query-available-coupons.dto';
import { QueryCouponsDto } from './dto/query-coupons.dto';
import { UpdateCouponStatusDto } from './dto/update-coupon-status.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Injectable()
export class CouponService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCouponDto) {
    this.assertCouponWindow(dto.validFrom, dto.validTo);
    this.assertDiscount(dto.thresholdAmount, dto.discountAmount);

    return this.prisma.coupon.create({
      data: {
        name: dto.name,
        code: dto.code?.trim() || this.generateCouponCode(),
        thresholdAmount: new Decimal(dto.thresholdAmount),
        discountAmount: new Decimal(dto.discountAmount),
        totalStock: dto.totalStock,
        perUserLimit: dto.perUserLimit ?? 1,
        validFrom: new Date(dto.validFrom),
        validTo: new Date(dto.validTo),
        status: CouponStatus.DRAFT,
        description: dto.description,
      },
    });
  }

  findMany(query: QueryCouponsDto) {
    const keyword = query.keyword?.trim();
    const where: Prisma.CouponWhereInput = {
      status: query.status,
      OR: keyword ? [{ name: { contains: keyword } }, { code: { contains: keyword } }] : undefined,
    };

    return this.prisma.coupon.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async findById(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return coupon;
  }

  async update(id: string, dto: UpdateCouponDto) {
    const coupon = await this.findById(id);

    if (coupon.claimedCount > 0) {
      this.assertNoClaimedCouponFields(dto);
    }

    const validFrom = dto.validFrom ?? coupon.validFrom.toISOString();
    const validTo = dto.validTo ?? coupon.validTo.toISOString();
    const thresholdAmount = dto.thresholdAmount ?? Number(coupon.thresholdAmount);
    const discountAmount = dto.discountAmount ?? Number(coupon.discountAmount);

    this.assertCouponWindow(validFrom, validTo);
    this.assertDiscount(thresholdAmount, discountAmount);

    return this.prisma.coupon.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code?.trim(),
        thresholdAmount:
          dto.thresholdAmount === undefined ? undefined : new Decimal(dto.thresholdAmount),
        discountAmount:
          dto.discountAmount === undefined ? undefined : new Decimal(dto.discountAmount),
        totalStock: dto.totalStock,
        perUserLimit: dto.perUserLimit,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validTo: dto.validTo ? new Date(dto.validTo) : undefined,
        description: dto.description,
      },
    });
  }

  async updateStatus(id: string, dto: UpdateCouponStatusDto) {
    const coupon = await this.findById(id);

    if (dto.status === CouponStatus.ACTIVE) {
      const now = new Date();

      if (coupon.validTo < now) {
        throw new BadRequestException('Expired coupon cannot be activated');
      }

      if (coupon.totalStock <= coupon.claimedCount) {
        throw new BadRequestException('Coupon stock is exhausted');
      }
    }

    return this.prisma.coupon.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async findClaimable(userId: string) {
    const now = new Date();
    const coupons = await this.prisma.coupon.findMany({
      where: {
        status: CouponStatus.ACTIVE,
        validFrom: { lte: now },
        validTo: { gte: now },
        totalStock: { gt: this.prisma.coupon.fields.claimedCount },
      },
      include: {
        userCoupons: {
          where: { userId },
          select: { id: true },
        },
      },
      orderBy: [{ validTo: 'asc' }, { createdAt: 'desc' }],
    });

    return coupons
      .filter((coupon) => coupon.userCoupons.length < coupon.perUserLimit)
      .map(({ userCoupons, ...coupon }) => coupon);
  }

  async claim(userId: string, couponId: string) {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const coupon = await tx.coupon.findUnique({
        where: { id: couponId },
        include: {
          userCoupons: {
            where: { userId },
            select: { id: true },
          },
        },
      });

      if (!coupon) {
        throw new NotFoundException('Coupon not found');
      }

      if (coupon.status !== CouponStatus.ACTIVE || coupon.validFrom > now || coupon.validTo < now) {
        throw new BadRequestException('Coupon is unavailable');
      }

      if (coupon.claimedCount >= coupon.totalStock) {
        throw new BadRequestException('Coupon stock is exhausted');
      }

      if (coupon.userCoupons.length >= coupon.perUserLimit) {
        throw new BadRequestException('Coupon claim limit reached');
      }

      const updated = await tx.coupon.updateMany({
        where: {
          id: coupon.id,
          claimedCount: { lt: coupon.totalStock },
        },
        data: {
          claimedCount: {
            increment: 1,
          },
        },
      });

      if (updated.count !== 1) {
        throw new BadRequestException('Coupon stock is exhausted');
      }

      return tx.userCoupon.create({
        data: {
          userId,
          couponId: coupon.id,
          status: UserCouponStatus.AVAILABLE,
        },
        include: { coupon: true },
      });
    });
  }

  findMine(userId: string) {
    return this.prisma.userCoupon.findMany({
      where: { userId },
      include: { coupon: true },
      orderBy: [{ claimedAt: 'desc' }],
    });
  }

  async findAvailableForOrder(userId: string, query: QueryAvailableCouponsDto) {
    const now = new Date();
    const amount = new Decimal(query.amount);

    return this.prisma.userCoupon.findMany({
      where: {
        userId,
        status: UserCouponStatus.AVAILABLE,
        coupon: {
          status: CouponStatus.ACTIVE,
          validFrom: { lte: now },
          validTo: { gte: now },
          thresholdAmount: { lte: amount },
        },
      },
      include: { coupon: true },
      orderBy: [{ coupon: { discountAmount: 'desc' } }, { claimedAt: 'asc' }],
    });
  }

  private assertCouponWindow(validFrom: string, validTo: string) {
    const from = new Date(validFrom);
    const to = new Date(validTo);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
      throw new BadRequestException('Coupon validity window is invalid');
    }
  }

  private assertDiscount(thresholdAmount: number, discountAmount: number) {
    if (discountAmount <= 0) {
      throw new BadRequestException('Coupon discount must be greater than 0');
    }

    if (thresholdAmount < 0) {
      throw new BadRequestException('Coupon threshold cannot be negative');
    }
  }

  private assertNoClaimedCouponFields(dto: UpdateCouponDto) {
    const lockedFields = [
      dto.code,
      dto.thresholdAmount,
      dto.discountAmount,
      dto.totalStock,
      dto.perUserLimit,
      dto.validFrom,
      dto.validTo,
    ];

    if (lockedFields.some((value) => value !== undefined)) {
      throw new BadRequestException('Claimed coupon can only update name and description');
    }
  }

  private generateCouponCode() {
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `CP${Date.now()}${random}`;
  }
}
