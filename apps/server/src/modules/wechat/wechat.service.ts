import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDecipheriv, createSign, createVerify, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

import { WechatPayException } from './wechat-pay.exception';

type WechatLoginMode = 'mock' | 'real';
type WechatPayMode = 'mock' | 'real';

interface WechatCodeSessionResponse {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

interface WechatSession {
  openId: string;
  unionId?: string;
}

interface WechatJsapiPrepayInput {
  orderNo: string;
  description: string;
  amountCents: number;
  openId: string;
}

interface WechatJsapiPrepayResponse {
  prepay_id?: string;
  code?: string;
  message?: string;
  detail?: unknown;
}

interface WechatPayConfig {
  appId: string;
  mchId: string;
  serialNo: string;
  privateKey: string;
  notifyUrl: string;
  refundNotifyUrl: string;
  apiBaseUrl: string;
}

interface WechatRefundInput {
  amountCents: number;
  orderNo: string;
  reason?: string;
  refundNo: string;
  totalAmountCents: number;
}

interface WechatRefundResponse {
  out_refund_no?: string;
  refund_id?: string;
  status?: string;
  code?: string;
  message?: string;
  detail?: unknown;
}

interface WechatPayNotifyContext {
  headers: Record<string, string | string[] | undefined>;
  rawBody?: string;
  payload: unknown;
}

interface WechatPayEncryptedResource {
  algorithm: string;
  ciphertext: string;
  nonce: string;
  associated_data?: string;
}

interface WechatPayTransaction {
  out_trade_no?: string;
  transaction_id?: string;
  trade_state?: string;
  amount?: {
    total?: number;
    payer_total?: number;
  };
}

interface WechatPayRefundTransaction {
  out_refund_no?: string;
  refund_id?: string;
  out_trade_no?: string;
  transaction_id?: string;
  refund_status?: string;
  amount?: {
    refund?: number;
    payer_refund?: number;
  };
}

interface WechatPaySignedMessage {
  headers: Record<string, string | string[] | undefined>;
  body?: string;
  usage: string;
}

@Injectable()
export class WechatService {
  constructor(private readonly configService: ConfigService) {}

  async resolveMiniappSession(code: string, mockOpenId?: string): Promise<WechatSession> {
    if (this.getLoginMode() === 'mock') {
      return {
        openId: mockOpenId ?? `mock_wx_${code}`,
      };
    }

    return this.fetchCodeSession(code);
  }

  getMiniappAppId() {
    return this.configService.get<string>('WECHAT_MINIAPP_APP_ID') || 'mock-app-id';
  }

  getPayMode(): WechatPayMode {
    const mode = this.configService.get<string>('WECHAT_PAY_MODE') ?? 'mock';

    return mode === 'real' ? 'real' : 'mock';
  }

  async createJsapiPrepay(input: WechatJsapiPrepayInput) {
    const config = await this.getWechatPayConfig();
    const body = JSON.stringify({
      appid: config.appId,
      mchid: config.mchId,
      description: input.description,
      out_trade_no: input.orderNo,
      notify_url: config.notifyUrl,
      amount: {
        total: input.amountCents,
        currency: 'CNY',
      },
      payer: {
        openid: input.openId,
      },
    });
    const method = 'POST';
    const requestPath = '/v3/pay/transactions/jsapi';
    const response = await fetch(`${config.apiBaseUrl}${requestPath}`, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: this.buildWechatPayAuthorization({
          body,
          config,
          method,
          requestPath,
        }),
        'Content-Type': 'application/json',
      },
      body,
    });
    const responseBody = await response.text();
    const payload = this.parseWechatPayJson(responseBody);

    if (!response.ok || !payload?.prepay_id) {
      throw new WechatPayException(
        {
          code: payload?.code,
          message: payload?.message,
          detail: payload?.detail,
          status: response.status,
        },
        'Wechat Pay JSAPI prepay failed',
      );
    }

    this.verifyWechatPaySignature({
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
      usage: 'prepay response',
    });

    return payload.prepay_id;
  }

  async createRefund(input: WechatRefundInput) {
    const config = await this.getWechatPayConfig();
    const body = JSON.stringify({
      out_trade_no: input.orderNo,
      out_refund_no: input.refundNo,
      reason: input.reason,
      notify_url: config.refundNotifyUrl,
      amount: {
        refund: input.amountCents,
        total: input.totalAmountCents,
        currency: 'CNY',
      },
    });
    const method = 'POST';
    const requestPath = '/v3/refund/domestic/refunds';
    const response = await fetch(`${config.apiBaseUrl}${requestPath}`, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: this.buildWechatPayAuthorization({
          body,
          config,
          method,
          requestPath,
        }),
        'Content-Type': 'application/json',
      },
      body,
    });
    const responseBody = await response.text();
    const payload = this.parseWechatRefundJson(responseBody);

    if (!response.ok || !payload?.out_refund_no) {
      throw new WechatPayException(
        {
          code: payload?.code,
          message: payload?.message,
          detail: payload?.detail,
          status: response.status,
        },
        'Wechat Pay refund request failed',
      );
    }

    this.verifyWechatPaySignature({
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
      usage: 'refund response',
    });

    return payload;
  }

  async createJsapiPaymentParams(prepayId: string) {
    const appId = this.getMiniappAppId();
    const privateKey = await this.readWechatPayPrivateKey();
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.createNonce();
    const packageValue = `prepay_id=${prepayId}`;
    const paySign = this.signWithPrivateKey(
      [appId, timeStamp, nonceStr, packageValue, ''].join('\n'),
      privateKey,
    );

    return {
      appId,
      timeStamp,
      nonceStr,
      package: packageValue,
      signType: 'RSA',
      paySign,
    };
  }

  async parsePaymentNotify(context: WechatPayNotifyContext): Promise<WechatPayTransaction> {
    this.verifyWechatPaySignature({
      headers: context.headers,
      body: context.rawBody,
      usage: 'notify',
    });

    const resource = this.getEncryptedResource(context.payload);
    const plaintext = this.decryptPaymentResource(resource);

    try {
      return JSON.parse(plaintext) as WechatPayTransaction;
    } catch {
      throw new BadRequestException('Wechat Pay notify resource is not valid JSON');
    }
  }

  async parseRefundNotify(context: WechatPayNotifyContext): Promise<WechatPayRefundTransaction> {
    this.verifyWechatPaySignature({
      headers: context.headers,
      body: context.rawBody,
      usage: 'refund notify',
    });

    const resource = this.getEncryptedResource(context.payload);
    const plaintext = this.decryptPaymentResource(resource);

    try {
      return JSON.parse(plaintext) as WechatPayRefundTransaction;
    } catch {
      throw new BadRequestException('Wechat Pay refund notify resource is not valid JSON');
    }
  }

  private getLoginMode(): WechatLoginMode {
    const mode = this.configService.get<string>('WECHAT_LOGIN_MODE') ?? 'mock';

    return mode === 'real' ? 'real' : 'mock';
  }

  private async fetchCodeSession(code: string): Promise<WechatSession> {
    const appId = this.configService.get<string>('WECHAT_MINIAPP_APP_ID');
    const secret = this.configService.get<string>('WECHAT_MINIAPP_SECRET');

    if (!appId || !secret) {
      throw new InternalServerErrorException('Wechat miniapp credentials are not configured');
    }

    const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
    url.searchParams.set('appid', appId);
    url.searchParams.set('secret', secret);
    url.searchParams.set('js_code', code);
    url.searchParams.set('grant_type', 'authorization_code');

    let payload: WechatCodeSessionResponse;

    try {
      const response = await fetch(url);
      payload = (await response.json()) as WechatCodeSessionResponse;
    } catch {
      throw new BadGatewayException('Wechat code2Session request failed');
    }

    if (payload.errcode) {
      throw new UnauthorizedException(
        payload.errmsg ? `微信登录失败：${payload.errmsg}` : '微信登录失败，请重试',
      );
    }

    if (!payload.openid) {
      throw new UnauthorizedException('微信登录失败：未获取到用户标识');
    }

    return {
      openId: payload.openid,
      unionId: payload.unionid,
    };
  }

  private async getWechatPayConfig(): Promise<WechatPayConfig> {
    const appId = this.configService.get<string>('WECHAT_MINIAPP_APP_ID');
    const mchId = this.configService.get<string>('WECHAT_PAY_MCH_ID');
    const serialNo = this.configService.get<string>('WECHAT_PAY_SERIAL_NO');
    const notifyUrl = this.configService.get<string>('WECHAT_PAY_NOTIFY_URL');

    if (!appId || !mchId || !serialNo || !notifyUrl) {
      throw new InternalServerErrorException('Wechat Pay credentials are not configured');
    }

    return {
      appId,
      mchId,
      serialNo,
      privateKey: await this.readWechatPayPrivateKey(),
      notifyUrl,
      refundNotifyUrl: this.resolveRefundNotifyUrl(notifyUrl),
      apiBaseUrl:
        this.configService.get<string>('WECHAT_PAY_API_BASE_URL') ??
        'https://api.mch.weixin.qq.com',
    };
  }

  private resolveRefundNotifyUrl(paymentNotifyUrl: string) {
    const refundNotifyUrl = this.configService.get<string>('WECHAT_PAY_REFUND_NOTIFY_URL');

    if (refundNotifyUrl) {
      return refundNotifyUrl;
    }

    return paymentNotifyUrl.replace('/api/payments/wechat/notify', '/api/refunds/wechat/notify');
  }

  private async readWechatPayPrivateKey() {
    const privateKeyPath = this.configService.get<string>('WECHAT_PAY_PRIVATE_KEY_PATH');

    if (!privateKeyPath) {
      throw new InternalServerErrorException('Wechat Pay private key path is not configured');
    }

    try {
      return await readFile(privateKeyPath, 'utf8');
    } catch {
      throw new InternalServerErrorException('Wechat Pay private key cannot be read');
    }
  }

  private verifyWechatPaySignature(message: WechatPaySignedMessage) {
    const timestamp = this.readHeader(message.headers, 'wechatpay-timestamp');
    const nonce = this.readHeader(message.headers, 'wechatpay-nonce');
    const signature = this.readHeader(message.headers, 'wechatpay-signature');
    const serial = this.readHeader(message.headers, 'wechatpay-serial');
    const platformSerial = this.configService.get<string>('WECHAT_PAY_PLATFORM_SERIAL_NO');
    const publicKeyPath = this.configService.get<string>('WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH');

    if (!timestamp || !nonce || !signature || !serial || !message.body) {
      throw new UnauthorizedException(`微信支付${message.usage}签名请求头缺失`);
    }

    if (platformSerial && platformSerial !== serial) {
      throw new UnauthorizedException(`微信支付${message.usage}证书序列号不匹配`);
    }

    if (!publicKeyPath) {
      throw new InternalServerErrorException('Wechat Pay platform public key is not configured');
    }

    const publicKey = this.readPublicKeySync(publicKeyPath);
    const verify = createVerify('RSA-SHA256');
    verify.update([timestamp, nonce, message.body, ''].join('\n'));

    if (!verify.verify(publicKey, signature, 'base64')) {
      throw new UnauthorizedException(`微信支付${message.usage}签名无效`);
    }
  }

  private getEncryptedResource(payload: unknown): WechatPayEncryptedResource {
    const resource = this.asRecord(this.asRecord(payload).resource);
    const algorithm = this.asString(resource.algorithm);
    const ciphertext = this.asString(resource.ciphertext);
    const nonce = this.asString(resource.nonce);
    const associatedData = this.asString(resource.associated_data);

    if (algorithm !== 'AEAD_AES_256_GCM' || !ciphertext || !nonce) {
      throw new BadRequestException('Wechat Pay notify resource is invalid');
    }

    return {
      algorithm,
      ciphertext,
      nonce,
      associated_data: associatedData,
    };
  }

  private decryptPaymentResource(resource: WechatPayEncryptedResource) {
    const apiV3Key = this.configService.get<string>('WECHAT_PAY_API_V3_KEY');

    if (!apiV3Key || Buffer.byteLength(apiV3Key) !== 32) {
      throw new InternalServerErrorException('Wechat Pay API v3 key is not configured');
    }

    const ciphertext = Buffer.from(resource.ciphertext, 'base64');
    const authTag = ciphertext.subarray(ciphertext.length - 16);
    const encrypted = ciphertext.subarray(0, ciphertext.length - 16);
    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(apiV3Key), resource.nonce);

    if (resource.associated_data) {
      decipher.setAAD(Buffer.from(resource.associated_data));
    }

    decipher.setAuthTag(authTag);

    try {
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    } catch {
      throw new BadRequestException('Wechat Pay notify resource decrypt failed');
    }
  }

  private buildWechatPayAuthorization(input: {
    method: string;
    requestPath: string;
    body: string;
    config: WechatPayConfig;
  }) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.createNonce();
    const signature = this.signWithPrivateKey(
      [input.method, input.requestPath, timestamp, nonceStr, input.body, ''].join('\n'),
      input.config.privateKey,
    );

    return [
      'WECHATPAY2-SHA256-RSA2048',
      `mchid="${input.config.mchId}"`,
      `nonce_str="${nonceStr}"`,
      `signature="${signature}"`,
      `timestamp="${timestamp}"`,
      `serial_no="${input.config.serialNo}"`,
    ].join(',');
  }

  private signWithPrivateKey(message: string, privateKey: string) {
    return createSign('RSA-SHA256').update(message).sign(privateKey, 'base64');
  }

  private createNonce() {
    return randomBytes(16).toString('hex');
  }

  private parseWechatPayJson(body: string): WechatJsapiPrepayResponse | undefined {
    if (!body) {
      return undefined;
    }

    try {
      return JSON.parse(body) as WechatJsapiPrepayResponse;
    } catch {
      throw new WechatPayException(
        {
          message: 'Wechat Pay response is not valid JSON',
        },
        'Wechat Pay JSAPI prepay failed',
      );
    }
  }

  private parseWechatRefundJson(body: string): WechatRefundResponse | undefined {
    if (!body) {
      return undefined;
    }

    try {
      return JSON.parse(body) as WechatRefundResponse;
    } catch {
      throw new WechatPayException(
        {
          message: 'Wechat Pay refund response is not valid JSON',
        },
        'Wechat Pay refund request failed',
      );
    }
  }

  private readHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ): string | undefined {
    const value = headers[name] ?? headers[name.toLowerCase()];

    return Array.isArray(value) ? value[0] : value;
  }

  private readPublicKeySync(publicKeyPath: string) {
    try {
      return readFileSync(publicKeyPath, 'utf8');
    } catch {
      throw new InternalServerErrorException('Wechat Pay platform public key cannot be read');
    }
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  }

  private asString(value: unknown) {
    return typeof value === 'string' ? value : undefined;
  }
}
