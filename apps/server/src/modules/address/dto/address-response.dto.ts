import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddressResponseDto {
  @ApiProperty({ example: 'cmp_address_id' })
  id!: string;

  @ApiProperty({ example: 'cmp_user_id' })
  userId!: string;

  @ApiProperty({ example: '李文' })
  receiverName!: string;

  @ApiProperty({ example: '13800000000' })
  receiverPhone!: string;

  @ApiProperty({ example: '广东省' })
  province!: string;

  @ApiProperty({ example: '深圳市' })
  city!: string;

  @ApiProperty({ example: '南山区' })
  district!: string;

  @ApiProperty({ example: '科技园 1 号楼 1001' })
  detailAddress!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '518000' })
  postalCode?: string | null;

  @ApiProperty({ example: true })
  isDefault!: boolean;

  @ApiProperty({ example: '2026-06-16T07:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-16T07:00:00.000Z' })
  updatedAt!: Date;
}
