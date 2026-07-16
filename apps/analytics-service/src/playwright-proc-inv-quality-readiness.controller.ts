import { Controller, Get } from '@nestjs/common';
import { PlaywrightProcInvQualityReadinessService } from './playwright-proc-inv-quality-readiness.service';

@Controller()
export class PlaywrightProcInvQualityReadinessController {
  constructor(private readonly procInvQuality: PlaywrightProcInvQualityReadinessService) {}

  @Get('platform/playwright-proc-inv-quality/readiness')
  readiness() {
    return this.procInvQuality.getReadiness();
  }
}
