import { Body, Controller, Delete, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiCommonErrorResponses } from '../common/decorators/api-common-error-responses.decorator';
import { ApiWrappedOkResponse } from '../common/decorators/api-wrapped-ok-response.decorator';
import { PointRedeemRuleResponseDto } from '../point/dto/point-redeem-rule-response.dto';
import { UpdatePointRedeemRuleDto } from '../point/dto/update-point-redeem-rule.dto';
import { PointService } from '../point/point.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';

@ApiTags('admin-points')
@ApiBearerAuth()
@ApiCommonErrorResponses()
@UseGuards(AdminAuthGuard)
@Controller('admin/points')
export class AdminPointController {
  constructor(private readonly pointService: PointService) {}

  @Get('rules')
  @ApiOperation({
    summary: '商家后台查看积分抵扣规则',
    description: '返回当前后端生效的积分抵扣规则。',
  })
  @ApiWrappedOkResponse({
    type: PointRedeemRuleResponseDto,
    description: 'Get current point redeem rules for admin.',
  })
  getRedeemRules() {
    return this.pointService.getRedeemRules();
  }

  @Patch('rules')
  @ApiOperation({
    summary: '商家后台更新积分抵扣规则',
    description: '更新当前后端生效的积分抵扣规则。',
  })
  @ApiWrappedOkResponse({
    type: PointRedeemRuleResponseDto,
    description: 'Update current point redeem rules.',
  })
  updateRedeemRules(@Body() dto: UpdatePointRedeemRuleDto) {
    return this.pointService.updateRedeemRules(dto);
  }

  @Delete('rules')
  @ApiOperation({
    summary: '商家后台恢复积分抵扣默认规则',
    description: '删除后台保存的积分抵扣规则，恢复使用环境变量配置。',
  })
  @ApiWrappedOkResponse({
    type: PointRedeemRuleResponseDto,
    description: 'Reset point redeem rules to env fallback.',
  })
  resetRedeemRules() {
    return this.pointService.resetRedeemRules();
  }
}
