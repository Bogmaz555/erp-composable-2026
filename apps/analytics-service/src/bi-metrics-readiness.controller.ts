import { Controller, Get } from '@nestjs/common';
import { BiMetricsReadinessService } from './bi-metrics-readiness.service';

@Controller()
export class BiMetricsReadinessController {
  constructor(private readonly biMetrics: BiMetricsReadinessService) {}

  @Get('platform/bi-metrics/readiness')
  readiness() {
    return this.biMetrics.getReadiness();
  }
}
