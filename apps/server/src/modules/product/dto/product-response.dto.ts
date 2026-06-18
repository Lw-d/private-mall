import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '../../../generated/prisma/client';
import { CategoryResponseDto } from '../../category/dto/category-response.dto';

export class ProductSkuResponseDto {
  @ApiProperty({ example: 'cmp_sku_id' })
  id!: string;

  @ApiProperty({ example: 'cmp_product_id' })
  productId!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'SKU-001' })
  skuCode?: string | null;

  @ApiProperty({ example: '50ml' })
  name!: string;

  @ApiPropertyOptional({ type: Object, nullable: true, example: { 规格: '50ml' } })
  specs?: Record<string, unknown> | null;

  @ApiProperty({ example: '209.00' })
  price!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '259.00' })
  originPrice?: string | null;

  @ApiProperty({ example: 99 })
  stock!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-05-25T01:53:13.676Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-25T01:53:13.676Z' })
  updatedAt!: Date;
}

export class ProductImageResponseDto {
  @ApiProperty({ example: 'cmp_product_image_id' })
  id!: string;

  @ApiProperty({ example: 'cmp_product_id' })
  productId!: string;

  @ApiProperty({ example: 'https://example.com/cream-main.png' })
  url!: string;

  @ApiProperty({ example: 0 })
  sort!: number;

  @ApiProperty({ example: true })
  isMain!: boolean;

  @ApiProperty({ example: '2026-05-25T01:53:13.676Z' })
  createdAt!: Date;
}

export class ProductResponseDto {
  @ApiProperty({ example: 'cmp_product_id' })
  id!: string;

  @ApiProperty({ example: 'cmp_category_id' })
  categoryId!: string;

  @ApiProperty({ example: '修护精华面霜' })
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '敏感肌可用' })
  subtitle?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '商品详情介绍' })
  description?: string | null;

  @ApiProperty({ enum: ProductStatus, example: ProductStatus.ON_SALE })
  status!: ProductStatus;

  @ApiProperty({ example: 128 })
  salesCount!: number;

  @ApiProperty({ example: 0 })
  sort!: number;

  @ApiProperty({ example: '2026-05-25T01:53:13.676Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-25T01:53:13.676Z' })
  updatedAt!: Date;

  @ApiProperty({ type: CategoryResponseDto })
  category!: CategoryResponseDto;

  @ApiProperty({ type: [ProductSkuResponseDto] })
  skus!: ProductSkuResponseDto[];

  @ApiProperty({ type: [ProductImageResponseDto] })
  images!: ProductImageResponseDto[];
}
