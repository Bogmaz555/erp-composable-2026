import { Controller, Get } from '@nestjs/common';
import { PlaywrightStackReadinessService } from './playwright-stack-readiness.service';

@Controller()
export class PlaywrightStackReadinessController {
  constructor(private readonly stack: PlaywrightStackReadinessService) {}

  @Get('platform/playwright-stack/readiness')
  readiness() {
    return this.stack.getReadiness();
  }
}
