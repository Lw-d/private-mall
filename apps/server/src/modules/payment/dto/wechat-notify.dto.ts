import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class WechatNotifyDto {
  @ApiProperty({ example: 'cmpc_order_id' })
  @IsString()
  orderId!: string;

  @ApiProperty({ example: 'MO20260519141815AKDJL2' })
  @IsString()
  orderNo!: string;

  @ApiProperty({ example: 'WX_TX_202605190001' })
  @IsString()
  transactionId!: string;

  @ApiProperty({ example: 418 })
  @IsNumber()
  amount!: number;

  @ApiPropertyOptional({ example: 'SUCCESS' })
  @IsOptional()
  @IsString()
  tradeState?: string;
}
