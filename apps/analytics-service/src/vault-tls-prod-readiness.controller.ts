import { Controller, Get } from '@nestjs/common';
import { VaultTlsProdReadinessService } from './vault-tls-prod-readiness.service';

@Controller()
export class VaultTlsProdReadinessController {
  constructor(private readonly vaultTlsProd: VaultTlsProdReadinessService) {}

  @Get('platform/vault-tls-prod/readiness')
  readiness() {
    return this.vaultTlsProd.getReadiness();
  }
}
