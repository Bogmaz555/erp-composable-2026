import { Controller, Get } from '@nestjs/common';
import { PlaywrightRequiredReadinessService } from './playwright-required-readiness.service';

@Controller()
export class PlaywrightRequiredReadinessController {
  constructor(private readonly required: PlaywrightRequiredReadinessService) {}

  @Get('platform/playwright-required/readiness')
  readiness() {
    return this.required.getReadiness();
  }
}
