import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  username!: string;

  @ApiProperty({ example: 'Admin123456' })
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password!: string;
}
