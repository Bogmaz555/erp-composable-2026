import { Controller, Get } from '@nestjs/common';
import { KsefProdReadinessService } from './ksef-prod-readiness.service';

@Controller()
export class KsefProdReadinessController {
  constructor(private readonly ksefProd: KsefProdReadinessService) {}

  @Get('platform/ksef-prod/readiness')
  readiness() {
    return this.ksefProd.getReadiness();
  }
}
