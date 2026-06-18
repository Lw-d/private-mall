import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ApiCommonErrorResponses } from '../common/decorators/api-common-error-responses.decorator';
import { ApiWrappedOkResponse } from '../common/decorators/api-wrapped-ok-response.decorator';
import { AdminService } from './admin.service';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminLoginResponseDto, AdminProfileResponseDto } from './dto/admin-response.dto';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AuthenticatedAdmin } from './types/authenticated-admin';

@ApiTags('admin-auth')
@ApiCommonErrorResponses({ forbidden: false, notFound: false })
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  @ApiWrappedOkResponse({
    type: AdminLoginResponseDto,
    description: 'Login to merchant admin console.',
  })
  login(@Body() dto: AdminLoginDto) {
    return this.adminService.login(dto);
  }

  @Get('profile')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiWrappedOkResponse({
    type: AdminProfileResponseDto,
    description: 'Get current admin profile.',
  })
  profile(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.adminService.getProfile(admin.id);
  }
}
