import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiSuccessResponseDto {
  @ApiProperty({ type: Number, example: 0 })
  code!: number;

  @ApiProperty({ type: String, example: 'success' })
  message!: string;

  @ApiProperty({ type: Object, description: 'Actual response payload.' })
  data!: unknown;

  @ApiProperty({ type: String, example: '2026-05-25T07:33:21.170Z' })
  timestamp!: string;

  @ApiProperty({ type: String, example: '/api/orders' })
  path!: string;
}

export class ApiErrorResponseDto {
  @ApiProperty({ type: Number, example: 400 })
  code!: number;

  @ApiProperty({ type: String, example: 'Validation failed' })
  message!: string;

  @ApiPropertyOptional({ type: Object, example: 'Bad Request' })
  error?: unknown;

  @ApiProperty({ type: String, example: '2026-05-25T07:33:21.170Z' })
  timestamp!: string;

  @ApiProperty({ type: String, example: '/api/orders' })
  path!: string;
}
