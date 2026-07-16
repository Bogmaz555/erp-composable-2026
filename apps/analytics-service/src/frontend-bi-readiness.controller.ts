import { Controller, Get } from '@nestjs/common';
import { FrontendBiReadinessService } from './frontend-bi-readiness.service';

@Controller()
export class FrontendBiReadinessController {
  constructor(private readonly frontendBi: FrontendBiReadinessService) {}

  @Get('platform/frontend-bi/readiness')
  readiness() {
    return this.frontendBi.getReadiness();
  }
}
