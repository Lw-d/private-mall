import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: 'mall-server' })
  service!: string;

  @ApiProperty({ example: '2026-05-26T02:00:00.000Z' })
  timestamp!: string;
}
