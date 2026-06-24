import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ type: String, example: 'ok' })
  status!: string;

  @ApiProperty({ type: String, example: 'mall-server' })
  service!: string;

  @ApiProperty({ type: String, example: '2026-05-26T02:00:00.000Z' })
  timestamp!: string;
}
