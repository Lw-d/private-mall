import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { OrderModule } from '../order/order.module';
import { PaymentModule } from '../payment/payment.module';
import { PointModule } from '../point/point.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminAuthController } from './admin-auth.controller';
import { AdminPointController } from './admin-point.controller';
import { AdminOrderController } from './admin-order.controller';
import { AdminRefundController } from './admin-refund.controller';
import { AdminRefundService } from './admin-refund.service';
import { AdminStatisticsController } from './admin-statistics.controller';
import { AdminStatisticsService } from './admin-statistics.service';
import { AdminUserController } from './admin-user.controller';
import { AdminUserService } from './admin-user.service';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';

@Module({
  imports: [
    PrismaModule,
    OrderModule,
    PaymentModule,
    PointModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: '2h',
        },
      }),
    }),
  ],
  controllers: [
    AdminAuthController,
    AdminOrderController,
    AdminPointController,
    AdminRefundController,
    AdminStatisticsController,
    AdminUserController,
  ],
  providers: [
    AdminService,
    AdminAuthGuard,
    AdminRefundService,
    AdminStatisticsService,
    AdminUserService,
  ],
  exports: [AdminService, AdminAuthGuard, JwtModule],
})
export class AdminModule {}
