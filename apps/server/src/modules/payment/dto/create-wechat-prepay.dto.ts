import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateWechatPrepayDto {
  @ApiProperty({ example: 'cmpc_order_id' })
  @IsString()
  orderId!: string;
}
