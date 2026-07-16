import { Controller, Get } from '@nestjs/common';
import { PlaywrightHrPlmPmReadinessService } from './playwright-hr-plm-pm-readiness.service';

@Controller()
export class PlaywrightHrPlmPmReadinessController {
  constructor(private readonly hrPlmPm: PlaywrightHrPlmPmReadinessService) {}

  @Get('platform/playwright-hr-plm-pm/readiness')
  readiness() {
    return this.hrPlmPm.getReadiness();
  }
}
