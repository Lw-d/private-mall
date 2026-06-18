import { BadGatewayException } from '@nestjs/common';

interface WechatPayErrorPayload {
  code?: string;
  message?: string;
  detail?: unknown;
  status?: number;
}

export class WechatPayException extends BadGatewayException {
  constructor(payload: WechatPayErrorPayload, fallbackMessage: string) {
    super({
      message: payload.message || fallbackMessage,
      error: {
        upstream: 'wechat-pay',
        wechatCode: payload.code,
        status: payload.status,
        detail: payload.detail,
      },
    });
  }
}
