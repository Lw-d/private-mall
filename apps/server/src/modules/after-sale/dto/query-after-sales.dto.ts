import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AfterSaleStatus, AfterSaleType } from '../../../generated/prisma/client';

export class QueryAfterSalesDto {
  @ApiPropertyOptional({ type: String, example: 'cmp_order_id' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ enum: AfterSaleStatus, example: AfterSaleStatus.REQUESTED })
  @IsOptional()
  @IsEnum(AfterSaleStatus)
  status?: AfterSaleStatus;

  @ApiPropertyOptional({ enum: AfterSaleType, example: AfterSaleType.RETURN_REFUND })
  @IsOptional()
  @IsEnum(AfterSaleType)
  type?: AfterSaleType;

  @ApiPropertyOptional({ type: Number, example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ type: Number, example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}

export class QueryAdminAfterSalesDto extends QueryAfterSalesDto {
  @ApiPropertyOptional({ type: String, example: 'AS20260618' })
  @IsOptional()
  @IsString()
  keyword?: string;
}

export class QueryAfterSaleSummaryDto {
  @ApiPropertyOptional({ type: String, example: 'cmp_order_id' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ enum: AfterSaleType, example: AfterSaleType.RETURN_REFUND })
  @IsOptional()
  @IsEnum(AfterSaleType)
  type?: AfterSaleType;
}
