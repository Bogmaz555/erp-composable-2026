import { Controller, Get } from '@nestjs/common';
import { CiAuthEnforceProdReadinessService } from './ci-auth-enforce-prod-readiness.service';

@Controller()
export class CiAuthEnforceProdReadinessController {
  constructor(private readonly ciAuthEnforceProd: CiAuthEnforceProdReadinessService) {}

  @Get('platform/ci-auth-enforce-prod/readiness')
  readiness() {
    return this.ciAuthEnforceProd.getReadiness();
  }
}
