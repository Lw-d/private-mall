import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  findMany(userId: string) {
    return this.prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async findDefault(userId: string) {
    return this.prisma.userAddress.findFirst({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async findByIdForUser(userId: string, id: string) {
    const address = await this.prisma.userAddress.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  async create(userId: string, dto: CreateAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      const existingCount = await tx.userAddress.count({ where: { userId } });
      const isDefault = dto.isDefault ?? existingCount === 0;

      if (isDefault) {
        await this.clearDefault(tx, userId);
      }

      return tx.userAddress.create({
        data: {
          userId,
          receiverName: dto.receiverName,
          receiverPhone: dto.receiverPhone,
          province: dto.province,
          city: dto.city,
          district: dto.district,
          detailAddress: dto.detailAddress,
          postalCode: dto.postalCode,
          isDefault,
        },
      });
    });
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    await this.findByIdForUser(userId, id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await this.clearDefault(tx, userId);
      }

      return tx.userAddress.update({
        where: { id },
        data: {
          receiverName: dto.receiverName,
          receiverPhone: dto.receiverPhone,
          province: dto.province,
          city: dto.city,
          district: dto.district,
          detailAddress: dto.detailAddress,
          postalCode: dto.postalCode,
          isDefault: dto.isDefault,
        },
      });
    });
  }

  async setDefault(userId: string, id: string) {
    await this.findByIdForUser(userId, id);

    return this.prisma.$transaction(async (tx) => {
      await this.clearDefault(tx, userId);

      return tx.userAddress.update({
        where: { id },
        data: { isDefault: true },
      });
    });
  }

  async remove(userId: string, id: string) {
    const address = await this.findByIdForUser(userId, id);

    if (address.isDefault) {
      throw new BadRequestException('Default address cannot be deleted');
    }

    return this.prisma.userAddress.delete({ where: { id } });
  }

  private clearDefault(tx: Prisma.TransactionClient, userId: string) {
    return tx.userAddress.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }
}
