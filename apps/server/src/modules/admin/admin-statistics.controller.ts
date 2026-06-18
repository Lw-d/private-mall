import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ApiCommonErrorResponses } from '../common/decorators/api-common-error-responses.decorator';
import { ApiWrappedOkResponse } from '../common/decorators/api-wrapped-ok-response.decorator';
import { AdminStatisticsService } from './admin-statistics.service';
import { AdminStatisticsOverviewDto } from './dto/admin-statistics-response.dto';
import { AdminAuthGuard } from './guards/admin-auth.guard';

@ApiTags('admin-statistics')
@ApiBearerAuth()
@ApiCommonErrorResponses({ forbidden: false, notFound: false })
@UseGuards(AdminAuthGuard)
@Controller('admin/statistics')
export class AdminStatisticsController {
  constructor(private readonly adminStatisticsService: AdminStatisticsService) {}

  @Get('overview')
  @ApiWrappedOkResponse({
    type: AdminStatisticsOverviewDto,
    description: 'Get merchant dashboard overview metrics.',
  })
  getOverview() {
    return this.adminStatisticsService.getOverview();
  }
}
