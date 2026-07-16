import { Controller, Get } from '@nestjs/common';
import { PlaywrightVisualDiffReadinessService } from './playwright-visual-diff-readiness.service';

@Controller()
export class PlaywrightVisualDiffReadinessController {
  constructor(private readonly visualDiff: PlaywrightVisualDiffReadinessService) {}

  @Get('platform/playwright-visual-diff/readiness')
  readiness() {
    return this.visualDiff.getReadiness();
  }
}
