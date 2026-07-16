import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class VaultTlsProdReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-vault-tls-prod-probe.ts'))) return dir;
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
    const probeScript = this.fileExists('scripts/ci-vault-tls-prod-probe.ts');
    const ensureScript = this.fileExists('scripts/ensure-vault-tls-ready.sh');
    const tlsGenScript = this.fileExists('scripts/generate-dev-tls-certs.sh');
    const vaultConfig = this.fileExists('infra/vault/vault.hcl');

    let composeHasVault = false;
    let composeHasProdSecurity = false;
    try {
      const compose = fs.readFileSync(
        path.join(this.findRepoRoot(), 'docker-compose.yml'),
        'utf8',
      );
      composeHasVault = compose.includes('vault:');
      composeHasProdSecurity = compose.includes('prod-security');
    } catch {
      composeHasVault = false;
    }

    let ciGateIncludesProbe = false;
    try {
      const gate = fs.readFileSync(
        path.join(this.findRepoRoot(), 'scripts/ci-contract-gate.sh'),
        'utf8',
      );
      ciGateIncludesProbe = gate.includes('ci-vault-tls-prod-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    let workflowIncludesProbe = false;
    try {
      const wf = fs.readFileSync(
        path.join(this.findRepoRoot(), '.github/workflows/erp-ci.yml'),
        'utf8',
      );
      workflowIncludesProbe =
        wf.includes('ci-vault-tls-prod-probe') && wf.includes('CI_VAULT_TLS_PROD');
    } catch {
      workflowIncludesProbe = false;
    }

    const tlsCertsPresent =
      this.fileExists('infra/tls/dev/server.crt') || this.fileExists('infra/tls/dev/.gitkeep');

    const profileComplete =
      probeScript &&
      ensureScript &&
      tlsGenScript &&
      vaultConfig &&
      composeHasVault &&
      composeHasProdSecurity &&
      ciGateIncludesProbe &&
      workflowIncludesProbe;
    const ready = profileComplete;

    return {
      ready,
      td001: ready ? 'partial' : 'infra-gated',
      domain: 'VAULT_TLS_PROD',
      ciVaultTlsProdEnv: process.env.CI_VAULT_TLS_PROD === 'true',
      probeScript,
      ensureScript,
      tlsGenScript,
      vaultConfig,
      composeHasVault,
      composeHasProdSecurity,
      ciGateIncludesProbe,
      workflowIncludesProbe,
      tlsCertsPresent,
      capabilities: ['Vault dev profile', 'TLS dev certs', 'prod-security compose profile'],
      checkedAt: new Date().toISOString(),
    };
  }
}
