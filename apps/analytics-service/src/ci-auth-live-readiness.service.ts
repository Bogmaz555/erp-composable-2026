import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CiAuthLiveReadinessService {
  private readonly analyticsBase = 'http://127.0.0.1:4011';
  private readonly gw = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-auth-enforce-live-probe.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  private fileExists(rel: string) {
    return fs.existsSync(path.join(this.findRepoRoot(), rel));
  }

  private async probe(url: string, init?: RequestInit) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
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
    const liveProbeScript = this.fileExists('scripts/ci-auth-enforce-live-probe.ts');
    const authEnforceSmoke = this.fileExists('scripts/auth-enforce-smoke.ts');
    const authEnforceE2e = this.fileExists('scripts/auth-enforce-e2e.sh');
    const keycloakReady = this.fileExists('scripts/ensure-keycloak-ready.sh');

    let workflowIncludesLive = false;
    try {
      const workflow = fs.readFileSync(
        path.join(this.findRepoRoot(), '.github/workflows/erp-ci.yml'),
        'utf8',
      );
      workflowIncludesLive =
        workflow.includes('auth-enforce-live') && workflow.includes('ci-auth-enforce-live-probe');
    } catch {
      workflowIncludesLive = false;
    }

    let ciGateIncludesLive = false;
    try {
      const gate = fs.readFileSync(
        path.join(this.findRepoRoot(), 'scripts/ci-contract-gate.sh'),
        'utf8',
      );
      ciGateIncludesLive = gate.includes('ci-auth-enforce-live-probe');
    } catch {
      ciGateIncludesLive = false;
    }

    const authEnforcement = await this.probe(
      `${this.analyticsBase}/platform/auth-enforcement/readiness`,
    );
    const gwPm = await this.probe(`${this.gw}/api/pm`);
    const liveGatewayReachable = gwPm.status > 0 && gwPm.status < 500;

    const ciAuthEnforceLive = process.env.CI_AUTH_ENFORCE_LIVE === 'true';
    const profileComplete =
      liveProbeScript && authEnforceSmoke && authEnforceE2e && keycloakReady && workflowIncludesLive && ciGateIncludesLive;
    const ready = profileComplete && authEnforcement.ok;

    return {
      ready,
      td001: ciAuthEnforceLive && liveGatewayReachable ? 'yellow-minimum' : profileComplete ? 'partial' : 'open-dev',
      domain: 'CI_AUTH_LIVE',
      ciAuthEnforceLiveEnv: ciAuthEnforceLive,
      liveProbeScript,
      authEnforceSmokeScript: authEnforceSmoke,
      authEnforceE2eScript: authEnforceE2e,
      keycloakReadyScript: keycloakReady,
      workflowIncludesLive,
      ciGateIncludesLive,
      authEnforcementReady: authEnforcement.ok,
      liveGatewayReachable,
      unauthenticatedGwStatus: gwPm.status,
      capabilities: ['Keycloak live smoke', 'CI auth enforce live job', 'gateway boundary probe'],
      checkedAt: new Date().toISOString(),
    };
  }
}
