import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { UserService } from '../../user/user.service';
import { AuthenticatedUser } from '../types/authenticated-user';

interface JwtPayload {
  sub: string;
  openId: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: AuthenticatedUser;
    }>();
    const token = this.extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
      const user = await this.userService.findById(payload.sub);
      request.user = {
        id: user.id,
        openId: user.openId,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid bearer token');
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
