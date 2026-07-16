import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ProdObservabilityReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-prod-observability-probe.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  async getReadiness() {
    const root = this.findRepoRoot();
    const policy = fs.existsSync(path.join(root, 'infra/observability/PROD-OBSERVABILITY.md'));
    const ensureScript = fs.existsSync(path.join(root, 'scripts/ensure-prod-observability-ready.sh'));
    const probeScript = fs.existsSync(path.join(root, 'scripts/ci-prod-observability-probe.ts'));

    let composeHasProfile = false;
    try {
      const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');
      composeHasProfile =
        compose.includes('prod-observability') &&
        compose.includes('prometheus') &&
        compose.includes('grafana') &&
        compose.includes('alertmanager') &&
        compose.includes('vault-ha');
    } catch {
      composeHasProfile = false;
    }

    let ciGateIncludesProbe = false;
    try {
      const gate = fs.readFileSync(path.join(root, 'scripts/ci-contract-gate.sh'), 'utf8');
      ciGateIncludesProbe = gate.includes('ci-prod-observability-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    const ready = policy && ensureScript && probeScript && composeHasProfile && ciGateIncludesProbe;

    return {
      ready,
      td011: ready ? 'yellow-minimum' : policy ? 'partial' : 'down',
      domain: 'PROD_OBSERVABILITY',
      policy,
      ensureScript,
      probeScript,
      composeHasProfile,
      ciGateIncludesProbe,
      ciProdObservabilityEnv: process.env.CI_PROD_OBSERVABILITY === 'true',
      capabilities: ['Full observability stack', 'Prometheus + Grafana + Alertmanager + Vault HA'],
      checkedAt: new Date().toISOString(),
    };
  }
}
