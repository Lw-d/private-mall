import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiCommonErrorResponses } from '../common/decorators/api-common-error-responses.decorator';
import { ApiWrappedOkResponse } from '../common/decorators/api-wrapped-ok-response.decorator';
import { RefundResponseDto } from '../payment/dto/payment-response.dto';
import { AdminRefundService } from './admin-refund.service';
import { UpdateRefundStatusDto } from './dto/update-refund-status.dto';
import { AdminAuthGuard } from './guards/admin-auth.guard';

@ApiTags('admin-refunds')
@ApiBearerAuth()
@ApiCommonErrorResponses()
@UseGuards(AdminAuthGuard)
@Controller('admin/refunds')
export class AdminRefundController {
  constructor(private readonly adminRefundService: AdminRefundService) {}

  @Patch(':id/status')
  @ApiOperation({
    summary: '商家后台处理退款申请',
    description: '支持将待处理退款标记为成功或失败。',
  })
  @ApiWrappedOkResponse({
    type: RefundResponseDto,
    description: 'Update refund status as merchant admin.',
  })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateRefundStatusDto) {
    return this.adminRefundService.updateStatus(id, dto);
  }

  @Post(':id/retry')
  @ApiOperation({
    summary: '商家后台重试真实微信退款',
    description: '仅支持在真实微信支付模式下重新发起失败退款。',
  })
  @ApiWrappedOkResponse({
    type: RefundResponseDto,
    description: 'Retry a failed real WeChat refund.',
  })
  retryWechatRefund(@Param('id') id: string) {
    return this.adminRefundService.retryWechatRefund(id);
  }
}
