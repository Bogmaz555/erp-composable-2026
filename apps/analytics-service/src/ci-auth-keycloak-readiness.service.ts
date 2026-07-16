import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CiAuthKeycloakReadinessService {
  private readonly analyticsBase = 'http://127.0.0.1:4011';

  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-auth-keycloak-regression-probe.ts'))) return dir;
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
    const keycloakProbe = this.fileExists('scripts/ci-auth-keycloak-regression-probe.ts');
    const keycloakReady = this.fileExists('scripts/ensure-keycloak-ready.sh');
    const authEnforceE2e = this.fileExists('scripts/auth-enforce-e2e.sh');
    const authEnforceSmoke = this.fileExists('scripts/auth-enforce-smoke.ts');

    let workflowIncludesKeycloak = false;
    let authLiveJobPresent = false;
    try {
      const workflow = fs.readFileSync(
        path.join(this.findRepoRoot(), '.github/workflows/erp-ci.yml'),
        'utf8',
      );
      workflowIncludesKeycloak =
        workflow.includes('ci-auth-keycloak-regression-probe') &&
        workflow.includes('CI_AUTH_ENFORCE_KEYCLOAK');
      authLiveJobPresent = workflow.includes('auth-enforce-live');
    } catch {
      workflowIncludesKeycloak = false;
    }

    let ciGateIncludesProbe = false;
    try {
      const gate = fs.readFileSync(
        path.join(this.findRepoRoot(), 'scripts/ci-contract-gate.sh'),
        'utf8',
      );
      ciGateIncludesProbe = gate.includes('ci-auth-keycloak-regression-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    const authEnforcement = await this.probe(
      `${this.analyticsBase}/platform/auth-enforcement/readiness`,
    );
    const authEnforcementReady =
      authEnforcement.ok &&
      typeof authEnforcement.body === 'object' &&
      (authEnforcement.body as { domain?: string }).domain === 'AUTH_ENFORCEMENT';

    const ciAuthEnforceKeycloak = process.env.CI_AUTH_ENFORCE_KEYCLOAK === 'true';
    const profileComplete =
      keycloakProbe &&
      keycloakReady &&
      authEnforceE2e &&
      authEnforceSmoke &&
      workflowIncludesKeycloak &&
      authLiveJobPresent &&
      ciGateIncludesProbe;
    const ready = profileComplete && authEnforcementReady;

    return {
      ready,
      td001: ciAuthEnforceKeycloak ? 'yellow-minimum' : profileComplete ? 'partial' : 'open-dev',
      domain: 'CI_AUTH_KEYCLOAK',
      ciAuthEnforceKeycloakEnv: ciAuthEnforceKeycloak,
      keycloakProbeScript: keycloakProbe,
      keycloakReadyScript: keycloakReady,
      authEnforceE2eScript: authEnforceE2e,
      authEnforceSmokeScript: authEnforceSmoke,
      workflowIncludesKeycloak,
      authLiveJobPresent,
      ciGateIncludesProbe,
      authEnforcementReady,
      capabilities: ['Keycloak regression probe', 'auth-enforce-live job', 'AUTH_ENFORCE CI wiring'],
      checkedAt: new Date().toISOString(),
    };
  }
}
