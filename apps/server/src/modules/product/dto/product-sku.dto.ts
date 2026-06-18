import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ProductSkuDto {
  @ApiProperty({ example: '默认规格' })
  @IsString()
  @MaxLength(64)
  name!: string;

  @ApiPropertyOptional({ example: 'SKU-001' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  skuCode?: string;

  @ApiPropertyOptional({ example: { color: '白色', size: '50ml' } })
  @IsOptional()
  @IsObject()
  specs?: Record<string, string>;

  @ApiProperty({ example: 199.0 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 259.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  originPrice?: number;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(0)
  stock!: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
