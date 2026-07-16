import { Controller, Get } from '@nestjs/common';
import { GrafanaBiReadinessService } from './grafana-bi-readiness.service';

@Controller()
export class GrafanaBiReadinessController {
  constructor(private readonly grafanaBi: GrafanaBiReadinessService) {}

  @Get('platform/grafana-bi/readiness')
  readiness() {
    return this.grafanaBi.getReadiness();
  }
}
