import { Controller, Get } from '@nestjs/common';
import { MesDomainReadinessService } from './mes-domain-readiness.service';

@Controller()
export class MesDomainReadinessController {
  constructor(private readonly mes: MesDomainReadinessService) {}

  @Get('platform/mes-domain/readiness')
  readiness() {
    return this.mes.getReadiness();
  }
}
