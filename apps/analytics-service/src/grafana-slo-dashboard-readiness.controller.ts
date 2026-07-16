import { Controller, Get } from '@nestjs/common';
import { GrafanaSloDashboardReadinessService } from './grafana-slo-dashboard-readiness.service';

@Controller()
export class GrafanaSloDashboardReadinessController {
  constructor(private readonly grafanaSlo: GrafanaSloDashboardReadinessService) {}

  @Get('platform/grafana-slo-dashboard/readiness')
  readiness() {
    return this.grafanaSlo.getReadiness();
  }
}
