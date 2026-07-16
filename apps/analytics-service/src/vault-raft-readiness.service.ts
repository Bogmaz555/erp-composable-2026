import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class VaultRaftReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-vault-raft-probe.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  async getReadiness() {
    const root = this.findRepoRoot();
    const raftConfig = fs.existsSync(path.join(root, 'infra/vault/raft/raft-config.hcl'));
    const raftPolicy = fs.existsSync(path.join(root, 'infra/vault/raft/RAFT-POLICY.md'));
    const ensureScript = fs.existsSync(path.join(root, 'scripts/ensure-vault-raft-ready.sh'));
    const probeScript = fs.existsSync(path.join(root, 'scripts/ci-vault-raft-probe.ts'));

    let composeHasVaultRaft = false;
    let raftStorageConfig = false;
    try {
      const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');
      composeHasVaultRaft = compose.includes('vault-raft:') && compose.includes('prod-observability');
    } catch {
      composeHasVaultRaft = false;
    }
    try {
      const cfg = fs.readFileSync(path.join(root, 'infra/vault/raft/raft-config.hcl'), 'utf8');
      raftStorageConfig = cfg.includes('storage "raft"') && cfg.includes('node_id');
    } catch {
      raftStorageConfig = false;
    }

    let ciGateIncludesProbe = false;
    let workflowIncludesProbe = false;
    try {
      const gate = fs.readFileSync(path.join(root, 'scripts/ci-contract-gate.sh'), 'utf8');
      ciGateIncludesProbe = gate.includes('ci-vault-raft-probe');
    } catch {
      ciGateIncludesProbe = false;
    }
    try {
      const wf = fs.readFileSync(path.join(root, '.github/workflows/erp-ci.yml'), 'utf8');
      workflowIncludesProbe = wf.includes('ci-vault-raft-probe') && wf.includes('CI_VAULT_RAFT');
    } catch {
      workflowIncludesProbe = false;
    }

    const ready =
      raftConfig &&
      raftPolicy &&
      ensureScript &&
      probeScript &&
      composeHasVaultRaft &&
      raftStorageConfig &&
      ciGateIncludesProbe &&
      workflowIncludesProbe;

    return {
      ready,
      td001: ready ? 'partial' : 'infra-gated',
      domain: 'VAULT_RAFT',
      ciVaultRaftEnv: process.env.CI_VAULT_RAFT === 'true',
      raftConfig,
      raftPolicy,
      ensureScript,
      probeScript,
      composeHasVaultRaft,
      raftStorageConfig,
      ciGateIncludesProbe,
      workflowIncludesProbe,
      capabilities: ['Vault Raft storage', 'Replaces HA stub', 'prod-observability profile'],
      checkedAt: new Date().toISOString(),
    };
  }
}
