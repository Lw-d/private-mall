import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { AddressController } from './address.controller';
import { AddressService } from './address.service';

@Module({
  imports: [PrismaModule, JwtModule, UserModule],
  controllers: [AddressController],
  providers: [AddressService],
  exports: [AddressService],
})
export class AddressModule {}
