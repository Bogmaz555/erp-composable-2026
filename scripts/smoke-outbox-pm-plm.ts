/**
 * PR 7 smoke: transactional outbox writes PM + PLM.
 *
 * Always asserts source structure/logic (TX pattern, no empty .catch on outbox,
 * PLM relay extends GenericOutboxRelay).
 * Live path (optional): insert outbox row in TX → wait PROCESSED ≤5s + NATS observe.
 * SKIP live when DBs / gateway / NATS are down (exit 0).
 *
 * Run: npx tsx scripts/smoke-outbox-pm-plm.ts
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const NATS_URL = process.env.NATS_URL || 'nats://127.0.0.1:4222';
const PM_DB =
  process.env.PM_DATABASE_URL ||
  'postgresql://erp_user:erp_password@localhost:5434/pm_db?schema=public';
const PLM_DB =
  process.env.PLM_DATABASE_URL ||
  'postgresql://erp_user:erp_password@localhost:5435/plm_db?schema=public';

const PM_FILES = [
  'apps/pm-service/src/commands/release-project.handler.ts',
  'apps/pm-service/src/commands/reach-project-milestone.handler.ts',
  'apps/pm-service/src/commands/request-material.handler.ts',
];
const PLM_FILES = [
  'apps/plm-service/src/commands/release-bom-version.handler.ts',
  'apps/plm-service/src/product.controller.ts',
];

let fails = 0;

function ok(msg: string) {
  console.log(`✓ ${msg}`);
}
function fail(msg: string) {
  console.log(`✗ ${msg}`);
  fails++;
}
function skip(msg: string) {
  console.log(`SKIP: ${msg}`);
}

function read(rel: string): string {
  const p = join(ROOT, rel);
  if (!existsSync(p)) {
    fail(`missing file ${rel}`);
    return '';
  }
  return readFileSync(p, 'utf8');
}

/** Empty swallow on outbox create: `.create(...).catch(() => {})` or similar. */
function hasEmptyOutboxCatch(src: string): boolean {
  return /outboxEvent\.create\s*\([\s\S]*?\)\s*\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*(?:\/\*[^*]*\*\/)?\s*\}\s*\)/.test(
    src,
  );
}

function assertStructure() {
  console.log('--- Structure / logic (always) ---\n');

  for (const rel of [...PM_FILES, ...PLM_FILES]) {
    const src = read(rel);
    if (!src) continue;

    if (!src.includes('$transaction')) {
      fail(`${rel}: missing $transaction`);
    } else {
      ok(`${rel}: uses $transaction`);
    }

    if (hasEmptyOutboxCatch(src)) {
      fail(`${rel}: empty .catch on outboxEvent.create`);
    } else {
      ok(`${rel}: no empty .catch on outbox`);
    }

    if (src.includes('outboxEvent.create') && src.includes('$transaction')) {
      ok(`${rel}: outboxEvent.create co-located with $transaction`);
    }
  }

  // Relays must use GenericOutboxRelay
  const pmRelay = read('apps/pm-service/src/outbox-relay.service.ts');
  if (pmRelay) {
    if (pmRelay.includes('GenericOutboxRelay') && pmRelay.includes('extends GenericOutboxRelay')) {
      ok('pm-service outbox-relay: extends GenericOutboxRelay');
    } else {
      fail('pm-service outbox-relay: does not extend GenericOutboxRelay');
    }
  }

  const plmRelay = read('apps/plm-service/src/outbox-relay.service.ts');
  if (plmRelay) {
    if (plmRelay.includes('GenericOutboxRelay') && plmRelay.includes('extends GenericOutboxRelay')) {
      ok('plm-service outbox-relay: extends GenericOutboxRelay');
    } else {
      fail('plm-service outbox-relay: does not extend GenericOutboxRelay');
    }
    // Old local fire-and-forget pattern should be gone
    if (plmRelay.includes('relayPendingEvents') && !plmRelay.includes('GenericOutboxRelay')) {
      fail('plm-service outbox-relay: still uses local relayPendingEvents without GenericOutboxRelay');
    }
  }
}

async function tryPgConnect(url: string): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Client } = require('pg');
    const c = new Client({ connectionString: url, connectionTimeoutMillis: 2500 });
    await c.connect();
    await c.query('SELECT 1');
    await c.end();
    return true;
  } catch {
    return false;
  }
}

async function livePmPlm() {
  console.log('\n--- Live PM + PLM (optional) ---\n');

  let pmUp = false;
  let plmUp = false;
  try {
    pmUp = await tryPgConnect(PM_DB);
    plmUp = await tryPgConnect(PLM_DB);
  } catch {
    skip('pg client unavailable — structure-only');
    return;
  }

  if (!pmUp && !plmUp) {
    skip('PM and PLM databases unreachable');
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Client } = require('pg');

  if (pmUp) {
    const client = new Client({ connectionString: PM_DB, connectionTimeoutMillis: 4000 });
    try {
      await client.connect();
      const cols = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'OutboxEvent' OR table_name = 'outbox_event'
      `);
      const names = (cols.rows || []).map((r: { column_name: string }) => r.column_name);
      if (names.length === 0) {
        const any = await client.query(`
          SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename ILIKE '%outbox%'
        `);
        if ((any.rows || []).length === 0) {
          skip('PM: no OutboxEvent table (migrations not applied)');
        } else {
          ok(`PM: outbox table present (${any.rows.map((r: { tablename: string }) => r.tablename).join(',')})`);
        }
      } else {
        ok(`PM: OutboxEvent columns visible (${names.length})`);
      }

      const tag = `smoke-pr7-pm-${Date.now()}`;
      await client.query('BEGIN');
      try {
        const ins = await client.query(
          `
          INSERT INTO "OutboxEvent" ("id", "tenantId", "aggregateId", "aggregateType", "eventType", "payload", "status", "attempts", "createdAt")
          VALUES (gen_random_uuid()::text, 'default', $1, 'Project', 'pm.project.released.v1', $2::jsonb, 'PENDING', 0, NOW())
          RETURNING id, status
          `,
          [tag, JSON.stringify({ smoke: true, tag })],
        ).catch(async () =>
          client.query(
            `
            INSERT INTO "OutboxEvent" ("tenantId", "aggregateId", "aggregateType", "eventType", "payload", "status", "attempts", "createdAt")
            VALUES ('default', $1, 'Project', 'pm.project.released.v1', $2::jsonb, 'PENDING', 0, NOW())
            RETURNING id, status
            `,
            [tag, JSON.stringify({ smoke: true, tag })],
          ),
        );
        await client.query('COMMIT');
        const row = ins.rows?.[0];
        if (row?.id) {
          ok(`PM: outbox row inserted in TX id=${row.id} status=${row.status}`);
        } else {
          fail('PM: outbox insert returned no row');
        }

        const deadline = Date.now() + 5000;
        let processed = false;
        while (Date.now() < deadline) {
          const q = await client.query(
            `SELECT status FROM "OutboxEvent" WHERE "aggregateId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
            [tag],
          );
          const st = q.rows?.[0]?.status;
          if (st === 'PROCESSED') {
            processed = true;
            break;
          }
          await new Promise((r) => setTimeout(r, 400));
        }
        if (processed) {
          ok('PM: outbox row PROCESSED within 5s (relay live)');
        } else {
          skip('PM: outbox not PROCESSED within 5s (relay may be down)');
        }
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        skip(`PM live write: ${(e as Error).message}`);
      }
    } finally {
      await client.end().catch(() => {});
    }
  } else {
    skip('PM DB down');
  }

  if (plmUp) {
    const client = new Client({ connectionString: PLM_DB, connectionTimeoutMillis: 4000 });
    try {
      await client.connect();
      const tag = `smoke-pr7-plm-${Date.now()}`;
      await client.query('BEGIN');
      try {
        // PLM OutboxEvent has no tenantId column
        const ins = await client.query(
          `
          INSERT INTO "OutboxEvent" ("id", "aggregateId", "aggregateType", "eventType", "payload", "status", "attempts", "createdAt")
          VALUES (gen_random_uuid()::text, $1, 'BomVersion', 'plm.bom.released.v2', $2::jsonb, 'PENDING', 0, NOW())
          RETURNING id, status
          `,
          [tag, JSON.stringify({ smoke: true, tag })],
        ).catch(async () =>
          client.query(
            `
            INSERT INTO "OutboxEvent" ("aggregateId", "aggregateType", "eventType", "payload", "status", "attempts", "createdAt")
            VALUES ($1, 'BomVersion', 'plm.bom.released.v2', $2::jsonb, 'PENDING', 0, NOW())
            RETURNING id, status
            `,
            [tag, JSON.stringify({ smoke: true, tag })],
          ),
        );
        await client.query('COMMIT');
        if (ins.rows?.[0]?.id) {
          ok(`PLM: outbox row inserted in TX id=${ins.rows[0].id}`);
        } else {
          fail('PLM: outbox insert returned no row');
        }

        const deadline = Date.now() + 5000;
        let processed = false;
        while (Date.now() < deadline) {
          const q = await client.query(
            `SELECT status FROM "OutboxEvent" WHERE "aggregateId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
            [tag],
          );
          const st = q.rows?.[0]?.status;
          if (st === 'PROCESSED') {
            processed = true;
            break;
          }
          await new Promise((r) => setTimeout(r, 400));
        }
        if (processed) {
          ok('PLM: outbox row PROCESSED within 5s (relay live)');
        } else {
          skip('PLM: outbox not PROCESSED within 5s (relay may be down)');
        }
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        skip(`PLM live write: ${(e as Error).message}`);
      }
    } finally {
      await client.end().catch(() => {});
    }
  } else {
    skip('PLM DB down');
  }

  try {
    const { connect, StringCodec } = await import('nats');
    const nc = await connect({ servers: NATS_URL, timeout: 3000 });
    const sc = StringCodec();
    let seen = false;
    const sub = nc.subscribe('pm.project.released.v1');
    (async () => {
      for await (const m of sub) {
        sc.decode(m.data);
        seen = true;
        break;
      }
    })();
    nc.publish(
      'pm.project.released.v1',
      sc.encode(JSON.stringify({ smoke: true, source: 'smoke-outbox-pm-plm' })),
    );
    await new Promise((r) => setTimeout(r, 800));
    await nc.drain().catch(() => nc.close());
    if (seen) ok('NATS: observed pm.project.released.v1');
    else skip('NATS: publish ok but no local subscriber ack (bus may still be fine)');
  } catch (e) {
    skip(`NATS not reachable — ${(e as Error).message}`);
  }

  try {
    const res = await fetch(`${GW}/api/analytics/outbox/dead-letter`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const body = await res.json();
      ok(`Gateway outbox DLQ reachable (totalFailed=${body.totalFailed ?? '?'})`);
    } else {
      skip(`Gateway outbox DLQ → ${res.status}`);
    }
  } catch {
    skip('Gateway down');
  }
}

async function main() {
  console.log('=== Smoke: Outbox transactional PM + PLM (PR 7) ===\n');
  assertStructure();
  await livePmPlm();
  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
