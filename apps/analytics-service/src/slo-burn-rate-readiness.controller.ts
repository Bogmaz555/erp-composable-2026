import { Controller, Get } from '@nestjs/common';
import { SloBurnRateReadinessService } from './slo-burn-rate-readiness.service';

@Controller()
export class SloBurnRateReadinessController {
  constructor(private readonly sloBurnRate: SloBurnRateReadinessService) {}

  @Get('platform/slo-burn-rate/readiness')
  readiness() {
    return this.sloBurnRate.getReadiness();
  }
}
