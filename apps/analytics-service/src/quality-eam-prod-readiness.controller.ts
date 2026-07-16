import { Controller, Get } from '@nestjs/common';
import { QualityEamProdReadinessService } from './quality-eam-prod-readiness.service';

@Controller()
export class QualityEamProdReadinessController {
  constructor(private readonly qualityEam: QualityEamProdReadinessService) {}

  @Get('platform/quality-eam-prod/readiness')
  readiness() {
    return this.qualityEam.getReadiness();
  }
}
