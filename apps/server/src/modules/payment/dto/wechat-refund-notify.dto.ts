import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class WechatRefundNotifyDto {
  @ApiProperty({ example: 'REF20260613093000123ABC' })
  @IsString()
  refundNo!: string;

  @ApiProperty({ example: 'WX_REFUND_202606130001' })
  @IsString()
  transactionId!: string;

  @ApiProperty({ example: 204 })
  @IsNumber()
  amount!: number;

  @ApiPropertyOptional({ example: 'SUCCESS' })
  @IsOptional()
  @IsString()
  refundStatus?: string;
}
