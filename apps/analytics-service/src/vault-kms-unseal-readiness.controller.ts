import { Controller, Get } from '@nestjs/common';
import { VaultKmsUnsealReadinessService } from './vault-kms-unseal-readiness.service';

@Controller()
export class VaultKmsUnsealReadinessController {
  constructor(private readonly vaultKms: VaultKmsUnsealReadinessService) {}

  @Get('platform/vault-kms-unseal/readiness')
  readiness() {
    return this.vaultKms.getReadiness();
  }
}
