import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: '李文' })
  @IsString()
  @MaxLength(32)
  receiverName!: string;

  @ApiProperty({ example: '13800000000' })
  @IsString()
  @MaxLength(32)
  receiverPhone!: string;

  @ApiProperty({ example: '广东省' })
  @IsString()
  @MaxLength(32)
  province!: string;

  @ApiProperty({ example: '深圳市' })
  @IsString()
  @MaxLength(32)
  city!: string;

  @ApiProperty({ example: '南山区' })
  @IsString()
  @MaxLength(32)
  district!: string;

  @ApiProperty({ example: '科技园 1 号楼 1001' })
  @IsString()
  @MaxLength(120)
  detailAddress!: string;

  @ApiPropertyOptional({ example: '518000' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  postalCode?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
