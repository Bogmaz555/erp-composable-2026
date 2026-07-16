import { Controller, Get } from '@nestjs/common';
import { AuthEnforcementReadinessService } from './auth-enforcement-readiness.service';

@Controller()
export class AuthEnforcementReadinessController {
  constructor(private readonly auth: AuthEnforcementReadinessService) {}

  @Get('platform/auth-enforcement/readiness')
  readiness() {
    return this.auth.getReadiness();
  }
}
