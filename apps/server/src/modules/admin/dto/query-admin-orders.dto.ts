import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { OrderStatus } from '../../../generated/prisma/client';
import { ORDER_LOGISTICS_TRACE_STATUSES } from '../../order/dto/add-order-logistics-trace.dto';

export class QueryAdminOrdersDto {
  @ApiPropertyOptional({ enum: OrderStatus, example: OrderStatus.PENDING_DELIVERY })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ enum: ORDER_LOGISTICS_TRACE_STATUSES, example: 'EXCEPTION' })
  @IsOptional()
  @IsString()
  @IsIn(ORDER_LOGISTICS_TRACE_STATUSES)
  logisticsTraceStatus?: string;

  @ApiPropertyOptional({ example: 'MO20260525' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
