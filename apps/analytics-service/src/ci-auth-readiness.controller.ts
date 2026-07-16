import { Controller, Get } from '@nestjs/common';
import { CiAuthReadinessService } from './ci-auth-readiness.service';

@Controller()
export class CiAuthReadinessController {
  constructor(private readonly ciAuth: CiAuthReadinessService) {}

  @Get('platform/ci-auth/readiness')
  readiness() {
    return this.ciAuth.getReadiness();
  }
}
