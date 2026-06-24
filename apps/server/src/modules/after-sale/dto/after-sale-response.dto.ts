import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AfterSaleActorType,
  AfterSaleStatus,
  AfterSaleType,
  OrderStatus,
  RefundFailureSource,
  RefundStatus,
} from '../../../generated/prisma/client';

export class AfterSaleOrderSnapshotDto {
  @ApiProperty({ type: String, example: 'cmp_order_id' })
  id!: string;

  @ApiProperty({ type: String, example: 'MO202606180001' })
  orderNo!: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.SHIPPED })
  status!: OrderStatus;

  @ApiProperty({ type: String, example: '209.00' })
  payableAmount!: string;
}

export class AfterSaleUserSnapshotDto {
  @ApiProperty({ type: String, example: 'cmp_user_id' })
  id!: string;

  @ApiProperty({ type: String, example: 'miniapp-openid-001' })
  openId!: string;

  @ApiPropertyOptional({ type: String, example: '微信用户' })
  nickname?: string | null;

  @ApiPropertyOptional({ type: String, example: '13800000000' })
  phone?: string | null;
}

export class AfterSaleLogResponseDto {
  @ApiProperty({ type: String, example: 'cmp_after_sale_log_id' })
  id!: string;

  @ApiProperty({ type: String, example: 'cmp_after_sale_id' })
  afterSaleId!: string;

  @ApiProperty({ enum: AfterSaleActorType, example: AfterSaleActorType.USER })
  actorType!: AfterSaleActorType;

  @ApiPropertyOptional({ type: String, example: 'cmp_user_id' })
  actorId?: string | null;

  @ApiProperty({ type: String, example: 'CREATE' })
  action!: string;

  @ApiPropertyOptional({ type: String, example: '用户提交售后申请' })
  content?: string | null;

  @ApiProperty({ type: String, example: '2026-06-18T09:00:00.000Z' })
  createdAt!: string;
}

export class AfterSaleRefundSnapshotDto {
  @ApiProperty({ type: String, example: 'cmp_refund_id' })
  id!: string;

  @ApiProperty({ type: String, example: 'RF202606180001' })
  refundNo!: string;

  @ApiProperty({ type: String, example: '99.00' })
  amount!: string;

  @ApiProperty({ enum: RefundStatus, example: RefundStatus.PENDING })
  status!: RefundStatus;

  @ApiPropertyOptional({ enum: RefundFailureSource, example: RefundFailureSource.WECHAT_REQUEST })
  failureSource?: RefundFailureSource | null;

  @ApiPropertyOptional({ type: String, example: '微信退款请求失败' })
  failureReason?: string | null;
}

export class AfterSaleResponseDto {
  @ApiProperty({ type: String, example: 'cmp_after_sale_id' })
  id!: string;

  @ApiProperty({ type: String, example: 'AS202606180001ABC' })
  afterSaleNo!: string;

  @ApiProperty({ type: String, example: 'cmp_order_id' })
  orderId!: string;

  @ApiProperty({ type: String, example: 'cmp_user_id' })
  userId!: string;

  @ApiProperty({ enum: AfterSaleType, example: AfterSaleType.REFUND_ONLY })
  type!: AfterSaleType;

  @ApiProperty({ enum: AfterSaleStatus, example: AfterSaleStatus.REQUESTED })
  status!: AfterSaleStatus;

  @ApiProperty({ type: String, example: '商品破损' })
  reason!: string;

  @ApiPropertyOptional({ type: String, example: '收到时外包装破损，需要申请售后。' })
  description?: string | null;

  @ApiPropertyOptional({ type: [String], example: ['https://example.com/evidence-a.png'] })
  evidenceImageUrls?: string[] | null;

  @ApiProperty({ type: String, example: '99.00' })
  requestedAmount!: string;

  @ApiPropertyOptional({ type: String, example: '99.00' })
  approvedAmount?: string | null;

  @ApiPropertyOptional({ type: String, example: '不符合退款条件' })
  rejectReason?: string | null;

  @ApiPropertyOptional({ type: String, example: '商家备注' })
  merchantRemark?: string | null;

  @ApiPropertyOptional({ type: String, example: '顺丰速运' })
  returnLogisticsCompany?: string | null;

  @ApiPropertyOptional({ type: String, example: 'SF1234567890' })
  returnTrackingNo?: string | null;

  @ApiPropertyOptional({ type: String, example: '已按商家地址寄回。' })
  returnRemark?: string | null;

  @ApiPropertyOptional({ type: String, example: 'cmp_refund_id' })
  refundId?: string | null;

  @ApiPropertyOptional({ type: String, example: '2026-06-18T09:00:00.000Z' })
  approvedAt?: string | null;

  @ApiPropertyOptional({ type: String, example: '2026-06-18T09:00:00.000Z' })
  buyerReturnedAt?: string | null;

  @ApiPropertyOptional({ type: String, example: '2026-06-18T09:00:00.000Z' })
  merchantReceivedAt?: string | null;

  @ApiPropertyOptional({ type: String, example: '2026-06-18T09:00:00.000Z' })
  rejectedAt?: string | null;

  @ApiPropertyOptional({ type: String, example: '2026-06-18T09:00:00.000Z' })
  completedAt?: string | null;

  @ApiPropertyOptional({ type: String, example: '2026-06-18T09:00:00.000Z' })
  cancelledAt?: string | null;

  @ApiProperty({ type: String, example: '2026-06-18T09:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ type: String, example: '2026-06-18T09:00:00.000Z' })
  updatedAt!: string;

  @ApiPropertyOptional({ type: AfterSaleOrderSnapshotDto })
  order?: AfterSaleOrderSnapshotDto;

  @ApiPropertyOptional({ type: AfterSaleUserSnapshotDto })
  user?: AfterSaleUserSnapshotDto;

  @ApiPropertyOptional({ type: AfterSaleRefundSnapshotDto })
  refund?: AfterSaleRefundSnapshotDto;

  @ApiPropertyOptional({ type: [AfterSaleLogResponseDto] })
  logs?: AfterSaleLogResponseDto[];
}

export class AfterSaleListResultDto {
  @ApiProperty({ type: [AfterSaleResponseDto] })
  items!: AfterSaleResponseDto[];

  @ApiProperty({ type: Number, example: 42 })
  total!: number;

  @ApiProperty({ type: Number, example: 1 })
  page!: number;

  @ApiProperty({ type: Number, example: 10 })
  pageSize!: number;
}

export class AfterSaleStatusCountDto {
  @ApiProperty({ enum: AfterSaleStatus, example: AfterSaleStatus.REQUESTED })
  status!: AfterSaleStatus;

  @ApiProperty({ type: Number, example: 3 })
  count!: number;
}

export class AfterSaleSummaryResponseDto {
  @ApiProperty({ type: Number, example: 12 })
  total!: number;

  @ApiProperty({ type: [AfterSaleStatusCountDto] })
  statusCounts!: AfterSaleStatusCountDto[];
}
