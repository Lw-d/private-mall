import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateRefundDto {
  @ApiProperty({ example: 'cmpc_order_id' })
  @IsString()
  orderId!: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ example: '用户申请退款' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
