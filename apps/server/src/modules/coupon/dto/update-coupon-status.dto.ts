import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { CouponStatus } from '../../../generated/prisma/client';

export class UpdateCouponStatusDto {
  @ApiProperty({ enum: CouponStatus, example: CouponStatus.ACTIVE })
  @IsEnum(CouponStatus)
  status!: CouponStatus;
}
