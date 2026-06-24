import { OrderLogisticsTraceStatus } from '../order/dto/add-order-logistics-trace.dto';

export interface LogisticsQueryInput {
  provider: string;
  logisticsCompany?: string | null;
  logisticsCompanyCode?: string | null;
  trackingNo: string;
  receiverPhoneTail?: string | null;
  orderNo?: string | null;
  afterSaleNo?: string | null;
  shippedAt?: Date | null;
}

export interface LogisticsTraceResult {
  status: OrderLogisticsTraceStatus;
  content: string;
  occurredAt: Date;
}

export interface LogisticsQueryResult {
  status: OrderLogisticsTraceStatus;
  traces: LogisticsTraceResult[];
  rawPayload?: unknown;
  queriedAt: Date;
}

export interface LogisticsProvider {
  query(input: LogisticsQueryInput): Promise<LogisticsQueryResult>;
}
