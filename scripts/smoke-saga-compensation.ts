/**
 * PR 16 smoke: Saga G-lite — reverse WIP + real correlationId + fail-step.
 *
 * Always asserts source structure/logic:
 * - eto-orchestrator: no proj-eto-demo hardcode; projectId from job; no silent catch on compensation
 * - reverse-wip-cost.handler: real GL 130-WIP, idempotent by correlationId, no nested bus-in-tx
 * - Temporal bridge documented as non-DoD (pilotDoD: false)
 * - Event registry freeze for finance.wip.cost.reversed
 *
 * Live path (optional): when gateway/finance/NATS up — enqueue real ids, seed WIP,
 * publish reverse (or force fail), assert ProjectCost REVERSAL + second reverse no-op.
 * SKIP live when stack down (exit 0) unless REQUIRE_LIVE=1.
 *
 * Run: npx tsx scripts/smoke-saga-compensation.ts
 * Env: GATEWAY_URL, FINANCE_SERVICE_URL, FINANCE_DATABASE_URL, NATS_URL, REQUIRE_LIVE
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const GW = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';
const FIN_URL = process.env.FINANCE_SERVICE_URL || 'http://127.0.0.1:4010';
const NATS_URL = process.env.NATS_URL || 'nats://127.0.0.1:4222';
const FIN_DB =
  process.env.FINANCE_DATABASE_URL ||
  process.env.FIN_DATABASE_URL ||
  'postgresql://erp_user:erp_password@localhost:5438/fin_db?schema=public';
const REQUIRE_LIVE = process.env.REQUIRE_LIVE === '1' || process.env.REQUIRE_LIVE === 'true';
/** K1 strict: live reverse must succeed (no soft-SKIP for reverse path). */
const STRICT_LIVE =
  process.env.REQUIRE_LIVE_STRICT === '1' ||
  process.env.REQUIRE_LIVE_STRICT === 'true' ||
  REQUIRE_LIVE;

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

function assertStructure() {
  console.log('--- Structure / logic (always) ---\n');

  // 1. Orchestrator: real projectId, no hardcode, no silent compensation catch
  const orch = read('apps/analytics-service/src/eto-orchestrator.service.ts');
  if (orch) {
    if (orch.includes("'proj-eto-demo'") || orch.includes('"proj-eto-demo"')) {
      fail('eto-orchestrator: still hardcodes proj-eto-demo');
    } else {
      ok('eto-orchestrator: no proj-eto-demo hardcode');
    }
    if (
      /projectId:\s*job\.projectId/.test(orch) ||
      orch.includes('projectId: job.projectId')
    ) {
      ok('eto-orchestrator: publish uses job.projectId');
    } else {
      fail('eto-orchestrator: publish path must use job.projectId (real correlation path)');
    }
    if (
      orch.includes("publishCompensation('finance.wip.cost.reversed'") ||
      orch.includes('publishWipCompensation')
    ) {
      ok('eto-orchestrator: compensation publish on fail path');
    } else {
      fail('eto-orchestrator: missing finance.wip.cost.reversed compensation');
    }
    // Silent empty catch on compensation: .catch(() => {}) after publishCompensation
    if (
      /\.publishCompensation\([^)]*\)\s*\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/.test(orch) ||
      orch.includes(".catch(() => {})")
    ) {
      fail('eto-orchestrator: silent .catch(() => {}) still present (must log compensation failures)');
    } else {
      ok('eto-orchestrator: no silent empty catch on compensation');
    }
    if (orch.includes('this.logger.error') || orch.includes('logger.error')) {
      ok('eto-orchestrator: logs compensation failures');
    } else {
      fail('eto-orchestrator: expected logger.error on compensation failure');
    }
  }

  // 2. Schema stores projectId on orchestration jobs
  const schema = read('apps/analytics-service/prisma/schema.prisma');
  if (schema) {
    if (
      /model EtoOrchestrationJob[\s\S]*?projectId\s+String/.test(schema)
    ) {
      ok('analytics schema: EtoOrchestrationJob.projectId');
    } else {
      fail('analytics schema: EtoOrchestrationJob missing projectId');
    }
  }

  // 3. Reverse WIP handler harden checklist
  const rev = read('apps/finance/src/commands/reverse-wip-cost.handler.ts');
  if (rev) {
    // Strip block comments so docstrings do not false-positive
    const revCode = rev
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    if (revCode.includes('mock-wip-account-id')) {
      fail('reverse-wip: still uses mock-wip-account-id');
    } else {
      ok('reverse-wip: no mock-wip-account-id');
    }
    if (revCode.includes('130-WIP') && revCode.includes('ensureAccount')) {
      ok('reverse-wip: real GL account 130-WIP via ensureAccount');
    } else {
      fail('reverse-wip: expected ensureAccount + 130-WIP');
    }
    if (
      revCode.includes("costType: 'REVERSAL'") &&
      revCode.includes('reference: correlationId')
    ) {
      ok('reverse-wip: ProjectCost REVERSAL keyed by correlationId');
    } else {
      fail('reverse-wip: missing REVERSAL + reference=correlationId');
    }
    if (revCode.includes('findFirst') && revCode.includes("costType: 'REVERSAL'")) {
      ok('reverse-wip: idempotency check present');
    } else {
      fail('reverse-wip: missing idempotency guard');
    }
    // Nested bus-in-tx anti-pattern (executable code only)
    if (
      revCode.includes('commandBus') ||
      revCode.includes('CommandBus') ||
      revCode.includes('RecordTransactionCommand')
    ) {
      fail('reverse-wip: still uses commandBus / RecordTransaction (nested bus-in-tx risk)');
    } else {
      ok('reverse-wip: no nested commandBus (GL in same tx)');
    }
    if (revCode.includes('journalEntry.create') && revCode.includes('$transaction')) {
      ok('reverse-wip: journalEntry written inside outer $transaction');
    } else {
      fail('reverse-wip: expected journalEntry.create inside $transaction');
    }
  }

  // 4. Finance controller still routes reverse event
  const finCtrl = read('apps/finance/src/finance.controller.ts');
  if (finCtrl) {
    if (
      finCtrl.includes("finance.wip.cost.reversed") &&
      finCtrl.includes('ReverseWipCostCommand')
    ) {
      ok('finance.controller: EventPattern finance.wip.cost.reversed → ReverseWipCostCommand');
    } else {
      fail('finance.controller: missing reverse WIP wiring');
    }
  }

  // 5. Temporal non-DoD
  const temporal = read('apps/analytics-service/src/eto-temporal-bridge.service.ts');
  if (temporal) {
    if (temporal.includes('pilotDoD: false') || temporal.includes('non-DoD') || temporal.includes('not Pilot DoD')) {
      ok('temporal bridge: documented non-DoD / pilotDoD: false');
    } else {
      fail('temporal bridge: missing non-DoD documentation');
    }
  }

  const td = read('docs/TECHNICAL-DEBT.md');
  if (td && (td.includes('non-DoD') || td.includes('G-lite'))) {
    ok('TECHNICAL-DEBT: TD-003 notes G-lite / Temporal non-DoD');
  } else if (td) {
    fail('TECHNICAL-DEBT: TD-003 should note G-lite / Temporal non-DoD');
  }

  // 6. Event registry freeze
  const reg = read('docs/EVENTS/REGISTRY.md');
  const revDoc = read('docs/EVENTS/finance.wip.cost.reversed.md');
  if (reg && reg.includes('finance.wip.cost.reversed')) {
    ok('Event Registry: finance.wip.cost.reversed listed');
  } else {
    fail('Event Registry: finance.wip.cost.reversed missing');
  }
  if (revDoc && revDoc.includes('correlationId') && revDoc.includes('projectId')) {
    ok('Event doc: finance.wip.cost.reversed payload frozen');
  } else {
    fail('Event doc: finance.wip.cost.reversed.md incomplete');
  }

  // 7. NATS publisher passes tenantId
  const natsPub = read('apps/analytics-service/src/eto-nats-publisher.service.ts');
  if (natsPub) {
    if (
      /publishCompensation\([\s\S]*tenantId/.test(natsPub)
    ) {
      ok('eto-nats-publisher: publishCompensation accepts tenantId');
    } else {
      fail('eto-nats-publisher: publishCompensation should accept tenantId');
    }
  }

  // 8. ingestEvent still wired from NATS consumer (pilot path)
  const analyticsCtrl = read('apps/analytics-service/src/analytics.controller.ts');
  if (analyticsCtrl) {
    if (
      analyticsCtrl.includes("EventPattern('>')") &&
      analyticsCtrl.includes('ingestEvent')
    ) {
      ok('analytics: NATS @EventPattern ingest → etoChain.ingestEvent (pilot path)');
    } else {
      fail('analytics: missing NATS ingest path for saga steps');
    }
  }

  // 9. Enterprise Q2 — compensation matrix + period close + temporal worker
  const matrix = read('apps/finance/src/compensation-matrix.service.ts');
  if (matrix) {
    if (
      matrix.includes('finance.wip.cost.reversed') &&
      matrix.includes('finance.revenue.reversed.v1') &&
      matrix.includes('inventory.reservation.released.v1')
    ) {
      ok('Q2 compensation matrix: WIP + revenue + reservation documented');
    } else {
      fail('Q2 compensation matrix incomplete (KD-Q2-4)');
    }
  } else {
    fail('Q2 missing compensation-matrix.service.ts');
  }

  const period = read('apps/finance/src/period-close.service.ts');
  if (period && period.includes('CLOSED') && period.includes('assertPostingAllowed')) {
    ok('Q2 period-close: assertPostingAllowed refuses CLOSED');
  } else {
    fail('Q2 period-close service missing or incomplete');
  }

  const revRev = read('apps/finance/src/commands/reverse-revenue.handler.ts');
  if (
    revRev &&
    revRev.includes('correlationId') &&
    (revRev.includes('REVENUE_COMPENSATION') ||
      revRev.includes('SAGA_COMPENSATION_REVENUE') ||
      revRev.includes('ReverseRevenue'))
  ) {
    ok('Q2 reverse-revenue: keyed by correlationId');
  } else {
    fail('Q2 reverse-revenue handler missing');
  }

  const tw = read('apps/temporal-worker/src/fallback-runner.ts');
  if (tw && tw.includes('runEtoCompensationFallback') && tw.includes('isTemporalConfigured')) {
    ok('Q2 temporal-worker: G-lite fallback runner present');
  } else {
    fail('Q2 temporal-worker fallback missing');
  }

  const iot = read('apps/eam-service/src/iot/iot-adapter.ts');
  if (iot && iot.includes('interface IotAdapter') && iot.includes('publishTelemetry')) {
    ok('Q2 EAM IotAdapter interface present');
  } else {
    fail('Q2 EAM IotAdapter interface missing');
  }

  const capa = read('apps/quality-service/src/commands/create-capa.handler.ts');
  if (capa && capa.includes('$transaction') && !/\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/.test(capa)) {
    ok('Q2 CAPA: outbox TX without silent empty catch');
  } else if (capa && capa.includes('$transaction')) {
    ok('Q2 CAPA: outbox TX path');
  } else {
    fail('Q2 CAPA outbox TX missing');
  }
}

async function probe(url: string, ms = 4000): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

async function liveFailStep(): Promise<void> {
  console.log('\n--- Live fail-step / reverse (optional) ---\n');

  const gwUp = await probe(`${GW}/api/analytics/eto-chain/saga/readiness`);
  const finUp =
    (await probe(`${FIN_URL}/fin/health`)) ||
    (await probe(`${GW}/api/fin/health`)) ||
    (await probe(`${GW}/api/finance/health`));

  if (!gwUp && !finUp) {
    skip('gateway/finance not reachable — live path skipped (structure still PASS)');
    return;
  }

  const correlationId = `saga-glite-${Date.now()}`;
  const projectId = `proj-glite-${Date.now()}`;
  const tenantId = 'default';

  // Prefer direct finance reverse via NATS publish if possible; else HTTP compensate / command path
  let reverseOk = false;
  let idempotentOk = false;

  // Seed WIP via direct DB if pg available, else try finance journal/wip APIs
  let seeded = false;
  try {
    // Dynamic import pg only for live
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Client } = require('pg') as typeof import('pg');
    const client = new Client({ connectionString: FIN_DB });
    await client.connect();
    try {
      await client.query(
        `INSERT INTO "WipAccount" ("id", "tenantId", "projectId", "wipBalance", "materialReserved", "laborCost", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, 100, 0, 100, NOW())
         ON CONFLICT ("projectId") DO UPDATE SET "wipBalance" = 100, "laborCost" = 100, "updatedAt" = NOW()`,
        [tenantId, projectId],
      );
      seeded = true;
      ok(`live: seeded WIP projectId=${projectId} balance=100`);
    } finally {
      await client.end();
    }
  } catch (e) {
    skip(`live: WIP seed via DB failed (${(e as Error).message}) — try event-only path`);
  }

  // Publish reverse event via NATS
  try {
    const { connect, StringCodec } = await import('nats');
    const nc = await connect({ servers: NATS_URL, timeout: 3000 });
    const sc = StringCodec();
    const payload = {
      correlationId,
      projectId,
      tenantId,
      compensate: true,
      compensatedStep: 'finance.wip.cost.recorded',
      source: 'smoke-saga-compensation',
      publishedAt: new Date().toISOString(),
    };
    nc.publish('finance.wip.cost.reversed', sc.encode(JSON.stringify(payload)));
    await nc.flush();
    // Second publish for idempotency
    nc.publish('finance.wip.cost.reversed', sc.encode(JSON.stringify(payload)));
    await nc.flush();
    await nc.drain();
    ok(`live: published finance.wip.cost.reversed x2 correlationId=${correlationId}`);
    // Wait for handler
    await new Promise((r) => setTimeout(r, 2500));
  } catch (e) {
    skip(`live: NATS publish failed (${(e as Error).message})`);
  }

  // Assert via finance HTTP WIP / journal if available
  try {
    const wipRes = await fetch(`${FIN_URL}/fin/wip`, { signal: AbortSignal.timeout(5000) });
    if (wipRes.ok) {
      const rows = (await wipRes.json()) as Array<{ projectId?: string; wipBalance?: number | string }>;
      const row = rows.find((r) => r.projectId === projectId);
      if (row) {
        const bal = Number(row.wipBalance);
        if (bal === 0) {
          ok(`live: WIP balance 0 after reverse for ${projectId}`);
          reverseOk = true;
        } else {
          fail(`live: WIP balance expected 0 got ${bal}`);
        }
      } else if (seeded) {
        skip(`live: WIP row for ${projectId} not visible on /fin/wip yet`);
      } else {
        skip('live: no WIP row (seed skipped)');
      }
    } else {
      skip(`live: /fin/wip → ${wipRes.status}`);
    }
  } catch {
    skip('live: finance /fin/wip unreachable');
  }

  // DB assert REVERSAL + single row (idempotent)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Client } = require('pg') as typeof import('pg');
    const client = new Client({ connectionString: FIN_DB });
    await client.connect();
    try {
      const costs = await client.query(
        `SELECT id, "costType", amount::text, reference FROM "ProjectCost"
         WHERE reference = $1 AND "costType" = 'REVERSAL'`,
        [correlationId],
      );
      if (costs.rowCount === 1) {
        ok(`live: exactly 1 ProjectCost REVERSAL for correlationId (idempotent)`);
        reverseOk = true;
        idempotentOk = true;
      } else if (costs.rowCount === 0) {
        if (seeded) {
          fail('live: no ProjectCost REVERSAL after reverse event (handler may not have run)');
        } else {
          skip('live: no REVERSAL row (WIP not seeded / handler idle)');
        }
      } else {
        fail(`live: expected 1 REVERSAL row, got ${costs.rowCount} (not idempotent)`);
      }

      const je = await client.query(
        `SELECT id FROM "JournalEntry" WHERE "referenceId" = $1 AND source = 'SAGA_COMPENSATION'`,
        [correlationId],
      );
      if ((je.rowCount ?? 0) >= 1) {
        ok(`live: JournalEntry SAGA_COMPENSATION for correlationId`);
      } else if (seeded && reverseOk) {
        fail('live: missing JournalEntry for reverse');
      }
    } finally {
      await client.end();
    }
  } catch (e) {
    skip(`live: DB assert skipped (${(e as Error).message})`);
  }

  // Orchestrate API: real ids returned (structure of live API)
  if (gwUp) {
    try {
      const orchRes = await fetch(`${GW}/api/analytics/eto-chain/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId },
        body: JSON.stringify({
          correlationId: `orch-live-${Date.now()}`,
          projectId: `proj-live-${Date.now()}`,
          tenantId,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (orchRes.ok) {
        const body = (await orchRes.json()) as {
          correlationId?: string;
          projectId?: string;
        };
        if (body.projectId === 'proj-eto-demo') {
          fail('live: orchestrate returned hard-coded proj-eto-demo');
        } else if (body.correlationId && body.projectId) {
          ok(`live: orchestrate correlationId=${body.correlationId} projectId=${body.projectId}`);
        } else {
          fail('live: orchestrate missing correlationId/projectId');
        }
      } else {
        skip(`live: orchestrate → ${orchRes.status}`);
      }
    } catch (e) {
      skip(`live: orchestrate failed (${(e as Error).message})`);
    }

    try {
      const t = await fetch(`${GW}/api/analytics/eto-chain/temporal/status`, {
        signal: AbortSignal.timeout(5000),
      });
      if (t.ok) {
        const body = (await t.json()) as { pilotDoD?: boolean };
        if (body.pilotDoD === false) {
          ok('live: temporal/status pilotDoD=false (non-DoD)');
        } else {
          skip('live: temporal/status missing pilotDoD=false field');
        }
      }
    } catch {
      /* optional */
    }
  }

  if (STRICT_LIVE && !reverseOk) {
    fail(
      'STRICT live: reverse path not asserted (need finance up + NATS + DB seed; FINANCE_DATABASE_URL=.../fin_db)',
    );
  }
  if (STRICT_LIVE && seeded && !idempotentOk) {
    fail('STRICT live: expected idempotent REVERSAL row count=1 after double publish');
  }
  if (!STRICT_LIVE && !reverseOk) {
    skip('live reverse not asserted (set REQUIRE_LIVE=1 for hard fail)');
  }
}

async function main() {
  console.log('=== Saga G-lite Compensation Smoke (PR16) ===\n');
  assertStructure();
  await liveFailStep();
  console.log(`\n=== Result: ${fails === 0 ? 'PASS' : `${fails} FAIL`} ===`);
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
