import { ApiProperty } from '@nestjs/swagger';

export class PointRedeemRuleResponseDto {
  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ example: 100 })
  pointsPerYuan!: number;

  @ApiProperty({ enum: ['database', 'env'], example: 'database' })
  source!: 'database' | 'env';

  @ApiProperty({ example: '2026-06-16T03:00:00.000Z', nullable: true })
  updatedAt!: Date | null;
}
