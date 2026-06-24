import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { HttpJsonLogisticsProvider } from './http-json-logistics.provider';
import { MockLogisticsProvider } from './mock-logistics.provider';
import { LogisticsProvider, LogisticsQueryInput } from './types';

@Injectable()
export class LogisticsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpJsonProvider: HttpJsonLogisticsProvider,
    private readonly mockProvider: MockLogisticsProvider,
  ) {}

  query(input: Omit<LogisticsQueryInput, 'provider'>) {
    const providerName = this.configService.get<string>('LOGISTICS_PROVIDER') ?? 'mock';
    const provider = this.resolveProvider(providerName);

    return provider.query({
      ...input,
      provider: providerName,
    });
  }

  private resolveProvider(providerName: string): LogisticsProvider {
    if (providerName === 'mock') {
      return this.mockProvider;
    }

    if (providerName === 'http-json') {
      return this.httpJsonProvider;
    }

    throw new BadRequestException(`Unsupported logistics provider: ${providerName}`);
  }
}
