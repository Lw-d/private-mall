import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class WxLoginDto {
  @ApiProperty({
    description:
      'Wechat login code. When WECHAT_LOGIN_MODE=mock this is used to derive a mock openId; when WECHAT_LOGIN_MODE=real it is exchanged through code2Session.',
    example: 'mock-code-001',
  })
  @IsString()
  @MaxLength(128)
  code!: string;

  @ApiPropertyOptional({
    description: 'Local development mock openId. Ignored when WECHAT_LOGIN_MODE=real.',
    example: 'mock-open-id-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  mockOpenId?: string;

  @ApiPropertyOptional({ example: 'mock-union-id-001' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  unionId?: string;

  @ApiPropertyOptional({ example: '测试用户' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  nickname?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  avatarUrl?: string;
}
