import { Controller, Get } from '@nestjs/common';
import { GrafanaProvisionReadinessService } from './grafana-provision-readiness.service';

@Controller()
export class GrafanaProvisionReadinessController {
  constructor(private readonly grafanaProvision: GrafanaProvisionReadinessService) {}

  @Get('platform/grafana-provision/readiness')
  readiness() {
    return this.grafanaProvision.getReadiness();
  }
}
