import { Controller, Get } from '@nestjs/common';
import { VaultRaftReadinessService } from './vault-raft-readiness.service';

@Controller()
export class VaultRaftReadinessController {
  constructor(private readonly vaultRaft: VaultRaftReadinessService) {}

  @Get('platform/vault-raft/readiness')
  readiness() {
    return this.vaultRaft.getReadiness();
  }
}
