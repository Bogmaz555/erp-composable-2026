import { Controller, Get } from '@nestjs/common';
import { VaultSecretsRotationReadinessService } from './vault-secrets-rotation-readiness.service';

@Controller()
export class VaultSecretsRotationReadinessController {
  constructor(private readonly vaultSecrets: VaultSecretsRotationReadinessService) {}

  @Get('platform/vault-secrets-rotation/readiness')
  readiness() {
    return this.vaultSecrets.getReadiness();
  }
}
