import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CiAuthEnforceReadinessService {
  private readonly analyticsBase = 'http://127.0.0.1:4011';

  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-auth-enforce-probe.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  private fileExists(rel: string) {
    return fs.existsSync(path.join(this.findRepoRoot(), rel));
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
      return { ok: res.ok, body };
    } catch {
      return { ok: false, body: undefined };
    }
  }

  async getReadiness() {
    const probeScript = this.fileExists('scripts/ci-auth-enforce-probe.ts');
    const authEnforceE2e = this.fileExists('scripts/auth-enforce-e2e.sh');
    const authEnforceSmoke = this.fileExists('scripts/auth-enforce-smoke.ts');

    let ciGateIncludesProbe = false;
    let workflowIncludesProbe = false;
    try {
      const gate = fs.readFileSync(path.join(this.findRepoRoot(), 'scripts/ci-contract-gate.sh'), 'utf8');
      ciGateIncludesProbe = gate.includes('ci-auth-enforce-probe');
    } catch {
      ciGateIncludesProbe = false;
    }
    try {
      const workflow = fs.readFileSync(
        path.join(this.findRepoRoot(), '.github/workflows/erp-ci.yml'),
        'utf8',
      );
      workflowIncludesProbe =
        workflow.includes('CI_AUTH_ENFORCE') && workflow.includes('ci-auth-enforce-probe');
    } catch {
      workflowIncludesProbe = false;
    }

    const ciAuthEnforce = process.env.CI_AUTH_ENFORCE === 'true';
    const authEnforcement = await this.probe(
      `${this.analyticsBase}/platform/auth-enforcement/readiness`,
    );
    const authEnforcementReady =
      authEnforcement.ok &&
      typeof authEnforcement.body === 'object' &&
      (authEnforcement.body as { domain?: string }).domain === 'AUTH_ENFORCEMENT';

    const profileComplete =
      probeScript && authEnforceE2e && authEnforceSmoke && ciGateIncludesProbe && workflowIncludesProbe;
    const ready = profileComplete && authEnforcementReady;

    return {
      ready,
      td001: ciAuthEnforce ? 'yellow-minimum' : profileComplete ? 'partial' : 'open-dev',
      domain: 'CI_AUTH_ENFORCE',
      ciAuthEnforceEnv: ciAuthEnforce,
      probeScript,
      authEnforceE2eScript: authEnforceE2e,
      authEnforceSmokeScript: authEnforceSmoke,
      ciGateIncludesProbe,
      workflowIncludesProbe,
      authEnforcementReady,
      capabilities: [
        'CI_AUTH_ENFORCE probe in gate',
        'GitHub workflow auth enforce step',
        'auth-enforce e2e/smoke scripts',
      ],
      checkedAt: new Date().toISOString(),
    };
  }
}
