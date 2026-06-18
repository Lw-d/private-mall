import { ApiProperty } from '@nestjs/swagger';

import { OrderResponseDto } from './order-response.dto';

export class OrderListResultDto {
  @ApiProperty({ type: [OrderResponseDto] })
  items!: OrderResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  pageSize!: number;
}
