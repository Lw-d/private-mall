import { createHmac, randomUUID } from 'node:crypto';

import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ORDER_LOGISTICS_TRACE_STATUSES } from '../order/dto/add-order-logistics-trace.dto';
import {
  LogisticsProvider,
  LogisticsQueryInput,
  LogisticsQueryResult,
  LogisticsTraceResult,
} from './types';

interface HttpJsonLogisticsResponse {
  status?: unknown;
  traces?: unknown;
  rawPayload?: unknown;
  queriedAt?: unknown;
}

interface ProviderErrorInfo {
  code?: LogisticsProviderErrorCode;
  httpStatus?: number;
}

type LogisticsProviderErrorCode =
  | 'LOGISTICS_PROVIDER_MISSING_ENDPOINT'
  | 'LOGISTICS_PROVIDER_HTTP_ERROR'
  | 'LOGISTICS_PROVIDER_INVALID_JSON'
  | 'LOGISTICS_PROVIDER_INVALID_STATUS'
  | 'LOGISTICS_PROVIDER_INVALID_TRACE'
  | 'LOGISTICS_PROVIDER_NO_TRACES'
  | 'LOGISTICS_PROVIDER_QUERY_FAILED'
  | 'LOGISTICS_PROVIDER_TIMEOUT';

@Injectable()
export class HttpJsonLogisticsProvider implements LogisticsProvider {
  private readonly logger = new Logger(HttpJsonLogisticsProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async query(input: LogisticsQueryInput): Promise<LogisticsQueryResult> {
    const endpoint = this.configService.get<string>('LOGISTICS_HTTP_QUERY_URL');

    if (!endpoint) {
      throw new BadRequestException({
        error: {
          code: 'LOGISTICS_PROVIDER_MISSING_ENDPOINT',
          provider: 'http-json',
        },
        message: 'LOGISTICS_HTTP_QUERY_URL is required for http-json provider',
      });
    }

    const requestBody = JSON.stringify({
      logisticsCompany: input.logisticsCompany,
      logisticsCompanyCode: input.logisticsCompanyCode,
      trackingNo: input.trackingNo,
      receiverPhoneTail: input.receiverPhoneTail,
      orderNo: input.orderNo,
      afterSaleNo: input.afterSaleNo,
    });
    const retryAttempts = Math.max(
      0,
      this.configService.get<number>('LOGISTICS_HTTP_RETRY_ATTEMPTS') ?? 0,
    );

    for (let attempt = 0; attempt <= retryAttempts; attempt += 1) {
      try {
        return await this.queryOnce(endpoint, requestBody, input, attempt);
      } catch (error) {
        if (!this.shouldRetry(error, attempt, retryAttempts)) {
          throw error;
        }

        const delayMs = Math.max(
          0,
          this.configService.get<number>('LOGISTICS_HTTP_RETRY_DELAY_MS') ?? 300,
        );

        this.logger.warn(
          `Retrying logistics provider query ${JSON.stringify({
            ...this.createLogContext(endpoint, input),
            attempt: attempt + 1,
            code: this.resolveProviderErrorInfo(error).code,
            nextAttempt: attempt + 2,
            retryDelayMs: delayMs,
          })}`,
        );

        await this.delay(delayMs);
      }
    }

    throw this.createProviderException(
      'LOGISTICS_PROVIDER_QUERY_FAILED',
      'Logistics provider query failed',
    );
  }

  private async queryOnce(
    endpoint: string,
    requestBody: string,
    input: LogisticsQueryInput,
    attempt: number,
  ) {
    const timeoutMs = this.configService.get<number>('LOGISTICS_HTTP_TIMEOUT_MS') ?? 5000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      this.logger.debug(
        `Querying logistics provider ${JSON.stringify({
          ...this.createLogContext(endpoint, input),
          attempt: attempt + 1,
        })}`,
      );

      const response = await fetch(endpoint, {
        body: requestBody,
        headers: this.buildHeaders(requestBody),
        method: 'POST',
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.warn(
          `Logistics provider returned non-2xx ${JSON.stringify({
            ...this.createLogContext(endpoint, input),
            attempt: attempt + 1,
            status: response.status,
          })}`,
        );
        throw this.createProviderException(
          'LOGISTICS_PROVIDER_HTTP_ERROR',
          `Logistics provider returned ${response.status}`,
          {
            httpStatus: response.status,
          },
        );
      }

      const payload = await this.parseResponseJson(response);

      return this.normalizeResponse(payload);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) {
        throw error;
      }

      const code =
        error instanceof Error && error.name === 'AbortError'
          ? 'LOGISTICS_PROVIDER_TIMEOUT'
          : 'LOGISTICS_PROVIDER_QUERY_FAILED';
      this.logger.warn(
        `Logistics provider query failed ${JSON.stringify({
          ...this.createLogContext(endpoint, input),
          attempt: attempt + 1,
          code,
          reason: error instanceof Error ? error.message : String(error),
        })}`,
      );
      throw this.createProviderException(code, 'Logistics provider query failed');
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildHeaders(requestBody: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = this.configService.get<string>('LOGISTICS_HTTP_AUTH_TOKEN');

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const signingSecret = this.configService.get<string>('LOGISTICS_HTTP_SIGNING_SECRET');

    if (signingSecret) {
      const timestamp = new Date().toISOString();
      const nonce = randomUUID();

      headers['X-Logistics-Signature-Version'] = 'hmac-sha256-v1';
      headers['X-Logistics-Timestamp'] = timestamp;
      headers['X-Logistics-Nonce'] = nonce;
      headers['X-Logistics-Signature'] = createHmac('sha256', signingSecret)
        .update(`${timestamp}.${nonce}.${requestBody}`)
        .digest('hex');
    }

    return headers;
  }

  private async parseResponseJson(response: Response): Promise<HttpJsonLogisticsResponse> {
    try {
      return (await response.json()) as HttpJsonLogisticsResponse;
    } catch {
      throw this.createProviderException(
        'LOGISTICS_PROVIDER_INVALID_JSON',
        'Logistics provider returned invalid JSON',
      );
    }
  }

  private normalizeResponse(payload: HttpJsonLogisticsResponse): LogisticsQueryResult {
    const traces = this.normalizeTraces(payload.traces);

    if (traces.length === 0) {
      throw this.createProviderException(
        'LOGISTICS_PROVIDER_NO_TRACES',
        'Logistics provider returned no traces',
      );
    }

    const status = this.normalizeStatus(payload.status ?? traces[traces.length - 1].status);

    return {
      status,
      traces,
      rawPayload: payload.rawPayload ?? payload,
      queriedAt: this.normalizeDate(payload.queriedAt) ?? new Date(),
    };
  }

  private normalizeTraces(value: unknown): LogisticsTraceResult[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((trace) => {
      const record = this.asRecord(trace);
      const status = this.normalizeStatus(record.status);
      const content = typeof record.content === 'string' ? record.content.trim() : '';
      const occurredAt = this.normalizeDate(record.occurredAt);

      if (!content || !occurredAt) {
        throw this.createProviderException(
          'LOGISTICS_PROVIDER_INVALID_TRACE',
          'Logistics provider returned invalid trace',
        );
      }

      return {
        status,
        content,
        occurredAt,
      };
    });
  }

  private normalizeStatus(value: unknown) {
    if (
      typeof value === 'string' &&
      ORDER_LOGISTICS_TRACE_STATUSES.includes(
        value as (typeof ORDER_LOGISTICS_TRACE_STATUSES)[number],
      )
    ) {
      return value as (typeof ORDER_LOGISTICS_TRACE_STATUSES)[number];
    }

    throw this.createProviderException(
      'LOGISTICS_PROVIDER_INVALID_STATUS',
      'Logistics provider returned invalid status',
    );
  }

  private normalizeDate(value: unknown) {
    if (typeof value !== 'string' && !(value instanceof Date)) {
      return undefined;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private asRecord(value: unknown) {
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  }

  private createProviderException(
    code: LogisticsProviderErrorCode,
    message: string,
    extra?: Record<string, unknown>,
  ) {
    return new ServiceUnavailableException({
      error: {
        code,
        provider: 'http-json',
        ...extra,
      },
      message,
    });
  }

  private createLogContext(endpoint: string, input: LogisticsQueryInput) {
    return {
      afterSaleNo: input.afterSaleNo,
      endpointHost: this.resolveEndpointHost(endpoint),
      orderNo: input.orderNo,
      provider: 'http-json',
      trackingNoTail: input.trackingNo.slice(-4),
    };
  }

  private resolveEndpointHost(endpoint: string) {
    try {
      return new URL(endpoint).host;
    } catch {
      return 'invalid-endpoint';
    }
  }

  private shouldRetry(error: unknown, attempt: number, retryAttempts: number) {
    if (attempt >= retryAttempts) {
      return false;
    }

    const { code, httpStatus } = this.resolveProviderErrorInfo(error);

    if (code === 'LOGISTICS_PROVIDER_TIMEOUT' || code === 'LOGISTICS_PROVIDER_QUERY_FAILED') {
      return true;
    }

    return code === 'LOGISTICS_PROVIDER_HTTP_ERROR' && !!httpStatus && httpStatus >= 500;
  }

  private resolveProviderErrorInfo(error: unknown): ProviderErrorInfo {
    if (!(error instanceof ServiceUnavailableException)) {
      return {};
    }

    const response = error.getResponse();

    if (typeof response !== 'object' || response === null || !('error' in response)) {
      return {};
    }

    const providerError = (response as { error?: unknown }).error;

    if (typeof providerError !== 'object' || providerError === null) {
      return {};
    }

    return {
      code: (providerError as { code?: LogisticsProviderErrorCode }).code,
      httpStatus: (providerError as { httpStatus?: number }).httpStatus,
    };
  }

  private async delay(delayMs: number) {
    if (delayMs <= 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}
