import { Injectable } from '@nestjs/common';

import { RefundFailureSource, RefundStatus } from '../../generated/prisma/client';
import { PaymentService } from '../payment/payment.service';
import { RefundWorkflowService } from '../payment/refund-workflow.service';
import { UpdateRefundStatusDto } from './dto/update-refund-status.dto';

@Injectable()
export class AdminRefundService {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly refundWorkflowService: RefundWorkflowService,
  ) {}

  updateStatus(id: string, dto: UpdateRefundStatusDto) {
    return this.refundWorkflowService.updateStatusById(id, dto.status, {
      failureReason: dto.status === RefundStatus.FAILED ? dto.failureReason : undefined,
      failureSource:
        dto.status === RefundStatus.FAILED ? RefundFailureSource.ADMIN_REJECT : undefined,
    });
  }

  retryWechatRefund(id: string) {
    return this.paymentService.retryWechatRefund(id);
  }
}
