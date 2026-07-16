import { Controller, Get } from '@nestjs/common';
import { TaxReadinessService } from './tax-readiness.service';

@Controller()
export class TaxReadinessController {
  constructor(private readonly tax: TaxReadinessService) {}

  @Get('platform/tax/readiness')
  readiness() {
    return this.tax.getReadiness();
  }
}
