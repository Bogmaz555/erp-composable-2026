import { Controller, Get } from '@nestjs/common';
import { ProdObservabilityReadinessService } from './prod-observability-readiness.service';

@Controller()
export class ProdObservabilityReadinessController {
  constructor(private readonly prodObs: ProdObservabilityReadinessService) {}

  @Get('platform/prod-observability/readiness')
  readiness() {
    return this.prodObs.getReadiness();
  }
}
