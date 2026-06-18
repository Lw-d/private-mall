import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { ApiCommonErrorResponses } from '../common/decorators/api-common-error-responses.decorator';
import { ApiWrappedOkResponse } from '../common/decorators/api-wrapped-ok-response.decorator';
import { AfterSaleService } from './after-sale.service';
import { AfterSaleListResultDto, AfterSaleResponseDto } from './dto/after-sale-response.dto';
import { QueryAdminAfterSalesDto } from './dto/query-after-sales.dto';
import {
  ApproveAfterSaleDto,
  ConfirmReturnReceivedDto,
  RejectAfterSaleDto,
} from './dto/review-after-sale.dto';

@ApiTags('admin-after-sales')
@ApiBearerAuth()
@ApiCommonErrorResponses()
@UseGuards(AdminAuthGuard)
@Controller('admin/after-sales')
export class AdminAfterSaleController {
  constructor(private readonly afterSaleService: AfterSaleService) {}

  @Get()
  @ApiOperation({
    summary: '商家后台分页查询售后申请',
  })
  @ApiWrappedOkResponse({
    type: AfterSaleListResultDto,
    description: 'List after-sale requests for merchant admin.',
  })
  findMany(@Query() query: QueryAdminAfterSalesDto) {
    return this.afterSaleService.findManyForAdmin(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: '商家后台查询售后详情',
  })
  @ApiWrappedOkResponse({
    type: AfterSaleResponseDto,
    description: 'Get after-sale request detail for merchant admin.',
  })
  findById(@Param('id') id: string) {
    return this.afterSaleService.findByIdForAdmin(id);
  }

  @Patch(':id/approve')
  @ApiOperation({
    summary: '商家后台审核通过售后申请',
    description: 'P8-02 仅推进售后状态，不触发资金退款。',
  })
  @ApiWrappedOkResponse({
    type: AfterSaleResponseDto,
    description: 'Approve after-sale request.',
  })
  approve(@Param('id') id: string, @Body() dto: ApproveAfterSaleDto) {
    return this.afterSaleService.approveForAdmin(id, dto);
  }

  @Patch(':id/reject')
  @ApiOperation({
    summary: '商家后台驳回售后申请',
  })
  @ApiWrappedOkResponse({
    type: AfterSaleResponseDto,
    description: 'Reject after-sale request.',
  })
  reject(@Param('id') id: string, @Body() dto: RejectAfterSaleDto) {
    return this.afterSaleService.rejectForAdmin(id, dto);
  }

  @Patch(':id/confirm-return-received')
  @ApiOperation({
    summary: '商家后台确认收到退货',
    description: '仅允许已填写退货物流的退货退款售后确认收货，不直接触发资金退款。',
  })
  @ApiWrappedOkResponse({
    type: AfterSaleResponseDto,
    description: 'Confirm return goods received.',
  })
  confirmReturnReceived(@Param('id') id: string, @Body() dto: ConfirmReturnReceivedDto) {
    return this.afterSaleService.confirmReturnReceivedForAdmin(id, dto);
  }

  @Patch(':id/trigger-refund')
  @ApiOperation({
    summary: '商家后台触发售后退款',
    description: '仅允许仅退款已审核通过或退货退款商家已收货的售后触发退款。',
  })
  @ApiWrappedOkResponse({
    type: AfterSaleResponseDto,
    description: 'Trigger refund for after-sale request.',
  })
  triggerRefund(@Param('id') id: string) {
    return this.afterSaleService.triggerRefundForAdmin(id);
  }
}
