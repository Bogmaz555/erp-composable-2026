import { Controller, Get } from '@nestjs/common';
import { EamDomainReadinessService } from './eam-domain-readiness.service';

@Controller()
export class EamDomainReadinessController {
  constructor(private readonly eam: EamDomainReadinessService) {}

  @Get('platform/eam-domain/readiness')
  readiness() {
    return this.eam.getReadiness();
  }
}
