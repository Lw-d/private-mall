import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderResponseDto } from '../../order/dto/order-response.dto';

export class AdminOrderUserDto {
  @ApiProperty({ example: 'cmp_user_id' })
  id!: string;

  @ApiProperty({ example: 'miniapp-openid-001' })
  openId!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '测试用户' })
  nickname?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '13800000000' })
  phone?: string | null;
}

export class AdminOrderDto extends OrderResponseDto {
  @ApiProperty({ type: AdminOrderUserDto })
  user!: AdminOrderUserDto;
}

export class AdminOrderListResultDto {
  @ApiProperty({ type: [AdminOrderDto] })
  items!: AdminOrderDto[];

  @ApiProperty({ example: 128 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;
}
