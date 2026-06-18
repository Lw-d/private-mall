import { ApiProperty } from '@nestjs/swagger';
import { AdminOrderDto } from './admin-order-list-result.dto';

export class AdminStatisticsMetricsDto {
  @ApiProperty({ example: '12888.00' })
  gmv!: string;

  @ApiProperty({ example: 128 })
  totalOrders!: number;

  @ApiProperty({ example: 12 })
  todayOrders!: number;

  @ApiProperty({ example: 5 })
  pendingDeliveryOrders!: number;

  @ApiProperty({ example: 256 })
  totalUsers!: number;

  @ApiProperty({ example: 42 })
  productsOnSale!: number;

  @ApiProperty({ example: 60 })
  totalProducts!: number;

  @ApiProperty({ example: 4 })
  activeCoupons!: number;

  @ApiProperty({ example: 86 })
  claimedCoupons!: number;

  @ApiProperty({ example: 31 })
  usedCoupons!: number;

  @ApiProperty({ example: '568.00' })
  couponDiscountAmount!: string;

  @ApiProperty({ example: 2048 })
  pointsIssued!: number;

  @ApiProperty({ example: 1688 })
  pointsBalanceTotal!: number;

  @ApiProperty({ example: 96 })
  pointLedgerCount!: number;
}

export class AdminStatisticsOverviewDto {
  @ApiProperty({ type: AdminStatisticsMetricsDto })
  metrics!: AdminStatisticsMetricsDto;

  @ApiProperty({ type: [AdminOrderDto] })
  recentOrders!: AdminOrderDto[];
}
