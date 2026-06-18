import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AdminModule } from './admin/admin.module';
import { AddressModule } from './address/address.module';
import { AfterSaleModule } from './after-sale/after-sale.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { CategoryModule } from './category/category.module';
import { CouponModule } from './coupon/coupon.module';
import { HealthModule } from './health/health.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { PointModule } from './point/point.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductModule } from './product/product.module';
import { RedisModule } from './redis/redis.module';
import { UploadModule } from './upload/upload.module';
import { UserModule } from './user/user.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnv,
    }),
    HealthModule,
    PrismaModule,
    RedisModule,
    AdminModule,
    AddressModule,
    AfterSaleModule,
    UserModule,
    AuthModule,
    CategoryModule,
    ProductModule,
    CouponModule,
    CartModule,
    OrderModule,
    PaymentModule,
    PointModule,
    UploadModule,
  ],
})
export class AppModule {}
