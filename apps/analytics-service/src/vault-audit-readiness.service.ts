import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class VaultAuditReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-vault-audit-probe.ts'))) return dir;
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
    const auditPolicy = this.fileExists('infra/vault/audit/AUDIT-POLICY.md');
    const auditDevice = this.fileExists('infra/vault/audit/audit-device.hcl');
    const ensureScript = this.fileExists('scripts/ensure-vault-audit-ready.sh');
    const rotateScript = this.fileExists('scripts/rotate-vault-audit-log.sh');
    const probeScript = this.fileExists('scripts/ci-vault-audit-probe.ts');
    const rotationPolicy = this.fileExists('infra/vault/rotation/ROTATION-POLICY.md');

    let ciGateIncludesProbe = false;
    let workflowIncludesProbe = false;
    try {
      const gate = fs.readFileSync(
        path.join(this.findRepoRoot(), 'scripts/ci-contract-gate.sh'),
        'utf8',
      );
      ciGateIncludesProbe = gate.includes('ci-vault-audit-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    try {
      const wf = fs.readFileSync(
        path.join(this.findRepoRoot(), '.github/workflows/erp-ci.yml'),
        'utf8',
      );
      workflowIncludesProbe = wf.includes('ci-vault-audit-probe') && wf.includes('CI_VAULT_AUDIT');
    } catch {
      workflowIncludesProbe = false;
    }

    const ready =
      auditPolicy &&
      auditDevice &&
      ensureScript &&
      rotateScript &&
      probeScript &&
      rotationPolicy &&
      ciGateIncludesProbe &&
      workflowIncludesProbe;

    return {
      ready,
      td001: ready ? 'partial' : 'infra-gated',
      domain: 'VAULT_AUDIT',
      ciVaultAuditEnv: process.env.CI_VAULT_AUDIT === 'true',
      auditPolicy,
      auditDevice,
      ensureScript,
      rotateScript,
      probeScript,
      rotationCompliance: rotationPolicy,
      ciGateIncludesProbe,
      workflowIncludesProbe,
      capabilities: ['Vault audit logging', '90-day log rotation', 'Rotation compliance'],
      checkedAt: new Date().toISOString(),
    };
  }
}
