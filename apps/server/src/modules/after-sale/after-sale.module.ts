import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AdminModule } from '../admin/admin.module';
import { PaymentModule } from '../payment/payment.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { AdminAfterSaleController } from './admin-after-sale.controller';
import { AfterSaleController } from './after-sale.controller';
import { AfterSaleService } from './after-sale.service';

@Module({
  imports: [PrismaModule, JwtModule, UserModule, AdminModule, PaymentModule],
  controllers: [AfterSaleController, AdminAfterSaleController],
  providers: [AfterSaleService],
  exports: [AfterSaleService],
})
export class AfterSaleModule {}
