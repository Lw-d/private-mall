import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { WechatModule } from '../wechat/wechat.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { RefundWorkflowService } from './refund-workflow.service';

@Module({
  imports: [PrismaModule, JwtModule, UserModule, WechatModule],
  controllers: [PaymentController],
  providers: [PaymentService, RefundWorkflowService],
  exports: [PaymentService, RefundWorkflowService],
})
export class PaymentModule {}
