import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PaymentChannel,
  PaymentStatus,
  RefundFailureSource,
  RefundStatus,
} from '../../../generated/prisma/client';

export class PaymentRecordResponseDto {
  @ApiProperty({ example: 'cmp_payment_id' })
  id!: string;

  @ApiProperty({ example: 'PAY20260526093000123ABC' })
  paymentNo!: string;

  @ApiProperty({ example: 'cmp_order_id' })
  orderId!: string;

  @ApiProperty({ enum: PaymentChannel, example: PaymentChannel.WECHAT })
  channel!: PaymentChannel;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @ApiProperty({ example: '209.00' })
  amount!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '4200000000000000000' })
  transactionId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'wx_prepay_20260526093000123ABC' })
  prepayId?: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-05-25T01:53:28.731Z',
  })
  paidAt?: Date | null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  notifyPayload?: Record<string, unknown> | null;

  @ApiProperty({ example: '2026-05-25T01:53:13.676Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-25T01:53:13.676Z' })
  updatedAt!: Date;
}

export class WechatPayParamsResponseDto {
  @ApiProperty({ example: 'mock-app-id' })
  appId!: string;

  @ApiProperty({ example: '1770000000' })
  timeStamp!: string;

  @ApiProperty({ example: 'abc123nonce' })
  nonceStr!: string;

  @ApiProperty({ example: 'prepay_id=wx_prepay_20260526093000123ABC' })
  package!: string;

  @ApiProperty({ example: 'RSA' })
  signType!: string;

  @ApiProperty({ example: 'mock-pay-sign' })
  paySign!: string;
}

export class WechatPrepayResponseDto {
  @ApiProperty({ type: PaymentRecordResponseDto })
  payment!: PaymentRecordResponseDto;

  @ApiProperty({ type: WechatPayParamsResponseDto })
  wechatPayParams!: WechatPayParamsResponseDto;
}

export class WechatNotifyResponseDto {
  @ApiProperty({ example: true })
  received!: boolean;

  @ApiProperty({ example: false })
  idempotent!: boolean;

  @ApiPropertyOptional({ type: PaymentRecordResponseDto, nullable: true })
  payment?: PaymentRecordResponseDto | null;
}

export class PaymentStatusResponseDto {
  @ApiProperty({ example: 'cmp_order_id' })
  orderId!: string;

  @ApiProperty({ type: [PaymentRecordResponseDto] })
  payments!: PaymentRecordResponseDto[];
}

export class RefundResponseDto {
  @ApiProperty({ example: 'cmp_refund_id' })
  id!: string;

  @ApiProperty({ example: 'REF20260526093000123ABC' })
  refundNo!: string;

  @ApiProperty({ example: 'cmp_order_id' })
  orderId!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'cmp_payment_id' })
  paymentId?: string | null;

  @ApiProperty({ example: '99.00' })
  amount!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '用户申请退款' })
  reason?: string | null;

  @ApiProperty({ enum: RefundStatus, example: RefundStatus.PENDING })
  status!: RefundStatus;

  @ApiPropertyOptional({
    enum: RefundFailureSource,
    nullable: true,
    example: RefundFailureSource.WECHAT_REQUEST,
  })
  failureSource?: RefundFailureSource | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Wechat refund request failed' })
  failureReason?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'refund_transaction_id' })
  transactionId?: string | null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  notifyPayload?: Record<string, unknown> | null;

  @ApiProperty({ example: '2026-05-25T01:53:13.676Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-25T01:53:13.676Z' })
  updatedAt!: Date;
}

export class WechatRefundNotifyResponseDto {
  @ApiProperty({ example: true })
  received!: boolean;

  @ApiProperty({ example: false })
  idempotent!: boolean;

  @ApiPropertyOptional({ type: RefundResponseDto, nullable: true })
  refund?: RefundResponseDto | null;
}
