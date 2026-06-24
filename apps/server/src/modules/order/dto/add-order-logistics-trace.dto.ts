import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export const ORDER_LOGISTICS_TRACE_STATUSES = [
  'SHIPPED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERING',
  'DELIVERED',
  'EXCEPTION',
] as const;

export type OrderLogisticsTraceStatus = (typeof ORDER_LOGISTICS_TRACE_STATUSES)[number];

export class AddOrderLogisticsTraceDto {
  @ApiProperty({ enum: ORDER_LOGISTICS_TRACE_STATUSES, example: 'IN_TRANSIT' })
  @IsString()
  @IsNotEmpty()
  @IsIn(ORDER_LOGISTICS_TRACE_STATUSES)
  @MaxLength(64)
  status!: string;

  @ApiProperty({ example: '包裹已到达深圳转运中心' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  content!: string;

  @ApiPropertyOptional({ example: '顺丰速运' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  logisticsCompany?: string;

  @ApiPropertyOptional({ example: 'SF1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  trackingNo?: string;
}
