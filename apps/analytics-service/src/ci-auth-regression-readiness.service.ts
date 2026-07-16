import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CiAuthRegressionReadinessService {
  private readonly analyticsBase = 'http://127.0.0.1:4011';
  private readonly gw = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-auth-enforce-regression-probe.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  private async probe(url: string) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = undefined;
      }
      return { ok: res.ok, status: res.status, body };
    } catch {
      return { ok: false, status: 0, body: undefined };
    }
  }

  async getReadiness() {
    const root = this.findRepoRoot();
    const regressionProbe = fs.existsSync(path.join(root, 'scripts/ci-auth-enforce-regression-probe.ts'));
    const authEnforceSmoke = fs.existsSync(path.join(root, 'scripts/auth-enforce-smoke.ts'));

    let workflowIncludesRegression = false;
    let ciGateIncludesProbe = false;
    try {
      const workflow = fs.readFileSync(path.join(root, '.github/workflows/erp-ci.yml'), 'utf8');
      workflowIncludesRegression =
        workflow.includes('ci-auth-enforce-regression-probe') &&
        workflow.includes('CI_AUTH_ENFORCE_REGRESSION');
    } catch {
      workflowIncludesRegression = false;
    }
    try {
      const gate = fs.readFileSync(path.join(root, 'scripts/ci-contract-gate.sh'), 'utf8');
      ciGateIncludesProbe = gate.includes('ci-auth-enforce-regression-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    const authEnforcement = await this.probe(
      `${this.analyticsBase}/platform/auth-enforcement/readiness`,
    );
    const gwPm = await this.probe(`${this.gw}/api/pm`);
    const authEnforcementReady =
      authEnforcement.ok &&
      typeof authEnforcement.body === 'object' &&
      (authEnforcement.body as { domain?: string }).domain === 'AUTH_ENFORCEMENT';

    const ciAuthEnforceRegression = process.env.CI_AUTH_ENFORCE_REGRESSION === 'true';
    const profileComplete =
      regressionProbe && authEnforceSmoke && workflowIncludesRegression && ciGateIncludesProbe;
    const ready = profileComplete && authEnforcementReady;

    return {
      ready,
      td001: ciAuthEnforceRegression && gwPm.status > 0 ? 'yellow-minimum' : profileComplete ? 'partial' : 'open-dev',
      domain: 'CI_AUTH_REGRESSION',
      ciAuthEnforceRegressionEnv: ciAuthEnforceRegression,
      regressionProbeScript: regressionProbe,
      authEnforceSmokeScript: authEnforceSmoke,
      workflowIncludesRegression,
      ciGateIncludesProbe,
      authEnforcementReady,
      gatewayReachable: gwPm.status > 0 && gwPm.status < 500,
      unauthenticatedGwStatus: gwPm.status,
      capabilities: ['AUTH_ENFORCE regression probe', 'gateway boundary in CI', 'regression job wiring'],
      checkedAt: new Date().toISOString(),
    };
  }
}
