import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCouponDto {
  @ApiProperty({ example: '新人满 99 减 20' })
  @IsString()
  @MaxLength(64)
  name!: string;

  @ApiPropertyOptional({ example: 'NEW_USER_20' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;

  @ApiProperty({ example: 99 })
  @IsNumber()
  @Min(0)
  thresholdAmount!: number;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0.01)
  discountAmount!: number;

  @ApiProperty({ example: 1000 })
  @IsInt()
  @Min(1)
  totalStock!: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  @IsDateString()
  validFrom!: string;

  @ApiProperty({ example: '2026-12-31T23:59:59.999Z' })
  @IsDateString()
  validTo!: string;

  @ApiPropertyOptional({ example: '新用户首单可用' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
