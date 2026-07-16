import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class KsefProdReadinessService {
  private readonly gw = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-ksef-prod-probe.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  async getReadiness() {
    const root = this.findRepoRoot();
    const policy = fs.existsSync(path.join(root, 'infra/ksef/KSEF-PROD-POLICY.md'));
    const ensureScript = fs.existsSync(path.join(root, 'scripts/ensure-ksef-prod-ready.sh'));
    const probeScript = fs.existsSync(path.join(root, 'scripts/ci-ksef-prod-probe.ts'));
    const prodService = fs.existsSync(path.join(root, 'apps/tax-legal/src/ksef-production.service.ts'));
    const prodProfileEndpoint = fs.existsSync(path.join(root, 'apps/tax-legal/src/tax-legal.controller.ts'));

    let controllerHasProfile = false;
    try {
      const ctrl = fs.readFileSync(path.join(root, 'apps/tax-legal/src/tax-legal.controller.ts'), 'utf8');
      controllerHasProfile = ctrl.includes('ksef/production/profile');
    } catch {
      controllerHasProfile = false;
    }

    let composeProfile = false;
    try {
      const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');
      composeProfile = compose.includes('ksef-prod') || compose.includes('tax-legal');
    } catch {
      composeProfile = false;
    }

    let ciGateIncludesProbe = false;
    let workflowIncludesProbe = false;
    try {
      const gate = fs.readFileSync(path.join(root, 'scripts/ci-contract-gate.sh'), 'utf8');
      ciGateIncludesProbe = gate.includes('ci-ksef-prod-probe');
    } catch {
      ciGateIncludesProbe = false;
    }
    try {
      const wf = fs.readFileSync(path.join(root, '.github/workflows/erp-ci.yml'), 'utf8');
      workflowIncludesProbe = wf.includes('ci-ksef-prod-probe') && wf.includes('CI_KSEF_PROD');
    } catch {
      workflowIncludesProbe = false;
    }

    let ksefProfileUp = false;
    let ksefStatusUp = false;
    try {
      const res = await fetch(`${this.gw}/api/tax-legal/ksef/production/profile`, {
        signal: AbortSignal.timeout(8000),
      });
      ksefProfileUp = res.ok;
    } catch {
      ksefProfileUp = false;
    }
    try {
      const res = await fetch(`${this.gw}/api/tax-legal/ksef/status`, { signal: AbortSignal.timeout(8000) });
      ksefStatusUp = res.ok;
    } catch {
      ksefStatusUp = false;
    }

    const infraReady =
      policy &&
      ensureScript &&
      probeScript &&
      prodService &&
      controllerHasProfile &&
      ciGateIncludesProbe &&
      workflowIncludesProbe;

    return {
      ready: infraReady,
      td005: ksefProfileUp || ksefStatusUp ? 'yellow-minimum' : 'partial',
      domain: 'KSEF_PROD',
      ciKsefProdEnv: process.env.CI_KSEF_PROD === 'true',
      policy,
      ensureScript,
      probeScript,
      prodService,
      controllerHasProfile,
      composeProfile,
      ksefProfileUp,
      ksefStatusUp,
      ciGateIncludesProbe,
      workflowIncludesProbe,
      ksefMode: process.env.KSEF_MODE || 'sandbox',
      capabilities: ['KSeF production profile', 'FA(3) schema', 'Env-gated prod router'],
      checkedAt: new Date().toISOString(),
    };
  }
}
