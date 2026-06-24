import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { UserService } from '../user/user.service';
import { WechatService } from '../wechat/wechat.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { WxLoginDto } from './dto/wx-login.dto';

interface JwtPayload {
  sub: string;
  openId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly wechatService: WechatService,
  ) {}

  async wxLogin(dto: WxLoginDto) {
    const session = await this.wechatService.resolveMiniappSession(dto.code, dto.mockOpenId);
    const user = await this.userService.upsertWechatUser({
      openId: session.openId,
      unionId: dto.unionId ?? session.unionId,
      nickname: dto.nickname,
      avatarUrl: dto.avatarUrl,
    });

    return {
      accessToken: await this.signAccessToken({
        sub: user.id,
        openId: user.openId,
      }),
      refreshToken: await this.signRefreshToken({
        sub: user.id,
        openId: user.openId,
      }),
      user,
    };
  }

  async getProfile(userId: string) {
    return this.userService.findById(userId);
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      const user = await this.userService.findById(payload.sub);

      return {
        accessToken: await this.signAccessToken({
          sub: user.id,
          openId: user.openId,
        }),
        refreshToken: await this.signRefreshToken({
          sub: user.id,
          openId: user.openId,
        }),
        user,
      };
    } catch {
      throw new UnauthorizedException('刷新令牌无效或已过期，请重新登录');
    }
  }

  private signAccessToken(payload: JwtPayload) {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '2h',
    });
  }

  private signRefreshToken(payload: JwtPayload) {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '30d',
    });
  }
}
