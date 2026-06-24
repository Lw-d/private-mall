import { Module } from '@nestjs/common';

import { HttpJsonLogisticsProvider } from './http-json-logistics.provider';
import { LogisticsService } from './logistics.service';
import { MockLogisticsProvider } from './mock-logistics.provider';

@Module({
  providers: [HttpJsonLogisticsProvider, LogisticsService, MockLogisticsProvider],
  exports: [LogisticsService],
})
export class LogisticsModule {}
