import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { CouponStatus } from '../../../generated/prisma/client';

export class QueryCouponsDto {
  @ApiPropertyOptional({ enum: CouponStatus })
  @IsOptional()
  @IsEnum(CouponStatus)
  status?: CouponStatus;

  @ApiPropertyOptional({ example: '新人' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
