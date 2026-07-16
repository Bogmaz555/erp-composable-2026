import { Controller, Get } from '@nestjs/common';
import { VaultAuditReadinessService } from './vault-audit-readiness.service';

@Controller()
export class VaultAuditReadinessController {
  constructor(private readonly vaultAudit: VaultAuditReadinessService) {}

  @Get('platform/vault-audit/readiness')
  readiness() {
    return this.vaultAudit.getReadiness();
  }
}
