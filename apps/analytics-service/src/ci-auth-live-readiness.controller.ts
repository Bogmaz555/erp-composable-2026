import { Controller, Get } from '@nestjs/common';
import { CiAuthLiveReadinessService } from './ci-auth-live-readiness.service';

@Controller()
export class CiAuthLiveReadinessController {
  constructor(private readonly ciAuthLive: CiAuthLiveReadinessService) {}

  @Get('platform/ci-auth-live/readiness')
  readiness() {
    return this.ciAuthLive.getReadiness();
  }
}
