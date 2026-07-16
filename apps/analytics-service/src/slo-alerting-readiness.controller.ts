import { Controller, Get } from '@nestjs/common';
import { SloAlertingReadinessService } from './slo-alerting-readiness.service';

@Controller()
export class SloAlertingReadinessController {
  constructor(private readonly sloAlerting: SloAlertingReadinessService) {}

  @Get('platform/slo-alerting/readiness')
  readiness() {
    return this.sloAlerting.getReadiness();
  }
}
