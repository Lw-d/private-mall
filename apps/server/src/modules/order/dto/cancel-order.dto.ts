import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelOrderDto {
  @ApiPropertyOptional({ example: '用户主动取消' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
