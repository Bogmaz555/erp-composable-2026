import { Controller, Get } from '@nestjs/common';
import { FinanceDomainReadinessService } from './finance-domain-readiness.service';

@Controller()
export class FinanceDomainReadinessController {
  constructor(private readonly finance: FinanceDomainReadinessService) {}

  @Get('platform/finance-domain/readiness')
  readiness() {
    return this.finance.getReadiness();
  }
}
