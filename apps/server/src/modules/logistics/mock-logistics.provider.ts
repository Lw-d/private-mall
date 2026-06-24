import { Injectable } from '@nestjs/common';

import {
  LogisticsProvider,
  LogisticsQueryInput,
  LogisticsQueryResult,
  LogisticsTraceResult,
} from './types';

@Injectable()
export class MockLogisticsProvider implements LogisticsProvider {
  async query(input: LogisticsQueryInput): Promise<LogisticsQueryResult> {
    const baseTime = input.shippedAt ?? new Date();
    const normalizedTrackingNo = input.trackingNo.trim().toUpperCase();
    const isException =
      normalizedTrackingNo.includes('EXCEPTION') || normalizedTrackingNo.endsWith('EX');
    const traces: LogisticsTraceResult[] = isException
      ? [
          {
            status: 'SHIPPED',
            content: '商家已发货，包裹等待揽收',
            occurredAt: baseTime,
          },
          {
            status: 'EXCEPTION',
            content: '物流服务商反馈运单异常，请商家核对物流单号',
            occurredAt: this.addMinutes(baseTime, 30),
          },
        ]
      : [
          {
            status: 'SHIPPED',
            content: '商家已发货，包裹等待揽收',
            occurredAt: baseTime,
          },
          {
            status: 'PICKED_UP',
            content: '快递员已揽收包裹',
            occurredAt: this.addMinutes(baseTime, 20),
          },
          {
            status: 'IN_TRANSIT',
            content: '包裹正在发往下一站',
            occurredAt: this.addHours(baseTime, 2),
          },
        ];

    return {
      status: traces[traces.length - 1].status,
      traces,
      queriedAt: new Date(),
      rawPayload: {
        provider: input.provider,
        logisticsCompany: input.logisticsCompany,
        trackingNo: input.trackingNo,
        orderNo: input.orderNo,
        mode: 'mock',
      },
    };
  }

  private addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  private addHours(date: Date, hours: number) {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  }
}
