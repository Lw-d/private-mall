import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { CartModule } from '../cart/cart.module';
import { LogisticsModule } from '../logistics/logistics.module';
import { PointModule } from '../point/point.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [PrismaModule, CartModule, JwtModule, UserModule, PointModule, LogisticsModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
