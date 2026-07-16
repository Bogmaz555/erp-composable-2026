import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class VaultHaReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-vault-ha-probe.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  private fileExists(rel: string) {
    return fs.existsSync(path.join(this.findRepoRoot(), rel));
  }

  async getReadiness() {
    const haConfig = this.fileExists('infra/vault/ha/ha-config.hcl');
    const haPolicy = this.fileExists('infra/vault/ha/HA-POLICY.md');
    const ensureScript = this.fileExists('scripts/ensure-vault-ha-ready.sh');
    const probeScript = this.fileExists('scripts/ci-vault-ha-probe.ts');

    let composeHasVaultHa = false;
    try {
      const compose = fs.readFileSync(
        path.join(this.findRepoRoot(), 'docker-compose.yml'),
        'utf8',
      );
      composeHasVaultHa = compose.includes('vault-ha:') && compose.includes('prod-observability');
    } catch {
      composeHasVaultHa = false;
    }

    let ciGateIncludesProbe = false;
    let workflowIncludesProbe = false;
    try {
      const gate = fs.readFileSync(
        path.join(this.findRepoRoot(), 'scripts/ci-contract-gate.sh'),
        'utf8',
      );
      ciGateIncludesProbe = gate.includes('ci-vault-ha-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    try {
      const wf = fs.readFileSync(
        path.join(this.findRepoRoot(), '.github/workflows/erp-ci.yml'),
        'utf8',
      );
      workflowIncludesProbe = wf.includes('ci-vault-ha-probe') && wf.includes('CI_VAULT_HA');
    } catch {
      workflowIncludesProbe = false;
    }

    const ready =
      haConfig && haPolicy && ensureScript && probeScript && composeHasVaultHa && ciGateIncludesProbe && workflowIncludesProbe;

    return {
      ready,
      td001: ready ? 'partial' : 'infra-gated',
      domain: 'VAULT_HA',
      ciVaultHaEnv: process.env.CI_VAULT_HA === 'true',
      haConfig,
      haPolicy,
      ensureScript,
      probeScript,
      composeHasVaultHa,
      ciGateIncludesProbe,
      workflowIncludesProbe,
      capabilities: ['Vault HA secondary stub', 'Dual-node health check', 'prod-observability profile'],
      checkedAt: new Date().toISOString(),
    };
  }
}
