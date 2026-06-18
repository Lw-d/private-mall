import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ApiCommonErrorResponses } from '../common/decorators/api-common-error-responses.decorator';
import { ApiWrappedOkResponse } from '../common/decorators/api-wrapped-ok-response.decorator';
import { AfterSaleService } from './after-sale.service';
import { AfterSaleListResultDto, AfterSaleResponseDto } from './dto/after-sale-response.dto';
import { CreateAfterSaleDto } from './dto/create-after-sale.dto';
import { QueryAfterSalesDto } from './dto/query-after-sales.dto';
import { SubmitReturnLogisticsDto } from './dto/review-after-sale.dto';

@ApiTags('after-sales')
@ApiBearerAuth()
@ApiCommonErrorResponses()
@UseGuards(JwtAuthGuard)
@Controller('after-sales')
export class AfterSaleController {
  constructor(private readonly afterSaleService: AfterSaleService) {}

  @Post()
  @ApiOperation({
    summary: '小程序用户创建售后申请',
    description: 'P8-02 基础接口，仅创建售后单，不直接触发退款或退货物流。',
  })
  @ApiWrappedOkResponse({
    type: AfterSaleResponseDto,
    description: 'Create after-sale request.',
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAfterSaleDto) {
    return this.afterSaleService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: '小程序用户查询自己的售后列表',
  })
  @ApiWrappedOkResponse({
    type: AfterSaleListResultDto,
    description: 'List current user after-sale requests.',
  })
  findMany(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryAfterSalesDto) {
    return this.afterSaleService.findMany(user.id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: '小程序用户查询自己的售后详情',
  })
  @ApiWrappedOkResponse({
    type: AfterSaleResponseDto,
    description: 'Get current user after-sale detail.',
  })
  findById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.afterSaleService.findById(user.id, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: '小程序用户取消售后申请',
    description: '仅允许取消待审核或等待买家退货的售后申请。',
  })
  @ApiWrappedOkResponse({
    type: AfterSaleResponseDto,
    description: 'Cancel after-sale request.',
  })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.afterSaleService.cancel(user.id, id);
  }

  @Patch(':id/return-logistics')
  @ApiOperation({
    summary: '小程序用户填写退货物流',
    description: '仅允许等待买家退货的售后填写退货物流，填写后进入已退货状态。',
  })
  @ApiWrappedOkResponse({
    type: AfterSaleResponseDto,
    description: 'Submit return logistics for after-sale request.',
  })
  submitReturnLogistics(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SubmitReturnLogisticsDto,
  ) {
    return this.afterSaleService.submitReturnLogistics(user.id, id, dto);
  }
}
