import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { AdminRole, AdminStatus } from '../../generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';

interface AdminJwtPayload {
  sub: string;
  username: string;
  role: AdminRole;
  type: 'admin';
}

@Injectable()
export class AdminService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async login(dto: AdminLoginDto) {
    await this.ensureDefaultAdmin();

    const admin = await this.prisma.admin.findUnique({
      where: { username: dto.username },
    });

    if (!admin || admin.status !== AdminStatus.ACTIVE) {
      throw new UnauthorizedException('账号或密码错误');
    }

    if (!this.verifyPassword(dto.password, admin.passwordHash)) {
      throw new UnauthorizedException('账号或密码错误');
    }

    const updatedAdmin = await this.prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken: await this.signAccessToken({
        sub: updatedAdmin.id,
        username: updatedAdmin.username,
        role: updatedAdmin.role,
        type: 'admin',
      }),
      admin: this.toSafeAdmin(updatedAdmin),
    };
  }

  async findActiveById(id: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
    });

    if (!admin || admin.status !== AdminStatus.ACTIVE) {
      throw new UnauthorizedException('登录已失效，请重新登录');
    }

    return admin;
  }

  async getProfile(id: string) {
    const admin = await this.findActiveById(id);
    return this.toSafeAdmin(admin);
  }

  private async ensureDefaultAdmin() {
    const count = await this.prisma.admin.count();

    if (count > 0) {
      return;
    }

    const username = this.configService.get<string>('ADMIN_DEFAULT_USERNAME') ?? 'admin';
    const password = this.configService.get<string>('ADMIN_DEFAULT_PASSWORD') ?? 'Admin123456';

    await this.prisma.admin.create({
      data: {
        username,
        passwordHash: this.hashPassword(password),
        nickname: '超级管理员',
        role: AdminRole.SUPER_ADMIN,
      },
    });
  }

  private signAccessToken(payload: AdminJwtPayload) {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '2h',
    });
  }

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, storedHash: string) {
    const [salt, hash] = storedHash.split(':');

    if (!salt || !hash) {
      return false;
    }

    const hashedPassword = scryptSync(password, salt, 64);
    const storedPassword = Buffer.from(hash, 'hex');

    return (
      hashedPassword.length === storedPassword.length &&
      timingSafeEqual(hashedPassword, storedPassword)
    );
  }

  private toSafeAdmin(admin: {
    id: string;
    username: string;
    nickname: string | null;
    role: AdminRole;
    status: AdminStatus;
    lastLoginAt: Date | null;
  }) {
    return {
      id: admin.id,
      username: admin.username,
      nickname: admin.nickname,
      role: admin.role,
      status: admin.status,
      lastLoginAt: admin.lastLoginAt,
    };
  }
}
