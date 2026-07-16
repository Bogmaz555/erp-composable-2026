import { Controller, Get } from '@nestjs/common';
import { PlaywrightCiReadinessService } from './playwright-ci-readiness.service';

@Controller()
export class PlaywrightCiReadinessController {
  constructor(private readonly playwrightCi: PlaywrightCiReadinessService) {}

  @Get('platform/playwright-ci/readiness')
  readiness() {
    return this.playwrightCi.getReadiness();
  }
}
