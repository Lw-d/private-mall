import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ApiCommonErrorResponses } from '../common/decorators/api-common-error-responses.decorator';
import { ApiWrappedOkResponse } from '../common/decorators/api-wrapped-ok-response.decorator';
import { PointLedgerResponseDto } from './dto/point-ledger-response.dto';
import { PointRedeemRuleResponseDto } from './dto/point-redeem-rule-response.dto';
import { PointService } from './point.service';

@ApiTags('points')
@ApiBearerAuth()
@ApiCommonErrorResponses()
@UseGuards(JwtAuthGuard)
@Controller('points')
export class PointController {
  constructor(private readonly pointService: PointService) {}

  @Get('ledger')
  @ApiWrappedOkResponse({
    type: PointLedgerResponseDto,
    isArray: true,
    description: 'List current user point ledger records.',
  })
  findLedger(@CurrentUser() user: AuthenticatedUser) {
    return this.pointService.findLedger(user.id);
  }

  @Get('rules')
  @ApiWrappedOkResponse({
    type: PointRedeemRuleResponseDto,
    description: 'Get current point redeem rules.',
  })
  getRedeemRules() {
    return this.pointService.getRedeemRules();
  }
}
