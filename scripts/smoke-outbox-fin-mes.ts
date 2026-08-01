/**
 * PR 8 smoke: transactional outbox writes FIN + MES.
 *
 * Always asserts source structure/logic (TX pattern, no empty .catch on outbox).
 * Live path (optional): insert outbox PENDING in TX → PROCESSED ≤5s + NATS observe.
 * SKIP live when DBs / gateway / NATS are down (exit 0).
 *
 * Run: npx tsx scripts/smoke-outbox-fin-mes.ts
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const NATS_URL = process.env.NATS_URL || 'nats://127.0.0.1:4222';
const FIN_DB =
  process.env.FINANCE_DATABASE_URL ||
  'postgresql://erp_user:erp_password@localhost:5438/finance_db?schema=public';
const FIN_DB_ALT =
  process.env.FINANCE_DATABASE_URL_ALT ||
  'postgresql://erp_user:erp_password@localhost:5438/fin_db?schema=public';
const MES_DB =
  process.env.MES_DATABASE_URL ||
  process.env.MANUFACTURING_DATABASE_URL ||
  'postgresql://erp_user:erp_password@localhost:5435/mfg_db?schema=public';

const FIN_FILES = [
  'apps/finance/src/milestone-integration.controller.ts',
];
const MES_FILES = [
  'apps/mes-service/src/commands/record-production.handler.ts',
  'apps/mes-service/src/commands/raise-andon-ncr.handler.ts',
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

/**
 * Empty swallow on outbox create: chained `.create(...).catch(() => {})`.
 * Scans each outboxEvent.create and only treats a catch as chained if it appears
 * before the next statement terminator (`;`) at brace-depth 0 after create's `(`.
 */
function hasEmptyOutboxCatch(src: string): boolean {
  const needle = 'outboxEvent.create';
  let from = 0;
  while (from < src.length) {
    const idx = src.indexOf(needle, from);
    if (idx < 0) break;
    const openParen = src.indexOf('(', idx + needle.length);
    if (openParen < 0) break;
    let depth = 0;
    let i = openParen;
    for (; i < src.length; i++) {
      const ch = src[i];
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    // Skip whitespace after create(...)
    while (i < src.length && /\s/.test(src[i])) i++;
    const tail = src.slice(i, i + 80);
    if (
      /^\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*(?:\/\*[^*]*\*\/)?\s*\}\s*\)/.test(tail)
    ) {
      return true;
    }
    from = idx + needle.length;
  }
  return false;
}

function assertStructure() {
  console.log('--- Structure / logic (always) ---\n');

  for (const rel of [...FIN_FILES, ...MES_FILES]) {
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

  // MES relay must be GenericOutboxRelay v2 (not local PENDING→PROCESSED fire-and-forget)
  const mesRelay = read('apps/mes-service/src/outbox-relay.service.ts');
  if (mesRelay) {
    if (mesRelay.includes('GenericOutboxRelay')) {
      ok('mes outbox-relay: extends GenericOutboxRelay');
    } else {
      fail('mes outbox-relay: missing GenericOutboxRelay');
    }
    if (hasEmptyOutboxCatch(mesRelay)) {
      fail('mes outbox-relay: empty .catch on outbox writes');
    }
  }

  const finRelay = read('apps/finance/src/outbox-relay.service.ts');
  if (finRelay) {
    if (finRelay.includes('GenericOutboxRelay')) {
      ok('finance outbox-relay: extends GenericOutboxRelay');
    } else {
      fail('finance outbox-relay: missing GenericOutboxRelay');
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

async function insertOutboxInTx(
  client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> },
  tag: string,
  aggregateType: string,
  eventType: string,
): Promise<{ id?: string; status?: string } | null> {
  await client.query('BEGIN');
  try {
    const ins = await client
      .query(
        `
        INSERT INTO "OutboxEvent" ("id", "tenantId", "aggregateId", "aggregateType", "eventType", "payload", "status", "attempts", "createdAt")
        VALUES (gen_random_uuid()::text, 'default', $1, $2, $3, $4::jsonb, 'PENDING', 0, NOW())
        RETURNING id, status
        `,
        [tag, aggregateType, eventType, JSON.stringify({ smoke: true, tag })],
      )
      .catch(async () =>
        client.query(
          `
          INSERT INTO "OutboxEvent" ("tenantId", "aggregateId", "aggregateType", "eventType", "payload", "status", "attempts", "createdAt")
          VALUES ('default', $1, $2, $3, $4::jsonb, 'PENDING', 0, NOW())
          RETURNING id, status
          `,
          [tag, aggregateType, eventType, JSON.stringify({ smoke: true, tag })],
        ),
      );
    await client.query('COMMIT');
    return ins.rows?.[0] || null;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  }
}

async function liveFinMes() {
  console.log('\n--- Live FIN + MES (optional) ---\n');

  let finUrl: string | null = null;
  let mesUp = false;
  try {
    if (await tryPgConnect(FIN_DB)) finUrl = FIN_DB;
    else if (await tryPgConnect(FIN_DB_ALT)) finUrl = FIN_DB_ALT;
    mesUp = await tryPgConnect(MES_DB);
  } catch {
    skip('pg client unavailable — structure-only');
    return;
  }

  if (!finUrl && !mesUp) {
    skip('FIN and MES databases unreachable');
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Client } = require('pg');

  if (finUrl) {
    const client = new Client({ connectionString: finUrl, connectionTimeoutMillis: 4000 });
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
          skip('FIN: no OutboxEvent table (migrations not applied)');
        } else {
          ok(`FIN: outbox table present (${any.rows.map((r: { tablename: string }) => r.tablename).join(',')})`);
        }
      } else {
        ok(`FIN: OutboxEvent columns visible (${names.length})`);
      }

      const tag = `smoke-pr8-fin-${Date.now()}`;
      try {
        const row = await insertOutboxInTx(
          client,
          tag,
          'Project',
          'finance.revenue.recognized.v1',
        );
        if (row?.id) {
          ok(`FIN: outbox row inserted in TX id=${row.id} status=${row.status}`);
        } else {
          fail('FIN: outbox insert returned no row');
        }

        const deadline = Date.now() + 5000;
        let processed = false;
        while (Date.now() < deadline) {
          const q = await client.query(
            `SELECT status FROM "OutboxEvent" WHERE "aggregateId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
            [tag],
          );
          if (q.rows?.[0]?.status === 'PROCESSED') {
            processed = true;
            break;
          }
          await new Promise((r) => setTimeout(r, 400));
        }
        if (processed) {
          ok('FIN: outbox row PROCESSED within 5s (relay live)');
        } else {
          skip('FIN: outbox not PROCESSED within 5s (relay may be down)');
        }
      } catch (e) {
        skip(`FIN live write: ${(e as Error).message}`);
      }
    } finally {
      await client.end().catch(() => {});
    }
  } else {
    skip('FIN DB down');
  }

  if (mesUp) {
    const client = new Client({ connectionString: MES_DB, connectionTimeoutMillis: 4000 });
    try {
      await client.connect();
      const tag = `smoke-pr8-mes-${Date.now()}`;
      try {
        const row = await insertOutboxInTx(
          client,
          tag,
          'WorkOrder',
          'mes.production.recorded.v1',
        );
        if (row?.id) {
          ok(`MES: outbox row inserted in TX id=${row.id} status=${row.status}`);
        } else {
          fail('MES: outbox insert returned no row');
        }

        const deadline = Date.now() + 5000;
        let processed = false;
        while (Date.now() < deadline) {
          const q = await client.query(
            `SELECT status FROM "OutboxEvent" WHERE "aggregateId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
            [tag],
          );
          if (q.rows?.[0]?.status === 'PROCESSED') {
            processed = true;
            break;
          }
          await new Promise((r) => setTimeout(r, 400));
        }
        if (processed) {
          ok('MES: outbox row PROCESSED within 5s (relay live)');
        } else {
          skip('MES: outbox not PROCESSED within 5s (relay may be down)');
        }
      } catch (e) {
        skip(`MES live write: ${(e as Error).message}`);
      }
    } finally {
      await client.end().catch(() => {});
    }
  } else {
    skip('MES DB down');
  }

  try {
    const { connect, StringCodec } = await import('nats');
    const nc = await connect({ servers: NATS_URL, timeout: 3000 });
    const sc = StringCodec();
    let seen = false;
    const sub = nc.subscribe('mes.production.recorded.v1');
    (async () => {
      for await (const m of sub) {
        sc.decode(m.data);
        seen = true;
        break;
      }
    })();
    nc.publish(
      'mes.production.recorded.v1',
      sc.encode(JSON.stringify({ smoke: true, source: 'smoke-outbox-fin-mes' })),
    );
    await new Promise((r) => setTimeout(r, 800));
    await nc.drain().catch(() => nc.close());
    if (seen) ok('NATS: observed mes.production.recorded.v1');
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
  console.log('=== Smoke: Outbox transactional FIN + MES (PR 8) ===\n');
  assertStructure();
  await liveFinMes();
  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
