import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminRole, AdminStatus } from '../../../generated/prisma/client';

export class AdminProfileResponseDto {
  @ApiProperty({ example: 'cmp_admin_id' })
  id!: string;

  @ApiProperty({ example: 'admin' })
  username!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '超级管理员' })
  nickname?: string | null;

  @ApiProperty({ enum: AdminRole, example: AdminRole.SUPER_ADMIN })
  role!: AdminRole;

  @ApiProperty({ enum: AdminStatus, example: AdminStatus.ACTIVE })
  status!: AdminStatus;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-05-26T02:00:00.000Z',
  })
  lastLoginAt?: Date | null;
}

export class AdminLoginResponseDto {
  @ApiProperty({ example: 'jwt-admin-access-token' })
  accessToken!: string;

  @ApiProperty({ type: AdminProfileResponseDto })
  admin!: AdminProfileResponseDto;
}
