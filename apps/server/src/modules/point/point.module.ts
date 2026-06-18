import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { PointController } from './point.controller';
import { PointService } from './point.service';

@Module({
  imports: [PrismaModule, JwtModule, UserModule],
  controllers: [PointController],
  providers: [PointService],
  exports: [PointService],
})
export class PointModule {}
