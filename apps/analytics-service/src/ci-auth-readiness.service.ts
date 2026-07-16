import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CiAuthReadinessService {
  private readonly analyticsBase = 'http://127.0.0.1:4011';

  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-contract-gate.sh'))) return dir;
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
    const ciGateScript = this.fileExists('scripts/ci-contract-gate.sh');
    const bootAllAuthScript = this.fileExists('scripts/boot-all-with-auth.sh');
    const authEnforceE2e = this.fileExists('scripts/auth-enforce-e2e.sh');
    let erpAuthProfileDoc = false;
    try {
      const envExample = fs.readFileSync(path.join(this.findRepoRoot(), '.env.erp.example'), 'utf8');
      erpAuthProfileDoc = envExample.includes('ERP_AUTH_ENFORCE');
    } catch {
      erpAuthProfileDoc = false;
    }

    let ciWorkflowAuthEnforce = false;
    try {
      const workflow = fs.readFileSync(
        path.join(this.findRepoRoot(), '.github/workflows/erp-ci.yml'),
        'utf8',
      );
      ciWorkflowAuthEnforce = workflow.includes('CI_AUTH_ENFORCE');
    } catch {
      ciWorkflowAuthEnforce = false;
    }

    const authEnforcement = await this.probe(
      `${this.analyticsBase}/platform/auth-enforcement/readiness`,
    );
    const authEnforcementReady =
      authEnforcement.ok &&
      typeof authEnforcement.body === 'object' &&
      (authEnforcement.body as { domain?: string }).domain === 'AUTH_ENFORCEMENT';

    const ciAuthEnforce =
      process.env.CI_AUTH_ENFORCE === 'true' || process.env.ERP_AUTH_ENFORCE === 'true';
    const authEnforced = process.env.AUTH_ENFORCE === 'true';

    const profileComplete =
      ciGateScript && bootAllAuthScript && authEnforceE2e && erpAuthProfileDoc && ciWorkflowAuthEnforce;
    const ready = profileComplete && authEnforcementReady;

    return {
      ready,
      td001: authEnforced ? 'yellow-minimum' : ciAuthEnforce ? 'partial' : 'open-dev',
      domain: 'CI_AUTH',
      ciGateScript,
      bootAllAuthScript,
      authEnforceE2eScript: authEnforceE2e,
      erpAuthProfileDoc,
      ciWorkflowAuthEnforce,
      authEnforcementReady,
      ciAuthEnforceEnv: ciAuthEnforce,
      authEnforced,
      capabilities: [
        'CI contract gate script',
        'boot:all:auth profile',
        'ERP_AUTH_ENFORCE env profile',
        'GitHub CI_AUTH_ENFORCE workflow',
        'auth-enforcement readiness probe',
      ],
      checkedAt: new Date().toISOString(),
    };
  }
}
