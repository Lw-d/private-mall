import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../../generated/prisma/client';

export class AdminUserResponseDto {
  @ApiProperty({ example: 'cmp_user_id' })
  id!: string;

  @ApiProperty({ example: 'miniapp-openid-001' })
  openId!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'mock-union-id-001' })
  unionId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '测试用户' })
  nickname?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'https://example.com/avatar.png' })
  avatarUrl?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '13800000000' })
  phone?: string | null;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status!: UserStatus;

  @ApiProperty({ example: 2 })
  memberLevel!: number;

  @ApiProperty({ example: 1280 })
  growthValue!: number;

  @ApiProperty({ example: 320 })
  pointsBalance!: number;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-05-26T02:00:00.000Z',
  })
  lastLoginAt?: Date | null;

  @ApiProperty({ example: '2026-05-26T01:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-26T02:00:00.000Z' })
  updatedAt!: Date;
}
