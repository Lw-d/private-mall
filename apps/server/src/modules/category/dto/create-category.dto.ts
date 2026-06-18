import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: '护肤' })
  @IsString()
  @MaxLength(64)
  name!: string;

  @ApiPropertyOptional({ example: 'cmpc_category_parent_id' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ example: '护肤类商品' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
