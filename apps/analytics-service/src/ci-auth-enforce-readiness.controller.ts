import { Controller, Get } from '@nestjs/common';
import { CiAuthEnforceReadinessService } from './ci-auth-enforce-readiness.service';

@Controller()
export class CiAuthEnforceReadinessController {
  constructor(private readonly ciAuthEnforce: CiAuthEnforceReadinessService) {}

  @Get('platform/ci-auth-enforce/readiness')
  readiness() {
    return this.ciAuthEnforce.getReadiness();
  }
}
