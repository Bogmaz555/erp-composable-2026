import { Controller, Get } from '@nestjs/common';
import { PlmDomainReadinessService } from './plm-domain-readiness.service';

@Controller()
export class PlmDomainReadinessController {
  constructor(private readonly plm: PlmDomainReadinessService) {}

  @Get('platform/plm-domain/readiness')
  readiness() {
    return this.plm.getReadiness();
  }
}
