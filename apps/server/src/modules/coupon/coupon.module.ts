import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AdminModule } from '../admin/admin.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { AdminCouponController } from './admin-coupon.controller';
import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';

@Module({
  imports: [PrismaModule, AdminModule, JwtModule, UserModule],
  controllers: [AdminCouponController, CouponController],
  providers: [CouponService],
  exports: [CouponService],
})
export class CouponModule {}
