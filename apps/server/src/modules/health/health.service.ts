import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getHealth() {
    return {
      status: 'ok',
      service: 'mall-server',
      timestamp: new Date().toISOString(),
    };
  }
}
