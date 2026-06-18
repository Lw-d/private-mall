import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PointLedgerType } from '../../../generated/prisma/client';

export class PointLedgerResponseDto {
  @ApiProperty({ example: 'cmp_point_ledger_id' })
  id!: string;

  @ApiProperty({ example: 'cmp_user_id' })
  userId!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'cmp_order_id' })
  orderId?: string | null;

  @ApiProperty({ enum: PointLedgerType, example: PointLedgerType.ORDER_EARN })
  type!: PointLedgerType;

  @ApiProperty({ example: 204 })
  points!: number;

  @ApiProperty({ example: 524 })
  balanceAfter!: number;

  @ApiPropertyOptional({ type: String, nullable: true, example: '订单完成发放积分' })
  description?: string | null;

  @ApiProperty({ example: '2026-06-11T09:00:00.000Z' })
  createdAt!: Date;
}
