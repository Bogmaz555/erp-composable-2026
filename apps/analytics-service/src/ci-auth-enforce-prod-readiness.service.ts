import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CiAuthEnforceProdReadinessService {
  private readonly analyticsBase = 'http://127.0.0.1:4011';

  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-auth-enforce-prod-probe.ts'))) return dir;
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
    const prodProbe = this.fileExists('scripts/ci-auth-enforce-prod-probe.ts');
    const keycloakReady = this.fileExists('scripts/ensure-keycloak-ready.sh');
    const authEnforceSmoke = this.fileExists('scripts/auth-enforce-smoke.ts');

    let authLiveJobPresent = false;
    let authLiveNoContinueOnError = false;
    let workflowIncludesProdProbe = false;
    try {
      const workflow = fs.readFileSync(
        path.join(this.findRepoRoot(), '.github/workflows/erp-ci.yml'),
        'utf8',
      );
      authLiveJobPresent = workflow.includes('auth-enforce-live');
      const block = workflow.split('auth-enforce-live:')[1]?.split('\n  docker-smoke:')[0] ?? '';
      authLiveNoContinueOnError = authLiveJobPresent && !block.includes('continue-on-error: true');
      workflowIncludesProdProbe =
        workflow.includes('ci-auth-enforce-prod-probe') &&
        workflow.includes('CI_AUTH_ENFORCE_PROD');
    } catch {
      authLiveJobPresent = false;
    }

    let ciGateIncludesProbe = false;
    try {
      const gate = fs.readFileSync(
        path.join(this.findRepoRoot(), 'scripts/ci-contract-gate.sh'),
        'utf8',
      );
      ciGateIncludesProbe = gate.includes('ci-auth-enforce-prod-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    let authEnforcementReady = false;
    try {
      const res = await fetch(`${this.analyticsBase}/platform/auth-enforcement/readiness`, {
        signal: AbortSignal.timeout(8000),
      });
      const body = res.ok ? ((await res.json()) as { domain?: string }) : null;
      authEnforcementReady = body?.domain === 'AUTH_ENFORCEMENT';
    } catch {
      authEnforcementReady = false;
    }

    const ready =
      prodProbe &&
      keycloakReady &&
      authEnforceSmoke &&
      authLiveJobPresent &&
      authLiveNoContinueOnError &&
      workflowIncludesProdProbe &&
      ciGateIncludesProbe &&
      authEnforcementReady;

    return {
      ready,
      td001: ready ? 'yellow-minimum' : authLiveJobPresent ? 'partial' : 'open-dev',
      domain: 'CI_AUTH_ENFORCE_PROD',
      ciAuthEnforceProdEnv: process.env.CI_AUTH_ENFORCE_PROD === 'true',
      prodProbeScript: prodProbe,
      keycloakReadyScript: keycloakReady,
      authEnforceSmokeScript: authEnforceSmoke,
      authLiveJobPresent,
      authLiveNoContinueOnError,
      workflowIncludesProdProbe,
      ciGateIncludesProbe,
      authEnforcementReady,
      capabilities: ['AUTH_ENFORCE prod profile', 'mandatory auth-enforce-live', 'Keycloak live gate'],
      checkedAt: new Date().toISOString(),
    };
  }
}
