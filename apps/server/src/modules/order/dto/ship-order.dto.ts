import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ShipOrderDto {
  @ApiPropertyOptional({ example: '顺丰速运' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  logisticsCompany?: string;

  @ApiPropertyOptional({ example: 'SF1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  trackingNo?: string;

  @ApiPropertyOptional({ example: '后台发货' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}
