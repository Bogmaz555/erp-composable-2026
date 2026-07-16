import { Controller, Get } from '@nestjs/common';
import { QualityDomainReadinessService } from './quality-domain-readiness.service';

@Controller()
export class QualityDomainReadinessController {
  constructor(private readonly quality: QualityDomainReadinessService) {}

  @Get('platform/quality-domain/readiness')
  readiness() {
    return this.quality.getReadiness();
  }
}
