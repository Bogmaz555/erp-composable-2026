import { Controller, Get } from '@nestjs/common';
import { ProcDomainReadinessService } from './proc-domain-readiness.service';

@Controller()
export class ProcDomainReadinessController {
  constructor(private readonly proc: ProcDomainReadinessService) {}

  @Get('platform/proc-domain/readiness')
  readiness() {
    return this.proc.getReadiness();
  }
}
