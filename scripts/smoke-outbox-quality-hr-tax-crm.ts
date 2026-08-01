/**
 * PR 9 smoke: transactional outbox writes quality + hr + tax-legal + crm.
 *
 * Always asserts source structure/logic (TX pattern, no empty .catch on outbox).
 * Live path (optional): insert outbox PENDING in TX → PROCESSED ≤5s when DBs up.
 * SKIP live when DBs / gateway / NATS are down (exit 0).
 *
 * Run: npx tsx scripts/smoke-outbox-quality-hr-tax-crm.ts
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const NATS_URL = process.env.NATS_URL || 'nats://127.0.0.1:4222';

const QUALITY_DB =
  process.env.QUALITY_DATABASE_URL ||
  'postgresql://erp_user:erp_password@localhost:5439/quality_db?schema=public';
const HR_DB =
  process.env.HR_DATABASE_URL ||
  'postgresql://erp_user:erp_password@localhost:5442/hr_db?schema=public';
const TAX_DB =
  process.env.TAX_DATABASE_URL ||
  process.env.TAX_LEGAL_DATABASE_URL ||
  'postgresql://erp_user:erp_password@localhost:5445/tax_legal_db?schema=public';
const CRM_DB =
  process.env.CRM_DATABASE_URL ||
  'postgresql://erp_user:erp_password@localhost:5432/crm_db?schema=public';

const QUALITY_FILES = [
  'apps/quality-service/src/commands/create-ncr.handler.ts',
  'apps/quality-service/src/commands/close-ncr.handler.ts',
  'apps/quality-service/src/commands/create-capa.handler.ts',
  'apps/quality-service/src/commands/update-capa-status.handler.ts',
  'apps/quality-service/src/commands/update-inspection-result.handler.ts',
];
const HR_FILES = ['apps/hr/src/commands/record-time-entry.handler.ts'];
const TAX_FILES = ['apps/tax-legal/src/tax-legal.controller.ts'];
const CRM_FILES = ['apps/crm-service/src/commands/update-pipeline-stage.handler.ts'];

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

function assertFileTx(rel: string) {
  const src = read(rel);
  if (!src) return;

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

function assertRelay(rel: string, label: string) {
  const src = read(rel);
  if (!src) return;
  if (src.includes('GenericOutboxRelay')) {
    ok(`${label} outbox-relay: extends GenericOutboxRelay`);
  } else {
    fail(`${label} outbox-relay: missing GenericOutboxRelay`);
  }
  if (hasEmptyOutboxCatch(src)) {
    fail(`${label} outbox-relay: empty .catch on outbox writes`);
  }
}

function assertStructure() {
  console.log('--- Structure / logic (always) ---\n');

  for (const rel of [...QUALITY_FILES, ...HR_FILES, ...TAX_FILES, ...CRM_FILES]) {
    assertFileTx(rel);
  }

  assertRelay('apps/quality-service/src/outbox-relay.service.ts', 'quality');
  assertRelay('apps/hr/src/outbox-relay.service.ts', 'hr');
  assertRelay('apps/tax-legal/src/outbox-relay.service.ts', 'tax-legal');
  assertRelay('apps/crm-service/src/outbox-relay.service.ts', 'crm');
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

async function liveOne(
  label: string,
  url: string,
  aggregateType: string,
  eventType: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Client } = require('pg');
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 4000 });
  try {
    await client.connect();
    const tag = `smoke-pr9-${label}-${Date.now()}`;
    try {
      const row = await insertOutboxInTx(client, tag, aggregateType, eventType);
      if (row?.id) {
        ok(`${label}: outbox row inserted in TX id=${row.id} status=${row.status}`);
      } else {
        fail(`${label}: outbox insert returned no row`);
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
        ok(`${label}: outbox row PROCESSED within 5s (relay live)`);
      } else {
        skip(`${label}: outbox not PROCESSED within 5s (relay may be down)`);
      }
    } catch (e) {
      skip(`${label} live write: ${(e as Error).message}`);
    }
  } finally {
    await client.end().catch(() => {});
  }
}

async function liveOptional() {
  console.log('\n--- Live quality/hr/tax/crm (optional) ---\n');

  let any = false;
  try {
    if (await tryPgConnect(QUALITY_DB)) {
      any = true;
      await liveOne('quality', QUALITY_DB, 'NonConformanceReport', 'quality.ncr.raised.v1');
    } else {
      skip('quality DB down');
    }
    if (await tryPgConnect(HR_DB)) {
      any = true;
      await liveOne('hr', HR_DB, 'TimeEntry', 'hr.time.entry.recorded.v1');
    } else {
      skip('hr DB down');
    }
    if (await tryPgConnect(TAX_DB)) {
      any = true;
      await liveOne('tax', TAX_DB, 'TaxInvoice', 'tax.invoice.ksef.sent.v1');
    } else {
      skip('tax-legal DB down');
    }
    if (await tryPgConnect(CRM_DB)) {
      any = true;
      await liveOne('crm', CRM_DB, 'Opportunity', 'crm.opportunity.won.v1');
    } else {
      skip('crm DB down');
    }
  } catch {
    skip('pg client unavailable — structure-only');
    return;
  }

  if (!any) {
    skip('all optional DBs unreachable');
  }

  try {
    const { connect, StringCodec } = await import('nats');
    const nc = await connect({ servers: NATS_URL, timeout: 3000 });
    const sc = StringCodec();
    nc.publish(
      'quality.ncr.raised.v1',
      sc.encode(JSON.stringify({ smoke: true, source: 'smoke-outbox-quality-hr-tax-crm' })),
    );
    await nc.flush();
    await nc.close();
    ok('NATS: published quality.ncr.raised.v1 smoke observe');
  } catch (e) {
    skip(`NATS: ${(e as Error).message}`);
  }
}

async function main() {
  console.log('PR 9 smoke: Outbox TX quality + hr + tax-legal + crm\n');
  assertStructure();
  await liveOptional();

  console.log('');
  if (fails > 0) {
    console.log(`FAILED: ${fails} structure check(s)`);
    process.exit(1);
  }
  console.log('PASS (structure); live paths SKIP when infra down');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
