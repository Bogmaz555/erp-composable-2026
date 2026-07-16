import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { TenantIsolationService } from './tenant-isolation.service';

@Injectable()
export class TenantHardeningReadinessService {
  private readonly gw = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

  constructor(private readonly isolation: TenantIsolationService) {}

  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-tenant-hardening-probe.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  async getReadiness() {
    const root = this.findRepoRoot();
    const policy = fs.existsSync(path.join(root, 'infra/tenant/TENANT-HARDENING-POLICY.md'));
    const ensureScript = fs.existsSync(path.join(root, 'scripts/ensure-tenant-hardening-ready.sh'));
    const probeScript = fs.existsSync(path.join(root, 'scripts/ci-tenant-hardening-probe.ts'));
    const procMiddleware = fs.existsSync(path.join(root, 'apps/proc-service/src/tenant.middleware.ts'));

    let gatewayTenantHook = false;
    try {
      const main = fs.readFileSync(path.join(root, 'apps/api-gateway/src/main.ts'), 'utf8');
      gatewayTenantHook = main.includes('x-tenant-id') && main.includes('tenantId');
    } catch {
      gatewayTenantHook = false;
    }

    let hardeningEndpoint = false;
    try {
      const ctrl = fs.readFileSync(path.join(root, 'apps/analytics-service/src/tenant.controller.ts'), 'utf8');
      hardeningEndpoint = ctrl.includes('tenants/hardening/check');
    } catch {
      hardeningEndpoint = false;
    }

    let ciGateIncludesProbe = false;
    let workflowIncludesProbe = false;
    try {
      const gate = fs.readFileSync(path.join(root, 'scripts/ci-contract-gate.sh'), 'utf8');
      ciGateIncludesProbe = gate.includes('ci-tenant-hardening-probe');
    } catch {
      ciGateIncludesProbe = false;
    }
    try {
      const wf = fs.readFileSync(path.join(root, '.github/workflows/erp-ci.yml'), 'utf8');
      workflowIncludesProbe = wf.includes('ci-tenant-hardening-probe') && wf.includes('CI_TENANT_HARDENING');
    } catch {
      workflowIncludesProbe = false;
    }

    let hardeningCheckUp = false;
    let isolationUp = false;
    try {
      const res = await fetch(`${this.gw}/api/analytics/tenants/hardening/check`, {
        signal: AbortSignal.timeout(8000),
      });
      hardeningCheckUp = res.ok;
    } catch {
      hardeningCheckUp = false;
    }
    try {
      const res = await fetch(`${this.gw}/api/analytics/tenants/default/isolation`, {
        headers: { 'X-Tenant-Id': 'default' },
        signal: AbortSignal.timeout(8000),
      });
      isolationUp = res.ok;
    } catch {
      isolationUp = false;
    }

    const infraReady =
      policy &&
      ensureScript &&
      probeScript &&
      procMiddleware &&
      gatewayTenantHook &&
      hardeningEndpoint &&
      ciGateIncludesProbe &&
      workflowIncludesProbe;

    return {
      ready: infraReady,
      td003: isolationUp || hardeningCheckUp ? 'yellow-minimum' : 'partial',
      domain: 'TENANT_HARDENING',
      ciTenantHardeningEnv: process.env.CI_TENANT_HARDENING === 'true',
      policy,
      ensureScript,
      probeScript,
      procMiddleware,
      gatewayTenantHook,
      hardeningEndpoint,
      hardeningCheckUp,
      isolationUp,
      ciGateIncludesProbe,
      workflowIncludesProbe,
      capabilities: ['X-Tenant-Id propagation', 'Cross-tenant isolation check', 'PROC middleware'],
      checkedAt: new Date().toISOString(),
    };
  }
}
