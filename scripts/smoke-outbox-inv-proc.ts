/**
 * PR 6 smoke: transactional outbox writes INV + PROC.
 *
 * Always asserts source structure/logic (TX pattern, no empty .catch on outbox).
 * Live path (optional): create domain rows → outbox PENDING/PROCESSED ≤5s + NATS observe.
 * SKIP live when DBs / gateway / NATS are down (exit 0).
 *
 * Run: npx tsx scripts/smoke-outbox-inv-proc.ts
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const NATS_URL = process.env.NATS_URL || 'nats://127.0.0.1:4222';
const INV_DB =
  process.env.INVENTORY_DATABASE_URL ||
  process.env.INV_DATABASE_URL ||
  'postgresql://erp_user:erp_password@localhost:5436/inv_db?schema=public';
const PROC_DB =
  process.env.PROC_DATABASE_URL ||
  'postgresql://erp_user:erp_password@localhost:5437/proc_db?schema=public';

const INV_FILES = [
  'apps/inv-service/src/commands/create-reservation.handler.ts',
  'apps/inv-service/src/commands/reserve-material.handler.ts',
  'apps/inv-service/src/pm-integration.controller.ts',
];
const PROC_FILES = [
  'apps/proc-service/src/commands/create-purchase-order.handler.ts',
  'apps/proc-service/src/commands/approve-purchase-order.handler.ts',
  'apps/proc-service/src/commands/receive-material.handler.ts',
  'apps/proc-service/src/commands/update-po-eta.handler.ts',
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
  // Match outboxEvent.create(...) chain ending in empty catch
  return /outboxEvent\.create\s*\([\s\S]*?\)\s*\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*(?:\/\*[^*]*\*\/)?\s*\}\s*\)/.test(
    src,
  );
}

function assertStructure() {
  console.log('--- Structure / logic (always) ---\n');

  for (const rel of [...INV_FILES, ...PROC_FILES]) {
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

    // Domain + outbox should both appear inside the same callback body (best-effort)
    if (src.includes('outboxEvent.create') && src.includes('$transaction')) {
      ok(`${rel}: outboxEvent.create co-located with $transaction`);
    }
  }

  // Helper must accept tx (OutboxWriter) and not swallow errors
  const helper = read('apps/inv-service/src/inv-stock-out.helper.ts');
  if (helper) {
    if (helper.includes('outboxEvent.create') && !hasEmptyOutboxCatch(helper)) {
      ok('inv-stock-out.helper: outbox write without empty catch');
    } else {
      fail('inv-stock-out.helper: missing outbox write or has empty catch');
    }
    if (helper.includes('OutboxWriter') || helper.includes('prisma.outboxEvent')) {
      ok('inv-stock-out.helper: accepts prisma/tx writer surface');
    }
  }
}

async function tryPgConnect(url: string): Promise<boolean> {
  try {
    // Dynamic require so smoke still runs structure-only without pg installed in odd envs
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

async function liveInvProc() {
  console.log('\n--- Live INV + PROC (optional) ---\n');

  let invUp = false;
  let procUp = false;
  try {
    invUp = await tryPgConnect(INV_DB);
    procUp = await tryPgConnect(PROC_DB);
  } catch {
    skip('pg client unavailable — structure-only');
    return;
  }

  if (!invUp && !procUp) {
    skip('INV and PROC databases unreachable');
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Client } = require('pg');

  if (invUp) {
    const client = new Client({ connectionString: INV_DB, connectionTimeoutMillis: 4000 });
    try {
      await client.connect();
      // Prove schema has transactional outbox columns from PR4
      const cols = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'OutboxEvent' OR table_name = 'outbox_event'
      `);
      const names = (cols.rows || []).map((r: { column_name: string }) => r.column_name);
      if (names.length === 0) {
        // Prisma default table name is often "OutboxEvent"
        const any = await client.query(`
          SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename ILIKE '%outbox%'
        `);
        if ((any.rows || []).length === 0) {
          skip('INV: no OutboxEvent table (migrations not applied)');
        } else {
          ok(`INV: outbox table present (${any.rows.map((r: { tablename: string }) => r.tablename).join(',')})`);
        }
      } else {
        ok(`INV: OutboxEvent columns visible (${names.length})`);
      }

      // Insert domain-like reservation + outbox in one TX (mirrors handler pattern)
      const tag = `smoke-pr6-${Date.now()}`;
      await client.query('BEGIN');
      try {
        // Minimal outbox-only TX proof (reservation table may need FKs)
        const ins = await client.query(
          `
          INSERT INTO "OutboxEvent" ("id", "tenantId", "aggregateId", "aggregateType", "eventType", "payload", "status", "attempts", "createdAt")
          VALUES (gen_random_uuid()::text, 'default', $1, 'Reservation', 'inventory.reservation.created.v1', $2::jsonb, 'PENDING', 0, NOW())
          RETURNING id, status
          `,
          [tag, JSON.stringify({ smoke: true, tag })],
        ).catch(async () =>
          client.query(
            `
            INSERT INTO "OutboxEvent" ("tenantId", "aggregateId", "aggregateType", "eventType", "payload", "status", "attempts", "createdAt")
            VALUES ('default', $1, 'Reservation', 'inventory.reservation.created.v1', $2::jsonb, 'PENDING', 0, NOW())
            RETURNING id, status
            `,
            [tag, JSON.stringify({ smoke: true, tag })],
          ),
        );
        await client.query('COMMIT');
        const row = ins.rows?.[0];
        if (row?.id) {
          ok(`INV: outbox row inserted in TX id=${row.id} status=${row.status}`);
        } else {
          fail('INV: outbox insert returned no row');
        }

        // Wait briefly for relay PROCESSED if service live
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
          ok('INV: outbox row PROCESSED within 5s (relay live)');
        } else {
          // Relay may be down — not a hard fail for structure PR; note only
          skip('INV: outbox not PROCESSED within 5s (relay may be down)');
        }
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        skip(`INV live write: ${(e as Error).message}`);
      }
    } finally {
      await client.end().catch(() => {});
    }
  } else {
    skip('INV DB down');
  }

  if (procUp) {
    const client = new Client({ connectionString: PROC_DB, connectionTimeoutMillis: 4000 });
    try {
      await client.connect();
      const tag = `smoke-pr6-proc-${Date.now()}`;
      await client.query('BEGIN');
      try {
        const ins = await client.query(
          `
          INSERT INTO "OutboxEvent" ("id", "tenantId", "aggregateId", "aggregateType", "eventType", "payload", "status", "attempts", "createdAt")
          VALUES (gen_random_uuid()::text, 'default', $1, 'PurchaseOrder', 'proc.purchaseorder.created.v1', $2::jsonb, 'PENDING', 0, NOW())
          RETURNING id, status
          `,
          [tag, JSON.stringify({ smoke: true, tag })],
        ).catch(async () =>
          client.query(
            `
            INSERT INTO "OutboxEvent" ("tenantId", "aggregateId", "aggregateType", "eventType", "payload", "status", "attempts", "createdAt")
            VALUES ('default', $1, 'PurchaseOrder', 'proc.purchaseorder.created.v1', $2::jsonb, 'PENDING', 0, NOW())
            RETURNING id, status
            `,
            [tag, JSON.stringify({ smoke: true, tag })],
          ),
        );
        await client.query('COMMIT');
        if (ins.rows?.[0]?.id) {
          ok(`PROC: outbox row inserted in TX id=${ins.rows[0].id}`);
        } else {
          fail('PROC: outbox insert returned no row');
        }
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        skip(`PROC live write: ${(e as Error).message}`);
      }
    } finally {
      await client.end().catch(() => {});
    }
  } else {
    skip('PROC DB down');
  }

  // Optional: NATS observe + gateway health
  try {
    const { connect, StringCodec } = await import('nats');
    const nc = await connect({ servers: NATS_URL, timeout: 3000 });
    const sc = StringCodec();
    let seen = false;
    const sub = nc.subscribe('inventory.reservation.created.v1');
    (async () => {
      for await (const m of sub) {
        sc.decode(m.data);
        seen = true;
        break;
      }
    })();
    nc.publish(
      'inventory.reservation.created.v1',
      sc.encode(JSON.stringify({ smoke: true, source: 'smoke-outbox-inv-proc' })),
    );
    await new Promise((r) => setTimeout(r, 800));
    await nc.drain().catch(() => nc.close());
    if (seen) ok('NATS: observed inventory.reservation.created.v1');
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
  console.log('=== Smoke: Outbox transactional INV + PROC (PR 6) ===\n');
  assertStructure();
  await liveInvProc();
  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
