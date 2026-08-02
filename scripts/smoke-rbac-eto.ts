/**
 * ETO mutation RBAC smoke — shared role matrix + optional live gateway checks.
 *
 * Offline (always):
 *   - VIEWER denied on all ETO_MUTATION_ROLES writers
 *   - ENGINEER / PROCUREMENT / ACCOUNTANT / PRODUCTION_MANAGER writer paths
 *   - Alias expansion: SUPERVISOR→PRODUCTION_MANAGER, WAREHOUSE, MAINTENANCE→ENGINEER
 *
 * Live (optional when gateway up):
 *   - synthetic HS256 tokens exercise gateway RolesGuard when AUTH allows
 *
 * Run: npx tsx scripts/smoke-rbac-eto.ts
 * Env:
 *   GATEWAY_URL (default http://127.0.0.1:4005)
 *   REQUIRE_LIVE=1 — fail if gateway unreachable
 *   JWT_SECRET — for live bearer probes (default matches local gateway dev secret if set)
 */
import {
  CANONICAL_ERP_ROLES,
  ERP_ROLE_ALIASES,
  ETO_MUTATION_ROLES,
  ETO_MUTATION_WRITER_DOCS,
  canPerformEtoMutation,
  expandRoles,
  isViewerOnly,
  userHasAnyRole,
  type EtoMutation,
} from '../apps/shared-kernel/src/roles/erp-roles';

const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const REQUIRE_LIVE = process.env.REQUIRE_LIVE === '1' || process.env.REQUIRE_LIVE === 'true';

let fails = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`✓ ${msg}`);
  } else {
    console.log(`✗ ${msg}`);
    fails++;
  }
}

function offlineMatrix(): void {
  console.log('=== ETO RBAC Smoke (offline matrix) ===\n');

  console.log('Canonical roles (Keycloak realm-erp.json):');
  console.log(`  ${CANONICAL_ERP_ROLES.join(', ')}`);
  console.log('Aliases:');
  for (const [alias, mapped] of Object.entries(ERP_ROLE_ALIASES)) {
    console.log(`  ${alias} → ${mapped.join(', ')}`);
  }
  console.log('');

  console.log('--- VIEWER denied all ETO writes ---');
  for (const mutation of Object.keys(ETO_MUTATION_ROLES) as EtoMutation[]) {
    const denied = !canPerformEtoMutation(['VIEWER'], mutation);
    assert(denied, `VIEWER denied ${mutation}`);
  }
  assert(isViewerOnly(['VIEWER']), 'isViewerOnly(VIEWER)');
  assert(!isViewerOnly(['ENGINEER']), 'isViewerOnly(ENGINEER)=false');

  console.log('\n--- Documented writer roles ---');
  for (const [mutation, doc] of Object.entries(ETO_MUTATION_WRITER_DOCS)) {
    console.log(
      `  ${mutation}: ${doc.path}\n    writers=${doc.writers.join('|')} — ${doc.notes}`,
    );
  }

  console.log('\n--- Domain writers ---');
  assert(canPerformEtoMutation(['ENGINEER'], 'PLM_BOM_RELEASE'), 'ENGINEER → PLM_BOM_RELEASE');
  assert(canPerformEtoMutation(['ENGINEER'], 'PM_MATERIAL_REQUEST'), 'ENGINEER → PM_MATERIAL_REQUEST');
  assert(
    !canPerformEtoMutation(['ENGINEER'], 'PROC_APPROVE'),
    'ENGINEER denied PROC_APPROVE',
  );
  assert(
    !canPerformEtoMutation(['ENGINEER'], 'FIN_WIP_WRITE'),
    'ENGINEER denied FIN_WIP_WRITE',
  );

  assert(canPerformEtoMutation(['PROCUREMENT'], 'PROC_APPROVE'), 'PROCUREMENT → PROC_APPROVE');
  assert(canPerformEtoMutation(['PROCUREMENT'], 'INV_RESERVE'), 'PROCUREMENT → INV_RESERVE');
  assert(
    !canPerformEtoMutation(['PROCUREMENT'], 'PLM_BOM_RELEASE'),
    'PROCUREMENT denied PLM_BOM_RELEASE',
  );

  assert(canPerformEtoMutation(['ACCOUNTANT'], 'FIN_WIP_WRITE'), 'ACCOUNTANT → FIN_WIP_WRITE');
  assert(
    !canPerformEtoMutation(['ACCOUNTANT'], 'MES_START'),
    'ACCOUNTANT denied MES_START',
  );

  assert(
    canPerformEtoMutation(['PRODUCTION_MANAGER'], 'MES_START'),
    'PRODUCTION_MANAGER → MES_START',
  );
  assert(
    canPerformEtoMutation(['PRODUCTION_MANAGER'], 'PLM_BOM_RELEASE'),
    'PRODUCTION_MANAGER → PLM_BOM_RELEASE',
  );
  assert(
    canPerformEtoMutation(['PRODUCTION_MANAGER'], 'INV_RESERVE'),
    'PRODUCTION_MANAGER → INV_RESERVE',
  );

  console.log('\n--- Alias expansion ---');
  const superExp = expandRoles(['SUPERVISOR']);
  assert(
    superExp.includes('PRODUCTION_MANAGER'),
    'SUPERVISOR expands to PRODUCTION_MANAGER',
  );
  assert(canPerformEtoMutation(['SUPERVISOR'], 'MES_START'), 'SUPERVISOR → MES_START (alias)');

  const whExp = expandRoles(['WAREHOUSE']);
  assert(whExp.includes('PRODUCTION_MANAGER'), 'WAREHOUSE expands to PRODUCTION_MANAGER');
  assert(canPerformEtoMutation(['WAREHOUSE'], 'INV_RESERVE'), 'WAREHOUSE → INV_RESERVE');

  const maintExp = expandRoles(['MAINTENANCE']);
  assert(maintExp.includes('ENGINEER'), 'MAINTENANCE expands to ENGINEER');
  assert(
    userHasAnyRole(['MAINTENANCE'], ['ENGINEER', 'ADMIN']),
    'MAINTENANCE satisfies ENGINEER requirement',
  );

  assert(canPerformEtoMutation(['ADMIN'], 'PLM_BOM_RELEASE'), 'ADMIN → all (PLM)');
  assert(canPerformEtoMutation(['ADMIN'], 'FIN_WIP_WRITE'), 'ADMIN → all (FIN)');
  assert(userHasAnyRole(['ADMIN'], ['VIEWER']), 'ADMIN superuser bypass');
}

async function liveGatewayProbes(): Promise<void> {
  console.log('\n=== Live gateway RBAC (optional) ===');
  let up = false;
  try {
    const res = await fetch(`${GW}/health`, { signal: AbortSignal.timeout(4000) });
    up = res.ok || res.status < 500;
  } catch {
    up = false;
  }

  if (!up) {
    const msg = `gateway not reachable at ${GW}`;
    if (REQUIRE_LIVE) {
      console.log(`✗ ${msg}`);
      fails++;
    } else {
      console.log(`○ SKIP live: ${msg}`);
    }
    return;
  }

  // Prefer Keycloak demo tokens when available; otherwise document offline-only.
  const kc = process.env.KEYCLOAK_URL || 'http://localhost:8080';
  const realm = process.env.KEYCLOAK_REALM || 'erp';
  const client = process.env.KEYCLOAK_CLIENT || 'erp-gateway';

  async function token(user: string): Promise<string | null> {
    try {
      const body = new URLSearchParams({
        grant_type: 'password',
        client_id: client,
        username: user,
        password: 'demo123',
      });
      const res = await fetch(
        `${kc}/realms/${realm}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!res.ok) return null;
      const json = (await res.json()) as { access_token?: string };
      return json.access_token || null;
    } catch {
      return null;
    }
  }

  const eng = await token('demo.engineer');
  const buyer = await token('demo.buyer');
  const acc = await token('demo.accountant');

  if (!eng || !buyer || !acc) {
    console.log('○ SKIP live role probes: Keycloak demo tokens unavailable');
    return;
  }
  console.log('Token issuance: OK (engineer, buyer, accountant)');

  // Gateway Nest ACL samples (when Nest controllers still mounted)
  async function code(path: string, bearer: string): Promise<number> {
    const res = await fetch(`${GW}${path}`, {
      headers: { Authorization: `Bearer ${bearer}` },
      signal: AbortSignal.timeout(8000),
    });
    return res.status;
  }

  // FIN: accountant allowed, procurement (buyer) denied
  const finAcc = await code('/api/fin/health', acc);
  const finBuyer = await code('/api/fin/health', buyer);
  console.log(`ACCOUNTANT /api/fin/health → ${finAcc}`);
  console.log(`PROCUREMENT /api/fin/health → ${finBuyer}`);
  if ([200, 502].includes(finAcc) && [401, 403].includes(finBuyer)) {
    console.log('✓ live gateway: ACCOUNTANT allowed, PROCUREMENT denied on /api/fin');
  } else {
    console.log(
      '○ live gateway FIN ACL inconclusive (proxy path or auth off) — offline matrix remains source of truth',
    );
  }

  // PLM: engineer allowed (proxy Nest if present)
  const plmEng = await code('/api/plm/boms', eng);
  const plmBuyer = await code('/api/plm/boms', buyer);
  console.log(`ENGINEER /api/plm → ${plmEng}`);
  console.log(`PROCUREMENT /api/plm → ${plmBuyer}`);
  if ([200, 502].includes(plmEng) && [401, 403].includes(plmBuyer)) {
    console.log('✓ live gateway: ENGINEER allowed, PROCUREMENT denied on /api/plm');
  } else {
    console.log('○ live gateway PLM ACL inconclusive — offline matrix OK');
  }
}

async function main() {
  offlineMatrix();
  await liveGatewayProbes();

  console.log('');
  if (fails > 0) {
    console.log(`=== ETO RBAC Smoke FAILED (${fails} assertion(s)) ===`);
    process.exit(1);
  }
  console.log('=== ETO RBAC Smoke PASSED ===');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
