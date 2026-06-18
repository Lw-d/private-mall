import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ApiCommonErrorResponses } from '../common/decorators/api-common-error-responses.decorator';
import { ApiWrappedOkResponse } from '../common/decorators/api-wrapped-ok-response.decorator';
import { AdminUserService } from './admin-user.service';
import { AdminUserResponseDto } from './dto/admin-user-response.dto';
import { QueryAdminUsersDto } from './dto/query-admin-users.dto';
import { AdminAuthGuard } from './guards/admin-auth.guard';

@ApiTags('admin-users')
@ApiBearerAuth()
@ApiCommonErrorResponses({ forbidden: false, notFound: false })
@UseGuards(AdminAuthGuard)
@Controller('admin/users')
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get()
  @ApiWrappedOkResponse({
    type: AdminUserResponseDto,
    isArray: true,
    description: 'List users for merchant admin.',
  })
  findMany(@Query() query: QueryAdminUsersDto) {
    return this.adminUserService.findMany(query);
  }
}
