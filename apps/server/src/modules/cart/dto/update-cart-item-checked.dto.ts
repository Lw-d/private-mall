import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateCartItemCheckedDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  checked!: boolean;
}
