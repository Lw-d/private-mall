import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../../../generated/prisma/client';
import { RefundResponseDto } from '../../payment/dto/payment-response.dto';

export class OrderItemResponseDto {
  @ApiProperty({ example: 'cmp_order_item_id' })
  id!: string;

  @ApiProperty({ example: 'cmp_order_id' })
  orderId!: string;

  @ApiProperty({ example: 'cmp_product_id' })
  productId!: string;

  @ApiProperty({ example: 'cmp_sku_id' })
  skuId!: string;

  @ApiProperty({ example: '修护精华面霜升级版' })
  productName!: string;

  @ApiProperty({ example: '50ml' })
  skuName!: string;

  @ApiPropertyOptional({ type: Object, nullable: true, example: { 规格: '50ml' } })
  skuSpecs?: Record<string, string> | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://example.com/cream-main-new.png',
  })
  productImageUrl?: string | null;

  @ApiProperty({ example: '209.00' })
  unitPrice!: string;

  @ApiProperty({ example: 1 })
  quantity!: number;

  @ApiProperty({ example: '209.00' })
  totalAmount!: string;

  @ApiProperty({ example: '2026-05-25T01:53:13.676Z' })
  createdAt!: Date;
}

export class OrderLogisticsTraceResponseDto {
  @ApiProperty({ example: 'cmp_logistics_trace_id' })
  id!: string;

  @ApiProperty({ example: 'cmp_order_id' })
  orderId!: string;

  @ApiProperty({ example: 'SHIPPED' })
  status!: string;

  @ApiProperty({ example: '商家已发货，包裹等待揽收' })
  content!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '顺丰速运' })
  logisticsCompany?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'SF1234567890' })
  trackingNo?: string | null;

  @ApiProperty({ example: '2026-05-25T01:59:57.323Z' })
  occurredAt!: Date;

  @ApiProperty({ example: '2026-05-25T01:59:57.323Z' })
  createdAt!: Date;
}

export class OrderResponseDto {
  @ApiProperty({ example: 'cmp_order_id' })
  id!: string;

  @ApiProperty({ example: 'MO20260525095313MK4V22' })
  orderNo!: string;

  @ApiProperty({ example: 'cmp_user_id' })
  userId!: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING_DELIVERY })
  status!: OrderStatus;

  @ApiProperty({ example: '209.00' })
  totalAmount!: string;

  @ApiProperty({ example: '209.00' })
  payableAmount!: string;

  @ApiProperty({ example: '20.00' })
  discountAmount!: string;

  @ApiProperty({ example: 500 })
  pointsUsed!: number;

  @ApiProperty({ example: '5.00' })
  pointsDiscountAmount!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'cmp_user_coupon_id' })
  userCouponId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'cmp_coupon_id' })
  couponId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'NEW_USER_20' })
  couponCode?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '新人满 99 减 20' })
  couponName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '20.00' })
  couponDiscountAmount?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'cmp_address_id' })
  shippingAddressId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '李文' })
  receiverName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '13800000000' })
  receiverPhone?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '广东省' })
  receiverProvince?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '深圳市' })
  receiverCity?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '南山区' })
  receiverDistrict?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '科技园 1 号楼 1001' })
  receiverDetailAddress?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '518000' })
  receiverPostalCode?: string | null;

  @ApiProperty({ example: 1 })
  totalQuantity!: number;

  @ApiPropertyOptional({ type: String, nullable: true, example: '请尽快发货' })
  remark?: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-05-25T01:53:28.731Z',
  })
  paidAt?: Date | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-05-25T01:59:57.323Z',
  })
  shippedAt?: Date | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-05-25T02:00:04.237Z',
  })
  completedAt?: Date | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-05-25T01:52:57.319Z',
  })
  cancelledAt?: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '后台取消' })
  cancelReason?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '顺丰速运' })
  logisticsCompany?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'SF1234567890' })
  trackingNo?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '后台发货' })
  deliveryRemark?: string | null;

  @ApiProperty({ example: '2026-05-25T01:53:13.676Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-25T02:00:04.238Z' })
  updatedAt!: Date;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items!: OrderItemResponseDto[];

  @ApiPropertyOptional({ type: [RefundResponseDto] })
  refunds?: RefundResponseDto[];

  @ApiPropertyOptional({ type: [OrderLogisticsTraceResponseDto] })
  logisticsTraces?: OrderLogisticsTraceResponseDto[];
}
