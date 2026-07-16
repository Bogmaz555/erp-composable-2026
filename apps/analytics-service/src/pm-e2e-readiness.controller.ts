import { Controller, Get } from '@nestjs/common';
import { PmE2eReadinessService } from './pm-e2e-readiness.service';

@Controller()
export class PmE2eReadinessController {
  constructor(private readonly pmE2e: PmE2eReadinessService) {}

  @Get('platform/pm-e2e/readiness')
  readiness() {
    return this.pmE2e.getReadiness();
  }
}
