import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';
import { UpdatePointRedeemRuleDto } from './dto/update-point-redeem-rule.dto';

const DEFAULT_POINTS_PER_YUAN = 100;
const DEFAULT_RULE_ID = 'default';

@Injectable()
export class PointService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  findLedger(userId: string) {
    return this.prisma.pointLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getRedeemRules() {
    const rule = await this.prisma.pointRedeemRule.findUnique({
      where: { id: DEFAULT_RULE_ID },
    });

    if (rule) {
      return {
        enabled: rule.enabled,
        pointsPerYuan: rule.pointsPerYuan,
        source: 'database' as const,
        updatedAt: rule.updatedAt,
      };
    }

    const pointsPerYuan =
      this.configService.get<number>('POINTS_REDEEM_POINTS_PER_YUAN') ?? DEFAULT_POINTS_PER_YUAN;

    return {
      enabled: pointsPerYuan > 0,
      pointsPerYuan,
      source: 'env' as const,
      updatedAt: null,
    };
  }

  async updateRedeemRules(dto: UpdatePointRedeemRuleDto) {
    const rule = await this.prisma.pointRedeemRule.upsert({
      where: { id: DEFAULT_RULE_ID },
      create: {
        id: DEFAULT_RULE_ID,
        enabled: dto.enabled ?? true,
        pointsPerYuan: dto.pointsPerYuan,
      },
      update: {
        enabled: dto.enabled ?? true,
        pointsPerYuan: dto.pointsPerYuan,
      },
    });

    return {
      enabled: rule.enabled,
      pointsPerYuan: rule.pointsPerYuan,
      source: 'database' as const,
      updatedAt: rule.updatedAt,
    };
  }

  async resetRedeemRules() {
    await this.prisma.pointRedeemRule.deleteMany({
      where: { id: DEFAULT_RULE_ID },
    });

    return this.getRedeemRules();
  }
}
