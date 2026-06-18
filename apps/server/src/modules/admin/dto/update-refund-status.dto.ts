import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { RefundStatus } from '../../../generated/prisma/client';

export class UpdateRefundStatusDto {
  @ApiProperty({ enum: [RefundStatus.SUCCESS, RefundStatus.FAILED], example: RefundStatus.SUCCESS })
  @IsIn([RefundStatus.SUCCESS, RefundStatus.FAILED])
  status!: Extract<RefundStatus, 'SUCCESS' | 'FAILED'>;

  @ApiPropertyOptional({ example: '商品已发出，不符合退款条件' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  failureReason?: string;
}
