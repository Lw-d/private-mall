import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartSkuResponseDto {
  @ApiProperty({ example: 'cmp_sku_id' })
  id!: string;

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
}

export class CartProductResponseDto {
  @ApiProperty({ example: 'cmp_product_id' })
  id!: string;

  @ApiProperty({ example: '修护精华面霜' })
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '敏感肌可用' })
  subtitle?: string | null;

  @ApiProperty({ example: 'ON_SALE' })
  status!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'https://example.com/cream.png' })
  mainImage?: string | null;
}

export class CartItemResponseDto {
  @ApiProperty({ example: 'cmp_sku_id' })
  skuId!: string;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: true })
  checked!: boolean;

  @ApiProperty({ example: '2026-05-25T01:53:13.676Z' })
  addedAt!: string;

  @ApiProperty({ example: '2026-05-25T01:59:13.676Z' })
  updatedAt!: string;

  @ApiProperty({ example: true })
  available!: boolean;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Insufficient SKU stock' })
  unavailableReason?: string | null;

  @ApiPropertyOptional({ type: CartSkuResponseDto, nullable: true })
  sku?: CartSkuResponseDto | null;

  @ApiPropertyOptional({ type: CartProductResponseDto, nullable: true })
  product?: CartProductResponseDto | null;
}

export class CartSummaryResponseDto {
  @ApiProperty({ example: 3 })
  totalQuantity!: number;

  @ApiProperty({ example: 2 })
  checkedQuantity!: number;

  @ApiProperty({ example: 1 })
  checkedCount!: number;
}

export class CartResponseDto {
  @ApiProperty({ type: [CartItemResponseDto] })
  items!: CartItemResponseDto[];

  @ApiProperty({ type: CartSummaryResponseDto })
  summary!: CartSummaryResponseDto;
}
