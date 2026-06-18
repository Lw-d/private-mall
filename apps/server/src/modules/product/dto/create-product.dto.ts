import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '../../../generated/prisma/client';

import { ProductImageDto } from './product-image.dto';
import { ProductSkuDto } from './product-sku.dto';

export class CreateProductDto {
  @ApiProperty({ example: 'cmpc_category_id' })
  @IsString()
  categoryId!: string;

  @ApiProperty({ example: '修护面霜' })
  @IsString()
  @MaxLength(128)
  name!: string;

  @ApiPropertyOptional({ example: '敏感肌可用' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subtitle?: string;

  @ApiPropertyOptional({ example: '商品详情富文本或纯文本' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ProductStatus, example: ProductStatus.DRAFT })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @ApiProperty({ type: [ProductSkuDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductSkuDto)
  skus!: ProductSkuDto[];

  @ApiPropertyOptional({ type: [ProductImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];
}
