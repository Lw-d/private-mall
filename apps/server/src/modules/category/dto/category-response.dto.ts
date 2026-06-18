import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({ example: 'cmp_category_id' })
  id!: string;

  @ApiProperty({ example: '护肤' })
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'cmp_parent_category_id' })
  parentId?: string | null;

  @ApiProperty({ example: 1 })
  level!: number;

  @ApiProperty({ example: 'cmp_parent_category_id/cmp_category_id' })
  path!: string;

  @ApiProperty({ example: 0 })
  sort!: number;

  @ApiProperty({ example: true })
  isVisible!: boolean;

  @ApiPropertyOptional({ type: String, nullable: true, example: '基础护肤分类' })
  description?: string | null;

  @ApiProperty({ example: '2026-05-25T01:53:13.676Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-25T01:53:13.676Z' })
  updatedAt!: Date;
}

export class CategoryTreeNodeResponseDto extends CategoryResponseDto {
  @ApiProperty({ type: () => [CategoryTreeNodeResponseDto] })
  children!: CategoryTreeNodeResponseDto[];
}
