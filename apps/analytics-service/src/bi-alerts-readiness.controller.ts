import { Controller, Get } from '@nestjs/common';
import { BiAlertsReadinessService } from './bi-alerts-readiness.service';

@Controller()
export class BiAlertsReadinessController {
  constructor(private readonly biAlerts: BiAlertsReadinessService) {}

  @Get('platform/bi-alerts/readiness')
  readiness() {
    return this.biAlerts.getReadiness();
  }
}
