import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponStatus, CouponType } from '../../../generated/prisma/client';

export class CouponResponseDto {
  @ApiProperty({ example: 'cmp_coupon_id' })
  id!: string;

  @ApiProperty({ example: '新人满 99 减 20' })
  name!: string;

  @ApiProperty({ example: 'NEW_USER_20' })
  code!: string;

  @ApiProperty({ enum: CouponType, example: CouponType.FIXED_AMOUNT })
  type!: CouponType;

  @ApiProperty({ example: '99.00' })
  thresholdAmount!: string;

  @ApiProperty({ example: '20.00' })
  discountAmount!: string;

  @ApiProperty({ example: 1000 })
  totalStock!: number;

  @ApiProperty({ example: 20 })
  claimedCount!: number;

  @ApiProperty({ example: 8 })
  usedCount!: number;

  @ApiProperty({ example: 1 })
  perUserLimit!: number;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  validFrom!: Date;

  @ApiProperty({ example: '2026-12-31T23:59:59.999Z' })
  validTo!: Date;

  @ApiProperty({ enum: CouponStatus, example: CouponStatus.ACTIVE })
  status!: CouponStatus;

  @ApiPropertyOptional({ type: String, nullable: true, example: '新用户首单可用' })
  description?: string | null;

  @ApiProperty({ example: '2026-06-06T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-06T00:00:00.000Z' })
  updatedAt!: Date;
}

export class UserCouponResponseDto {
  @ApiProperty({ example: 'cmp_user_coupon_id' })
  id!: string;

  @ApiProperty({ example: 'cmp_user_id' })
  userId!: string;

  @ApiProperty({ example: 'cmp_coupon_id' })
  couponId!: string;

  @ApiProperty({ example: 'AVAILABLE' })
  status!: string;

  @ApiProperty({ example: '2026-06-06T00:00:00.000Z' })
  claimedAt!: Date;

  @ApiPropertyOptional({ type: String, nullable: true })
  usedAt?: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  lockedAt?: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'cmp_order_id' })
  orderId?: string | null;

  @ApiProperty({ type: CouponResponseDto })
  coupon!: CouponResponseDto;
}
