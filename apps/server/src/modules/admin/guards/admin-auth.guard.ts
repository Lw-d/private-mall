import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AdminRole } from '../../../generated/prisma/client';

import { AdminService } from '../admin.service';
import { AuthenticatedAdmin } from '../types/authenticated-admin';

interface AdminJwtPayload {
  sub: string;
  username: string;
  role: AdminRole;
  type: 'admin';
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      admin?: AuthenticatedAdmin;
      headers: Record<string, string | string[] | undefined>;
    }>();
    const token = this.extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException('Missing admin bearer token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AdminJwtPayload>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      if (payload.type !== 'admin') {
        throw new UnauthorizedException('Invalid admin bearer token');
      }

      const admin = await this.adminService.findActiveById(payload.sub);
      request.admin = {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid admin bearer token');
    }
  }

  private extractBearerToken(authorization?: string | string[]) {
    const value = Array.isArray(authorization) ? authorization[0] : authorization;

    if (!value) {
      return undefined;
    }

    const [type, token] = value.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
