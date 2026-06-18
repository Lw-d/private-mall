import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { AfterSaleType } from '../../../generated/prisma/client';

export class CreateAfterSaleDto {
  @ApiProperty({ type: String, example: 'cmp_order_id' })
  @IsString()
  orderId!: string;

  @ApiProperty({ enum: AfterSaleType, example: AfterSaleType.REFUND_ONLY })
  @IsEnum(AfterSaleType)
  type!: AfterSaleType;

  @ApiProperty({ type: String, example: '商品破损' })
  @IsString()
  @MaxLength(191)
  reason!: string;

  @ApiPropertyOptional({ type: String, example: '收到时外包装破损，需要申请售后。' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ type: Number, example: 99 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  requestedAmount!: number;

  @ApiPropertyOptional({
    type: [String],
    example: ['https://example.com/evidence-a.png'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  evidenceImageUrls?: string[];
}
