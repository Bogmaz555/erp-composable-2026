import { Controller, Get } from '@nestjs/common';
import { VaultHaReadinessService } from './vault-ha-readiness.service';

@Controller()
export class VaultHaReadinessController {
  constructor(private readonly vaultHa: VaultHaReadinessService) {}

  @Get('platform/vault-ha/readiness')
  readiness() {
    return this.vaultHa.getReadiness();
  }
}
