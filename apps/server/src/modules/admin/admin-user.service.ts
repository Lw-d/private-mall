import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { QueryAdminUsersDto } from './dto/query-admin-users.dto';

@Injectable()
export class AdminUserService {
  constructor(private readonly prisma: PrismaService) {}

  findMany(query: QueryAdminUsersDto) {
    return this.prisma.user.findMany({
      where: query.keyword
        ? {
            OR: [
              {
                openId: {
                  contains: query.keyword,
                },
              },
              {
                nickname: {
                  contains: query.keyword,
                },
              },
              {
                phone: {
                  contains: query.keyword,
                },
              },
            ],
          }
        : undefined,
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
  }
}
