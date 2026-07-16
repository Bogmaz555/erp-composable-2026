import { Controller, Get } from '@nestjs/common';
import { CiAuthKeycloakReadinessService } from './ci-auth-keycloak-readiness.service';

@Controller()
export class CiAuthKeycloakReadinessController {
  constructor(private readonly ciAuthKeycloak: CiAuthKeycloakReadinessService) {}

  @Get('platform/ci-auth-keycloak/readiness')
  readiness() {
    return this.ciAuthKeycloak.getReadiness();
  }
}
