import { Body, Controller, Get, Headers, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ApiCommonErrorResponses } from '../common/decorators/api-common-error-responses.decorator';
import { ApiWrappedOkResponse } from '../common/decorators/api-wrapped-ok-response.decorator';
import { CreateRefundDto } from './dto/create-refund.dto';
import { CreateWechatPrepayDto } from './dto/create-wechat-prepay.dto';
import {
  PaymentStatusResponseDto,
  WechatRefundNotifyResponseDto,
  RefundResponseDto,
  WechatNotifyResponseDto,
  WechatPrepayResponseDto,
} from './dto/payment-response.dto';
import { WechatRefundNotifyDto } from './dto/wechat-refund-notify.dto';
import { WechatNotifyDto } from './dto/wechat-notify.dto';
import { PaymentService } from './payment.service';

interface RawBodyRequest {
  rawBody?: Buffer;
}

interface PassthroughResponse {
  status: (statusCode: number) => void;
}

@ApiTags('payments')
@ApiCommonErrorResponses({ unauthorized: false, forbidden: false })
@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('payments/wechat/prepay')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiCommonErrorResponses({ badRequest: false, notFound: false })
  @ApiWrappedOkResponse({
    description: 'Create mock WeChat prepay params for pending order.',
    type: WechatPrepayResponseDto,
  })
  createWechatPrepay(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWechatPrepayDto) {
    return this.paymentService.createWechatPrepay(user.id, dto);
  }

  @Post('payments/wechat/notify')
  @ApiWrappedOkResponse({
    description: 'Local mock WeChat payment notification callback.',
    type: WechatNotifyResponseDto,
  })
  @ApiNoContentResponse({
    description: 'Real WeChat payment notification accepted. Success response has no body.',
  })
  async handleWechatNotify(
    @Body() body: WechatNotifyDto | unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() request: RawBodyRequest,
    @Res({ passthrough: true }) response: PassthroughResponse,
  ) {
    const result = await this.paymentService.handleWechatNotify(body, {
      headers,
      rawBody: request.rawBody?.toString('utf8'),
    });

    if (this.paymentService.isRealWechatPayMode()) {
      response.status(204);
      return undefined;
    }

    return result;
  }

  @Post('refunds/wechat/notify')
  @ApiWrappedOkResponse({
    description: 'Local mock WeChat refund notification callback.',
    type: WechatRefundNotifyResponseDto,
  })
  @ApiNoContentResponse({
    description: 'Real WeChat refund notification accepted. Success response has no body.',
  })
  async handleWechatRefundNotify(
    @Body() body: WechatRefundNotifyDto | unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() request: RawBodyRequest,
    @Res({ passthrough: true }) response: PassthroughResponse,
  ) {
    const result = await this.paymentService.handleWechatRefundNotify(body, {
      headers,
      rawBody: request.rawBody?.toString('utf8'),
    });

    if (this.paymentService.isRealWechatPayMode()) {
      response.status(204);
      return undefined;
    }

    return result;
  }

  @Get('payments/:orderId/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiCommonErrorResponses({ badRequest: false, notFound: false })
  @ApiWrappedOkResponse({
    description: 'Get payment status by order id.',
    type: PaymentStatusResponseDto,
  })
  getPaymentStatus(@CurrentUser() user: AuthenticatedUser, @Param('orderId') orderId: string) {
    return this.paymentService.getPaymentStatus(user.id, orderId);
  }

  @Post('refunds')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiCommonErrorResponses({ badRequest: false, notFound: false })
  @ApiWrappedOkResponse({
    description: 'Create refund request skeleton.',
    type: RefundResponseDto,
  })
  createRefund(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRefundDto) {
    return this.paymentService.createRefund(user.id, dto);
  }
}
