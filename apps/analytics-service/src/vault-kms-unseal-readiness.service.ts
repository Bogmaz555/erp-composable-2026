import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class VaultKmsUnsealReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-vault-kms-unseal-probe.ts'))) return dir;
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
    const kmsConfig = this.fileExists('infra/vault/kms/kms-unseal.hcl');
    const policy = this.fileExists('infra/vault/kms/UNSEAL-POLICY.md');
    const ensureScript = this.fileExists('scripts/ensure-vault-kms-unseal-ready.sh');
    const rotateScript = this.fileExists('scripts/rotate-vault-unseal-keys.sh');
    const probeScript = this.fileExists('scripts/ci-vault-kms-unseal-probe.ts');
    const vaultConfig = this.fileExists('infra/vault/vault.hcl');

    let ciGateIncludesProbe = false;
    let workflowIncludesProbe = false;
    let composeHasVault = false;
    try {
      const gate = fs.readFileSync(
        path.join(this.findRepoRoot(), 'scripts/ci-contract-gate.sh'),
        'utf8',
      );
      ciGateIncludesProbe = gate.includes('ci-vault-kms-unseal-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    try {
      const wf = fs.readFileSync(
        path.join(this.findRepoRoot(), '.github/workflows/erp-ci.yml'),
        'utf8',
      );
      workflowIncludesProbe =
        wf.includes('ci-vault-kms-unseal-probe') && wf.includes('CI_VAULT_KMS_UNSEAL');
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
      kmsConfig &&
      policy &&
      ensureScript &&
      rotateScript &&
      probeScript &&
      vaultConfig &&
      composeHasVault &&
      ciGateIncludesProbe &&
      workflowIncludesProbe;

    return {
      ready,
      td001: ready ? 'partial' : 'infra-gated',
      domain: 'VAULT_KMS_UNSEAL',
      ciVaultKmsUnsealEnv: process.env.CI_VAULT_KMS_UNSEAL === 'true',
      kmsConfig,
      unsealPolicy: policy,
      ensureScript,
      rotateScript,
      probeScript,
      vaultConfig,
      composeHasVault,
      ciGateIncludesProbe,
      workflowIncludesProbe,
      capabilities: ['Vault KMS auto-unseal dev stub', 'Unseal key rotation', 'prod-security profile'],
      checkedAt: new Date().toISOString(),
    };
  }
}
