import { ApiProperty } from '@nestjs/swagger';

import { ProductResponseDto } from './product-response.dto';

export class HomeBannerResponseDto {
  @ApiProperty({ type: String, example: 'cmp_home_banner_id' })
  id!: string;

  @ApiProperty({ type: String, example: 'cmp_product_id' })
  productId!: string;

  @ApiProperty({ type: Number, example: 0 })
  sort!: number;

  @ApiProperty({ type: Boolean, example: true })
  isActive!: boolean;

  @ApiProperty({ type: String, example: '2026-06-19T01:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ type: String, example: '2026-06-19T01:00:00.000Z' })
  updatedAt!: Date;

  @ApiProperty({ type: ProductResponseDto })
  product!: ProductResponseDto;
}
