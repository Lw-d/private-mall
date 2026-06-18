import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProductStatus } from '../../../generated/prisma/client';

export class QueryProductsDto {
  @ApiPropertyOptional({ example: 'cmpc_category_id' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ProductStatus, example: ProductStatus.ON_SALE })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ example: '面霜' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
