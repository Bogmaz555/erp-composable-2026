import { Controller, Get } from '@nestjs/common';
import { PlaywrightMesEamCrmReadinessService } from './playwright-mes-eam-crm-readiness.service';

@Controller()
export class PlaywrightMesEamCrmReadinessController {
  constructor(private readonly mesEamCrm: PlaywrightMesEamCrmReadinessService) {}

  @Get('platform/playwright-mes-eam-crm/readiness')
  readiness() {
    return this.mesEamCrm.getReadiness();
  }
}
