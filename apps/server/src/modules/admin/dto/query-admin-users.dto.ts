import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class QueryAdminUsersDto {
  @ApiPropertyOptional({ example: '测试用户' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
