import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ApiWrappedOkResponse } from '../common/decorators/api-wrapped-ok-response.decorator';
import { HealthResponseDto } from './dto/health-response.dto';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiWrappedOkResponse({
    type: HealthResponseDto,
    description: 'Returns API health status.',
  })
  getHealth() {
    return this.healthService.getHealth();
  }
}
