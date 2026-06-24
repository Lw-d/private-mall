import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

interface UpsertWechatUserInput {
  openId: string;
  unionId?: string;
  nickname?: string;
  avatarUrl?: string;
}

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async upsertWechatUser(input: UpsertWechatUserInput) {
    const nickname = input.nickname?.trim() || undefined;
    const avatarUrl = input.avatarUrl?.trim() || undefined;

    return this.prisma.user.upsert({
      where: {
        openId: input.openId,
      },
      update: {
        unionId: input.unionId,
        nickname,
        avatarUrl,
        lastLoginAt: new Date(),
      },
      create: {
        openId: input.openId,
        unionId: input.unionId,
        nickname,
        avatarUrl,
        lastLoginAt: new Date(),
      },
    });
  }
}
