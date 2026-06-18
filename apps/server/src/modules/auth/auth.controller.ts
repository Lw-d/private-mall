import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ApiCommonErrorResponses } from '../common/decorators/api-common-error-responses.decorator';
import { ApiWrappedOkResponse } from '../common/decorators/api-wrapped-ok-response.decorator';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserLoginResponseDto, UserProfileResponseDto } from './dto/auth-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { WxLoginDto } from './dto/wx-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticatedUser } from './types/authenticated-user';

@ApiTags('auth')
@ApiCommonErrorResponses({ forbidden: false, notFound: false })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('wx-login')
  @ApiWrappedOkResponse({
    type: UserLoginResponseDto,
    description: 'Login with WeChat code. Current implementation supports local mock login.',
  })
  wxLogin(@Body() dto: WxLoginDto) {
    return this.authService.wxLogin(dto);
  }

  @Post('refresh-token')
  @ApiWrappedOkResponse({
    type: UserLoginResponseDto,
    description: 'Refresh access token with a valid refresh token.',
  })
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiWrappedOkResponse({
    type: UserProfileResponseDto,
    description: 'Returns current authenticated user profile.',
  })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }
}
