import { Controller, Get } from '@nestjs/common';
import { BiReadinessService } from './bi-readiness.service';

@Controller()
export class BiReadinessController {
  constructor(private readonly bi: BiReadinessService) {}

  @Get('platform/bi-readiness/readiness')
  readiness() {
    return this.bi.getReadiness();
  }
}
