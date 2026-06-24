import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class UpdateHomeBannerItemDto {
  @ApiProperty({ type: String, example: 'cmp_product_id' })
  @IsString()
  productId!: string;

  @ApiProperty({ type: Number, example: 0 })
  @IsInt()
  sort!: number;

  @ApiProperty({ type: Boolean, example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateHomeBannersDto {
  @ApiProperty({ type: [UpdateHomeBannerItemDto] })
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique((item: UpdateHomeBannerItemDto) => item.productId)
  @ValidateNested({ each: true })
  @Type(() => UpdateHomeBannerItemDto)
  items!: UpdateHomeBannerItemDto[];
}
