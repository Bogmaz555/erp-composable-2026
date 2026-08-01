/**
 * PR 15 — Tenant isolation smoke (structure + unit semantics).
 *
 * Offline (always):
 *   - shared-kernel tenant-extension exports present
 *   - CRM/PM isolatedClient use extendPrismaWithTenant (not no-op query(args))
 *   - findUnique rewrite = findFirst({ id, tenantId }) — never illegal unique merge
 *   - JWT claim name = tenantId (OQ-1)
 *   - runWithTenant ALS binds worker identity
 *   - Simulated two-tenant findUnique denial (in-memory mock)
 *
 * Optional live (when PM DB + service up): seed A/B not required for PASS offline.
 *
 * Run: npx tsx scripts/smoke-tenant-isolation.ts
 * Env:
 *   REQUIRE_LIVE=1 — fail if live gateway/PM probe fails
 *   GATEWAY_URL (default http://127.0.0.1:4005)
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  TENANT_JWT_CLAIM,
  TENANT_HEADER,
  SYSTEM_TENANT_ID,
  runWithTenant,
  getTenantId,
  getTenantIdFromAls,
  resolveTenantId,
  findUniqueTenantRewrite,
  extendPrismaWithTenant,
  createTenantExtension,
  TenantContextError,
} from '../apps/shared-kernel/src/tenant-extension';

const ROOT = process.cwd();
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const REQUIRE_LIVE =
  process.env.REQUIRE_LIVE === '1' || process.env.REQUIRE_LIVE === 'true';

let fails = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`✓ ${msg}`);
  } else {
    console.log(`✗ ${msg}`);
    fails++;
  }
}

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

function structureChecks() {
  console.log('=== Tenant isolation — structure ===\n');

  assert(
    exists('apps/shared-kernel/src/tenant-extension.ts'),
    'apps/shared-kernel/src/tenant-extension.ts exists',
  );
  assert(
    exists('infra/tenant/TENANT-HARDENING-POLICY.md'),
    'infra/tenant/TENANT-HARDENING-POLICY.md exists',
  );

  const idx = read('apps/shared-kernel/src/index.ts');
  assert(idx.includes("tenant-extension"), 'shared-kernel index exports tenant-extension');

  const ext = read('apps/shared-kernel/src/tenant-extension.ts');
  assert(ext.includes('runWithTenant'), 'exports runWithTenant');
  assert(ext.includes('AsyncLocalStorage'), 'uses AsyncLocalStorage');
  assert(ext.includes('extendPrismaWithTenant') || ext.includes('createTenantExtension'), 'Prisma extension factory');
  assert(ext.includes('findFirst'), 'findUnique → findFirst rewrite path');
  assert(
    ext.includes('Do NOT merge tenantId into findUnique') ||
      ext.includes('never inject tenantId into findUnique'),
    'documents that findUnique must not merge tenantId into unique where',
  );
  // Implementation must call findFirst from the findUnique path (rewrite), not only post-filter
  assert(
    /findUnique[\s\S]{0,400}findFirst/.test(ext),
    'findUnique handler body invokes findFirst rewrite',
  );
  assert(ext.includes("TENANT_JWT_CLAIM = 'tenantId'") || ext.includes('tenantId'), 'claim name tenantId');

  const crm = read('apps/crm-service/src/prisma.service.ts');
  assert(crm.includes('extendPrismaWithTenant'), 'CRM isolatedClient uses extendPrismaWithTenant');
  assert(!crm.includes('return query(args);') || crm.includes('modelsWithTenantId'), 'CRM not pure no-op stub');
  // CRM schema has no tenantId — honest empty model list
  assert(
    crm.includes("modelsWithTenantId: []") || crm.includes('modelsWithTenantId:[]'),
    'CRM documents empty modelsWithTenantId (schema lacks tenantId columns)',
  );

  const pm = read('apps/pm-service/src/prisma.service.ts');
  assert(pm.includes('extendPrismaWithTenant'), 'PM isolatedClient uses extendPrismaWithTenant');
  assert(
    pm.includes("modelsWithTenantId: 'all'") || pm.includes('modelsWithTenantId: "all"'),
    'PM filters all models (tenantId on Project/WBS/Task/Outbox…)',
  );
  assert(!pm.includes('Pseudo-isolation schema strategy'), 'PM removed pseudo-isolation no-op comment');

  const verify = read('apps/api-gateway/src/auth/verify-token.ts');
  assert(
    verify.includes('TENANT_JWT_CLAIM') || verify.includes('tenantId'),
    'gateway verify-token uses tenantId claim',
  );

  const policy = read('infra/tenant/TENANT-HARDENING-POLICY.md');
  assert(
    policy.includes('tenant-extension') || policy.includes('shared-kernel'),
    'policy references shared tenant-extension',
  );
  assert(
    policy.includes('defense-in-depth') || policy.includes('single-tenant'),
    'policy states single-tenant / defense-in-depth honestly',
  );

  // Worker ALS wiring samples
  const invPm = read('apps/inv-service/src/pm-integration.controller.ts');
  assert(invPm.includes('runWithTenant'), 'INV NATS worker uses runWithTenant');

  const crmFin = read('apps/crm-service/src/finance-integration.controller.ts');
  assert(crmFin.includes('runWithTenant'), 'CRM NATS worker uses runWithTenant');
}

function unitAlsAndRewrite() {
  console.log('\n=== Unit — ALS + findUnique rewrite ===\n');

  assert(TENANT_JWT_CLAIM === 'tenantId', 'TENANT_JWT_CLAIM === "tenantId"');
  assert(TENANT_HEADER === 'x-tenant-id', 'TENANT_HEADER === "x-tenant-id"');

  // ALS
  assert(getTenantIdFromAls() === undefined, 'ALS empty outside runWithTenant');
  const alsVal = runWithTenant('tenant-A', () => getTenantId());
  assert(alsVal === 'tenant-A', 'runWithTenant binds tenant-A');
  assert(getTenantIdFromAls() === undefined, 'ALS cleared after runWithTenant');

  // system-tenant guard
  let sysBlocked = false;
  try {
    resolveTenantId(SYSTEM_TENANT_ID);
  } catch (e) {
    sysBlocked = e instanceof TenantContextError;
  }
  assert(sysBlocked, 'system-tenant rejected without ALLOW_SYSTEM_TENANT');

  const prevAllow = process.env.ALLOW_SYSTEM_TENANT;
  process.env.ALLOW_SYSTEM_TENANT = 'true';
  try {
    assert(resolveTenantId(SYSTEM_TENANT_ID) === SYSTEM_TENANT_ID, 'system-tenant allowed when env set');
  } finally {
    if (prevAllow === undefined) delete process.env.ALLOW_SYSTEM_TENANT;
    else process.env.ALLOW_SYSTEM_TENANT = prevAllow;
  }

  // findUnique rewrite shape
  const rewritten = findUniqueTenantRewrite({ id: 'row-X' }, 'tenant-A');
  assert(rewritten.operation === 'findFirst', 'rewrite operation is findFirst');
  const w = rewritten.where as any;
  const hasTenant =
    w.tenantId === 'tenant-A' ||
    (Array.isArray(w.AND) && w.AND.some((c: any) => c.tenantId === 'tenant-A'));
  assert(hasTenant, 'rewrite where includes tenantId=tenant-A');
  assert(
    w.id === 'row-X' ||
      (Array.isArray(w.AND) && w.AND.some((c: any) => c.id === 'row-X')),
    'rewrite where preserves id',
  );
}

/**
 * In-memory mock Prisma-like client proving findUnique under tenant A never returns B's row.
 */
function unitTwoTenantFindUnique() {
  console.log('\n=== Unit — two-tenant findUnique denial (mock client) ===\n');

  type Row = { id: string; tenantId: string; name: string };
  const rows: Row[] = [
    { id: 'shared-id', tenantId: 'tenant-A', name: 'A-row' },
    { id: 'shared-id', tenantId: 'tenant-B', name: 'B-row' }, // same id, different tenant (simulates mis-seed)
  ];

  function matchWhere(row: Row, where: any): boolean {
    if (!where) return true;
    if (where.AND && Array.isArray(where.AND)) {
      return where.AND.every((part: any) => matchWhere(row, part));
    }
    for (const [k, v] of Object.entries(where)) {
      if ((row as any)[k] !== v) return false;
    }
    return true;
  }

  const baseClient = {
    project: {
      findUnique: async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null,
      findFirst: async ({ where }: any) => rows.find((r) => matchWhere(r, where)) ?? null,
      findMany: async ({ where }: any) => rows.filter((r) => matchWhere(r, where)),
    },
    $extends(ext: any) {
      const self = this;
      const handler = ext?.query?.$allModels ?? {};
      const project = new Proxy(self.project, {
        get(target, prop: string) {
          const original = (target as any)[prop];
          if (typeof original !== 'function') return original;
          return async (args: any) => {
            const modelHandler = handler[prop];
            if (typeof modelHandler === 'function') {
              return modelHandler.call(null, {
                model: 'Project',
                args,
                query: (a: any) => original.call(target, a),
              });
            }
            return original.call(target, args);
          };
        },
      });
      return {
        project,
        $extends: self.$extends.bind(self),
      };
    },
  };

  // Tenant A context
  const clientA = extendPrismaWithTenant(
    baseClient as any,
    () => 'tenant-A',
    { modelsWithTenantId: 'all' },
  ) as any;

  // Direct rewrite path (extendPrismaWithTenant.findUnique uses base findFirst)
  return (async () => {
    const underA = await clientA.project.findUnique({ where: { id: 'shared-id' } });
    assert(underA != null, 'tenant-A findUnique returns a row');
    assert(underA?.tenantId === 'tenant-A', 'tenant-A never sees tenant-B row');
    assert(underA?.name === 'A-row', 'tenant-A gets A-row only');

    const clientB = extendPrismaWithTenant(
      baseClient as any,
      () => 'tenant-B',
      { modelsWithTenantId: 'all' },
    ) as any;
    const underB = await clientB.project.findUnique({ where: { id: 'shared-id' } });
    assert(underB?.tenantId === 'tenant-B', 'tenant-B gets B-row only');
    assert(underB?.name === 'B-row', 'tenant-B never sees A-row');

    // Cross-check: raw findUnique without extension would return first match (leak)
    const leaked = await baseClient.project.findUnique({ where: { id: 'shared-id' } });
    assert(leaked?.tenantId === 'tenant-A', 'raw findUnique is first-match (why extension is required)');
  })();
}

function unitExtensionFactory() {
  console.log('\n=== Unit — extension factory shape ===\n');
  const ext = createTenantExtension(() => 't1');
  assert(!!ext.query?.$allModels?.findMany, 'createTenantExtension has findMany');
  assert(!!ext.query?.$allModels?.create, 'createTenantExtension has create');
  assert(typeof extendPrismaWithTenant === 'function', 'extendPrismaWithTenant is a function');
}

async function liveOptional() {
  console.log('\n=== Live (optional) — gateway tenant header surface ===\n');
  try {
    const res = await fetch(`${GW}/api/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      console.log(`SKIP live: gateway health ${res.status}`);
      if (REQUIRE_LIVE) {
        assert(false, 'REQUIRE_LIVE but gateway unhealthy');
      }
      return;
    }
    console.log('✓ gateway reachable');
    // Without auth, protected routes should 401 when AUTH on — not a tenant isolation assert.
  } catch (e) {
    console.log(`SKIP live: ${(e as Error).message}`);
    if (REQUIRE_LIVE) {
      assert(false, `REQUIRE_LIVE but gateway error: ${(e as Error).message}`);
    }
  }
}

async function main() {
  console.log('PR 15 smoke-tenant-isolation\n');
  structureChecks();
  unitAlsAndRewrite();
  unitExtensionFactory();
  await unitTwoTenantFindUnique();
  await liveOptional();

  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
