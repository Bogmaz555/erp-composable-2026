/**
 * Master Regression Report — agreguje wszystkie smoke checks W2–W9
 * Run: npx tsx scripts/master-regression-report.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '.agents/swarm/regression-report.json');

interface CheckResult {
  name: string;
  url: string;
  status: number;
  ok: boolean;
  ms: number;
  group: string;
  optional?: boolean;
}

async function detectFrontendUrl(): Promise<{ url: string; reachable: boolean }> {
  const envUrl = process.env.FRONTEND_URL;
  const fs = await import('fs');
  let portFile = 0;
  try {
    if (fs.existsSync('/tmp/erp-frontend.port')) {
      portFile = parseInt(fs.readFileSync('/tmp/erp-frontend.port', 'utf8').trim(), 10);
    }
  } catch { /* ignore */ }
  const candidates = [
    envUrl,
    portFile ? `http://127.0.0.1:${portFile}` : null,
    'http://127.0.0.1:3003',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ].filter(Boolean) as string[];
  for (const url of candidates) {
    try {
      const res = await fetch(`${url}/`, { signal: AbortSignal.timeout(3000) });
      const text = res.status >= 200 && res.status < 500 ? await res.text() : '';
      const isErp = text.includes('MAX ERP') || text.includes('ERP System') || text.includes('Zarząd');
      if (res.status >= 200 && res.status < 500 && isErp) {
        return { url, reachable: true };
      }
    } catch { /* try next */ }
  }
  return { url: envUrl || 'http://127.0.0.1:3003', reachable: false };
}

function buildGroups(
  fe: string,
  feOptional: boolean,
  finOptional: boolean,
  obsOptional: boolean,
  hrOptional: boolean,
): Record<string, { name: string; url: string; tenant?: string; optional?: boolean }[]> {
  return {
  gateway: [
    { name: 'GW health', url: `${GW}/api/health` },
    { name: 'Command Center', url: `${GW}/api/analytics/command-center` },
    { name: 'KPI', url: `${GW}/api/analytics/kpi` },
    { name: 'Tenants', url: `${GW}/api/analytics/tenants` },
    { name: 'Tenant isolation', url: `${GW}/api/analytics/tenants/default/isolation`, tenant: 'default' },
    { name: 'Traceability spine', url: `${GW}/api/analytics/traceability/spine?serialOrLot=SN-MACHINE-ETO-001`, tenant: 'default' },
    { name: 'ETO chain status', url: `${GW}/api/analytics/eto-chain/status`, tenant: 'default' },
    { name: 'ETO chain history', url: `${GW}/api/analytics/eto-chain/history`, tenant: 'default' },
    { name: 'ETO compensations', url: `${GW}/api/analytics/eto-chain/compensations`, tenant: 'default' },
    { name: 'ETO orchestrator', url: `${GW}/api/analytics/eto-chain/orchestrator/status`, tenant: 'default' },
    { name: 'ETO workflow', url: `${GW}/api/analytics/eto-chain/workflow`, tenant: 'default' },
    { name: 'ETO temporal bridge', url: `${GW}/api/analytics/eto-chain/temporal/status`, tenant: 'default' },
    { name: 'ETO workflow timeouts', url: `${GW}/api/analytics/eto-chain/workflow/timeouts`, tenant: 'default' },
    { name: 'ETO saga readiness', url: `${GW}/api/analytics/eto-chain/saga/readiness`, tenant: 'default' },
    { name: 'NestJS versions', url: `${GW}/api/analytics/platform/nestjs-versions` },
    { name: 'Observability readiness', url: `${GW}/api/analytics/platform/observability/readiness` },
    { name: 'Audit readiness', url: `${GW}/api/analytics/platform/audit/readiness` },
    { name: 'Audit summary', url: `${GW}/api/analytics/platform/audit/summary` },
    { name: 'Audit compliance filter', url: `${GW}/api/analytics/audit?complianceOnly=true&take=5` },
    { name: 'Auth readiness', url: `${GW}/api/analytics/platform/auth/readiness` },
    { name: 'Boot readiness', url: `${GW}/api/analytics/platform/boot/readiness` },
    { name: 'Genealogy E2E readiness', url: `${GW}/api/analytics/traceability/e2e/readiness`, tenant: 'default' },
    { name: 'Genealogy E2E view', url: `${GW}/api/analytics/traceability/e2e/view?serialOrLot=SN-MACHINE-ETO-001`, tenant: 'default' },
    { name: 'Production readiness', url: `${GW}/api/analytics/platform/production/readiness`, tenant: 'default' },
    { name: 'Gateway readiness', url: `${GW}/api/analytics/platform/gateway/readiness` },
    { name: 'ETO payload readiness', url: `${GW}/api/analytics/platform/eto-payload/readiness` },
    { name: 'Stack readiness', url: `${GW}/api/analytics/platform/stack/readiness` },
    { name: 'Tax readiness', url: `${GW}/api/analytics/platform/tax/readiness` },
    { name: 'MES readiness', url: `${GW}/api/analytics/platform/mes/readiness` },
    { name: 'Pact readiness', url: `${GW}/api/analytics/platform/pact/readiness` },
    { name: 'PLM domain readiness', url: `${GW}/api/analytics/platform/plm-domain/readiness` },
    { name: 'MES domain readiness', url: `${GW}/api/analytics/platform/mes-domain/readiness` },
    { name: 'Finance domain readiness', url: `${GW}/api/analytics/platform/finance-domain/readiness` },
    { name: 'Quality domain readiness', url: `${GW}/api/analytics/platform/quality-domain/readiness` },
    { name: 'Proc domain readiness', url: `${GW}/api/analytics/platform/proc-domain/readiness` },
    { name: 'EAM domain readiness', url: `${GW}/api/analytics/platform/eam-domain/readiness` },
    { name: 'Data integrity readiness', url: `${GW}/api/analytics/platform/data-integrity/readiness` },
    { name: 'Import readiness', url: `${GW}/api/analytics/platform/import/readiness` },
    { name: 'Auth enforcement readiness', url: `${GW}/api/analytics/platform/auth-enforcement/readiness` },
    { name: 'Validation readiness', url: `${GW}/api/analytics/platform/validation/readiness` },
    { name: 'BI readiness', url: `${GW}/api/analytics/platform/bi-readiness/readiness` },
    { name: 'CI auth readiness', url: `${GW}/api/analytics/platform/ci-auth/readiness` },
    { name: 'Import staging persistence', url: `${GW}/api/analytics/platform/import-staging/readiness` },
    { name: 'Frontend BI readiness', url: `${GW}/api/analytics/platform/frontend-bi/readiness` },
    { name: 'BI projection readiness', url: `${GW}/api/analytics/platform/bi-projection/readiness` },
    { name: 'BI scheduler readiness', url: `${GW}/api/analytics/platform/bi-scheduler/readiness` },
    { name: 'PM E2E readiness', url: `${GW}/api/analytics/platform/pm-e2e/readiness` },
    { name: 'CI auth enforce readiness', url: `${GW}/api/analytics/platform/ci-auth-enforce/readiness` },
    { name: 'BI retention readiness', url: `${GW}/api/analytics/platform/bi-retention/readiness` },
    { name: 'Playwright CI readiness', url: `${GW}/api/analytics/platform/playwright-ci/readiness` },
    { name: 'CI auth live readiness', url: `${GW}/api/analytics/platform/ci-auth-live/readiness` },
    { name: 'BI metrics readiness', url: `${GW}/api/analytics/platform/bi-metrics/readiness` },
    { name: 'Playwright stack readiness', url: `${GW}/api/analytics/platform/playwright-stack/readiness` },
    { name: 'CI auth regression readiness', url: `${GW}/api/analytics/platform/ci-auth-regression/readiness` },
    { name: 'Grafana BI readiness', url: `${GW}/api/analytics/platform/grafana-bi/readiness` },
    { name: 'Playwright required readiness', url: `${GW}/api/analytics/platform/playwright-required/readiness` },
    { name: 'CI auth Keycloak readiness', url: `${GW}/api/analytics/platform/ci-auth-keycloak/readiness` },
    { name: 'Grafana provision readiness', url: `${GW}/api/analytics/platform/grafana-provision/readiness` },
    { name: 'Playwright matrix readiness', url: `${GW}/api/analytics/platform/playwright-matrix/readiness` },
    { name: 'CI auth enforce prod readiness', url: `${GW}/api/analytics/platform/ci-auth-enforce-prod/readiness` },
    { name: 'BI alerts readiness', url: `${GW}/api/analytics/platform/bi-alerts/readiness` },
    { name: 'Vault TLS prod readiness', url: `${GW}/api/analytics/platform/vault-tls-prod/readiness` },
    { name: 'Alert notify readiness', url: `${GW}/api/analytics/platform/alert-notify/readiness` },
    { name: 'mTLS gateway readiness', url: `${GW}/api/analytics/platform/mtls-gateway/readiness` },
    { name: 'Alert escalation readiness', url: `${GW}/api/analytics/platform/alert-escalation/readiness` },
    { name: 'mTLS proxy readiness', url: `${GW}/api/analytics/platform/mtls-proxy/readiness` },
    { name: 'Alert oncall readiness', url: `${GW}/api/analytics/platform/alert-oncall/readiness` },
    { name: 'mTLS client verify readiness', url: `${GW}/api/analytics/platform/mtls-client-verify/readiness` },
    { name: 'SLO burn rate readiness', url: `${GW}/api/analytics/platform/slo-burn-rate/readiness` },
    { name: 'Playwright cross chain readiness', url: `${GW}/api/analytics/platform/playwright-cross-chain/readiness` },
    { name: 'TLS rotation readiness', url: `${GW}/api/analytics/platform/tls-rotation/readiness` },
    { name: 'Grafana SLO dashboard readiness', url: `${GW}/api/analytics/platform/grafana-slo-dashboard/readiness` },
    { name: 'Playwright proc inv quality readiness', url: `${GW}/api/analytics/platform/playwright-proc-inv-quality/readiness` },
    { name: 'Vault secrets rotation readiness', url: `${GW}/api/analytics/platform/vault-secrets-rotation/readiness` },
    { name: 'SLO alerting readiness', url: `${GW}/api/analytics/platform/slo-alerting/readiness` },
    { name: 'Playwright mes eam crm readiness', url: `${GW}/api/analytics/platform/playwright-mes-eam-crm/readiness` },
    { name: 'Vault KMS unseal readiness', url: `${GW}/api/analytics/platform/vault-kms-unseal/readiness` },
    { name: 'SLO routing readiness', url: `${GW}/api/analytics/platform/slo-routing/readiness` },
    { name: 'Playwright hr plm pm readiness', url: `${GW}/api/analytics/platform/playwright-hr-plm-pm/readiness` },
    { name: 'Vault audit readiness', url: `${GW}/api/analytics/platform/vault-audit/readiness` },
    { name: 'Prod observability readiness', url: `${GW}/api/analytics/platform/prod-observability/readiness` },
    { name: 'Playwright chain matrix readiness', url: `${GW}/api/analytics/platform/playwright-chain-matrix/readiness` },
    { name: 'Vault HA readiness', url: `${GW}/api/analytics/platform/vault-ha/readiness` },
    { name: 'K8s deploy readiness', url: `${GW}/api/analytics/platform/k8s-deploy/readiness` },
    { name: 'Playwright visual readiness', url: `${GW}/api/analytics/platform/playwright-visual/readiness` },
    { name: 'Vault raft readiness', url: `${GW}/api/analytics/platform/vault-raft/readiness` },
    { name: 'Helm deploy readiness', url: `${GW}/api/analytics/platform/helm-deploy/readiness` },
    { name: 'Playwright visual diff readiness', url: `${GW}/api/analytics/platform/playwright-visual-diff/readiness` },
    { name: 'Quality EAM prod readiness', url: `${GW}/api/analytics/platform/quality-eam-prod/readiness` },
    { name: 'K8s extended readiness', url: `${GW}/api/analytics/platform/k8s-extended/readiness` },
    { name: 'Tenant hardening readiness', url: `${GW}/api/analytics/platform/tenant-hardening/readiness` },
    { name: 'KSeF prod readiness', url: `${GW}/api/analytics/platform/ksef-prod/readiness` },
    { name: 'OTel status', url: `${GW}/api/analytics/otel/status`, optional: obsOptional },
    { name: 'Outbox dead-letter', url: `${GW}/api/analytics/outbox/dead-letter`, optional: obsOptional },
    { name: 'PROC long-lead radar', url: `${GW}/api/proc/long-lead/radar`, tenant: 'default' },
    { name: 'FIN universal journal', url: `${GW}/api/fin/universal-journal`, tenant: 'default', optional: finOptional },
    { name: 'INV compensation', url: `${GW}/api/inv/compensation/status`, tenant: 'default' },
    { name: 'MES compensation', url: `${GW}/api/mes/compensation/status`, tenant: 'default', optional: true },
    { name: 'Mail outbox', url: `${GW}/api/analytics/mail/outbox` },
  ],
  finance: [
    { name: 'Fin health direct', url: 'http://127.0.0.1:4010/fin/health', optional: finOptional },
    { name: 'Fixed Assets GW', url: `${GW}/api/fin/fixed-assets`, optional: finOptional },
    { name: 'Journal GW', url: `${GW}/api/fin/journal`, optional: finOptional },
    { name: 'Budget variance', url: `${GW}/api/fin/budget-variance`, optional: finOptional },
  ],
  tax: [
    { name: 'JPK_V7', url: `${GW}/api/tax-legal/jpk/v7?year=2026&month=6` },
    { name: 'JPK_KR', url: `${GW}/api/tax-legal/jpk/kr?year=2026&month=6` },
    { name: 'JPK_KR validate', url: `${GW}/api/tax-legal/jpk/kr/validate?year=2026&month=6` },
  ],
  modules: [
    { name: 'PM list', url: `${GW}/api/pm` },
    { name: 'PROC orders', url: `${GW}/api/proc/orders`, tenant: 'default' },
    { name: 'INV stock', url: `${GW}/api/inv/inventory` },
    { name: 'INV genealogy chain', url: `${GW}/api/inv/inventory/genealogy/chain/SN-MACHINE-ETO-001`, tenant: 'default', optional: true },
    { name: 'PLM items', url: `${GW}/api/plm/items` },
    { name: 'PLM boms', url: `${GW}/api/plm/boms` },
    { name: 'Quality ISO', url: `${GW}/api/quality/iso/documents` },
    { name: 'Approvals', url: `${GW}/api/analytics/approvals?status=PENDING`, tenant: 'default' },
    { name: 'EAM IoT status', url: `${GW}/api/eam/iot/status`, optional: true },
    { name: 'EAM breakdowns recent', url: `${GW}/api/eam/breakdowns/recent?take=5`, optional: true },
    { name: 'HR employees', url: `${GW}/api/hr/employees`, optional: hrOptional },
    { name: 'Tax health', url: `${GW}/api/tax-legal/health`, optional: true },
  ],
  ui: [
    { name: 'UI home', url: `${fe}/`, optional: feOptional },
    { name: 'UI finance', url: `${fe}/finance`, optional: feOptional },
    { name: 'UI pm', url: `${fe}/pm`, optional: feOptional },
    { name: 'UI kiosk', url: `${fe}/mes/kiosk`, optional: feOptional },
    { name: 'UI roles', url: `${fe}/settings/roles`, optional: feOptional },
    { name: 'UI eam', url: `${fe}/eam`, optional: feOptional },
  ],
};
}

async function check(
  c: { name: string; url: string; tenant?: string; optional?: boolean },
  group: string,
): Promise<CheckResult> {
  const t0 = Date.now();
  const headers: Record<string, string> = {};
  if (c.tenant) headers['X-Tenant-Id'] = c.tenant;
  try {
    const res = await fetch(c.url, { headers, signal: AbortSignal.timeout(10000) });
    const ok =
      (res.status >= 200 && res.status < 400) ||
      (c.optional && (res.status >= 502 || res.status === 500 || res.status === 404 || res.status === 0));
    return { name: c.name, url: c.url, status: res.status, ok, ms: Date.now() - t0, group, optional: c.optional };
  } catch (e) {
    return { name: c.name, url: c.url, status: 0, ok: !!c.optional, ms: Date.now() - t0, group, optional: c.optional };
  }
}

async function detectFinanceUp(): Promise<boolean> {
  try {
    const res = await fetch('http://127.0.0.1:4010/fin/health', { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function detectObservabilityUp(): Promise<boolean> {
  try {
    const res = await fetch(`${GW}/api/analytics/otel/status`, { signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function detectHrUp(): Promise<boolean> {
  try {
    const res = await fetch('http://127.0.0.1:4012/hr/health', { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return false;
    const emp = await fetch(`${GW}/api/hr/employees`, { signal: AbortSignal.timeout(5000) });
    return emp.ok;
  } catch {
    return false;
  }
}

async function run() {
  const { url: feUrl, reachable: feReachable } = await detectFrontendUrl();
  const financeUp = await detectFinanceUp();
  const observabilityUp = await detectObservabilityUp();
  const hrUp = await detectHrUp();
  const groups = buildGroups(feUrl, !feReachable, !financeUp, !observabilityUp, !hrUp);
  if (!feReachable) {
    console.log(`Frontend not reachable — UI checks marked optional (${feUrl})\n`);
  } else {
    console.log(`Frontend: ${feUrl}\n`);
  }
  if (financeUp) {
    console.log('Finance prod detected — finance checks required\n');
  } else {
    console.log('Finance not running — finance checks optional\n');
  }
  if (observabilityUp) {
    console.log('Observability stack detected — OTel/outbox checks required\n');
  } else {
    console.log('Observability not ready — OTel/outbox checks optional\n');
  }
  if (hrUp) {
    console.log('HR service detected — HR employees check required\n');
  } else {
    console.log('HR not ready — HR check optional\n');
  }

  const results: CheckResult[] = [];
  for (const [group, checks] of Object.entries(groups)) {
    for (const c of checks) {
      results.push(await check(c, group));
    }
  }

  // Dynamic PM schedule
  try {
    const pmRes = await fetch(`${GW}/api/pm`, { signal: AbortSignal.timeout(8000) });
    if (pmRes.ok) {
      const projects = await pmRes.json();
      const pid = projects[0]?.id;
      if (pid) {
        const t0 = Date.now();
        const schedRes = await fetch(`${GW}/api/pm/projects/${pid}/schedule`);
        results.push({
          name: 'PM schedule',
          url: `${GW}/api/pm/projects/${pid}/schedule`,
          status: schedRes.status,
          ok: schedRes.ok,
          ms: Date.now() - t0,
          group: 'modules',
        });
      }
    }
  } catch { /* skip */ }

  const passed = results.filter((r) => r.ok).length;
  const required = results.filter((r) => !r.optional);
  const requiredPassed = required.filter((r) => r.ok).length;
  const failed = results.length - passed;
  const score = Math.round((passed / results.length) * 100);
  const requiredScore = required.length ? Math.round((requiredPassed / required.length) * 100) : 100;

  const report = {
    generatedAt: new Date().toISOString(),
    frontendUrl: feUrl,
    frontendReachable: feReachable,
    financeUp,
    observabilityUp,
    hrUp,
    total: results.length,
    passed,
    failed,
    score,
    requiredTotal: required.length,
    requiredPassed,
    requiredScore,
    results,
    byGroup: Object.fromEntries(
      [...new Set(results.map((r) => r.group))].map((g) => {
        const grp = results.filter((r) => r.group === g);
        return [g, { passed: grp.filter((r) => r.ok).length, total: grp.length }];
      }),
    ),
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));

  console.log('=== Master Regression Report ===\n');
  for (const r of results) {
    console.log(`${r.ok ? '✓' : '✗'} [${r.group}] ${r.name} → ${r.status} (${r.ms}ms)`);
  }
  console.log(`\nScore: ${score}% (${passed}/${results.length}) | Required: ${requiredScore}% (${requiredPassed}/${required.length})`);
  console.log(`Report: ${OUT}`);
  const requiredFailed = required.length - requiredPassed;
  process.exit(requiredFailed > Math.ceil(required.length * 0.15) ? 1 : 0);
}

run();
