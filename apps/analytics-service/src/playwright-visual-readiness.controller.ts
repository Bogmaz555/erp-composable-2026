import { Controller, Get } from '@nestjs/common';
import { PlaywrightVisualReadinessService } from './playwright-visual-readiness.service';

@Controller()
export class PlaywrightVisualReadinessController {
  constructor(private readonly visual: PlaywrightVisualReadinessService) {}

  @Get('platform/playwright-visual/readiness')
  readiness() {
    return this.visual.getReadiness();
  }
}
