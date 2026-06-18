import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ProductStatus } from '../../../generated/prisma/client';

export class UpdateProductStatusDto {
  @ApiProperty({ enum: ProductStatus, example: ProductStatus.ON_SALE })
  @IsEnum(ProductStatus)
  status!: ProductStatus;
}
