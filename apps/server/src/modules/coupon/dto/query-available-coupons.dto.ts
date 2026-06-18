import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QueryAvailableCouponsDto {
  @ApiProperty({ example: 209 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;
}
