import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class VaultSecretsRotationReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-vault-secrets-rotation-probe.ts'))) return dir;
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
    const rotateScript = this.fileExists('scripts/rotate-vault-secrets.sh');
    const ensureScript = this.fileExists('scripts/ensure-vault-secrets-ready.sh');
    const probeScript = this.fileExists('scripts/ci-vault-secrets-rotation-probe.ts');
    const policy = this.fileExists('infra/vault/rotation/ROTATION-POLICY.md');
    const vaultConfig = this.fileExists('infra/vault/vault.hcl');

    let ciGateIncludesProbe = false;
    let workflowIncludesProbe = false;
    let composeHasVault = false;
    try {
      const gate = fs.readFileSync(
        path.join(this.findRepoRoot(), 'scripts/ci-contract-gate.sh'),
        'utf8',
      );
      ciGateIncludesProbe = gate.includes('ci-vault-secrets-rotation-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    try {
      const wf = fs.readFileSync(
        path.join(this.findRepoRoot(), '.github/workflows/erp-ci.yml'),
        'utf8',
      );
      workflowIncludesProbe =
        wf.includes('ci-vault-secrets-rotation-probe') && wf.includes('CI_VAULT_SECRETS_ROTATION');
    } catch {
      workflowIncludesProbe = false;
    }

    try {
      const compose = fs.readFileSync(
        path.join(this.findRepoRoot(), 'docker-compose.yml'),
        'utf8',
      );
      composeHasVault = compose.includes('vault:') && compose.includes('prod-security');
    } catch {
      composeHasVault = false;
    }

    const ready =
      rotateScript &&
      ensureScript &&
      probeScript &&
      policy &&
      vaultConfig &&
      composeHasVault &&
      ciGateIncludesProbe &&
      workflowIncludesProbe;

    return {
      ready,
      td001: ready ? 'partial' : 'infra-gated',
      domain: 'VAULT_SECRETS_ROTATION',
      ciVaultSecretsRotationEnv: process.env.CI_VAULT_SECRETS_ROTATION === 'true',
      rotateScript,
      ensureScript,
      probeScript,
      rotationPolicy: policy,
      vaultConfig,
      composeHasVault,
      ciGateIncludesProbe,
      workflowIncludesProbe,
      capabilities: ['Vault KV secrets rotation', '90-day policy', 'dev prod-security profile'],
      checkedAt: new Date().toISOString(),
    };
  }
}
