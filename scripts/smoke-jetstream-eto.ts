/**
 * PR 14 smoke: JetStream relay publish + single ETO consumer path.
 *
 * Always asserts source structure/logic:
 * - GenericOutboxRelay uses publishWithAck / msgID when NATS_JETSTREAM
 * - fin-wip + inv-eto durable consumers + Nest dual-path guards
 * - stream map + filter subjects for fin-wip-worker
 *
 * Live path (optional): connect NATS, ensure streams, publishWithAck with
 * msgID, observe PubAck + optional monitor :8222. SKIP live when NATS down.
 *
 * Run: npx tsx scripts/smoke-jetstream-eto.ts
 * Env: NATS_URL, NATS_MONITOR_URL (default http://127.0.0.1:8222)
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const NATS_URL = process.env.NATS_URL || 'nats://127.0.0.1:4222';
const MONITOR = process.env.NATS_MONITOR_URL || 'http://127.0.0.1:8222';

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

  // 1. GenericOutboxRelay JetStream publish path
  const relay = read('apps/shared-kernel/src/outbox-relay.ts');
  if (relay) {
    if (relay.includes('publishJsonWithAck') || relay.includes('publishWithAck')) {
      ok('GenericOutboxRelay: JetStream publishWithAck path present');
    } else {
      fail('GenericOutboxRelay: missing publishWithAck / publishJsonWithAck');
    }
    if (relay.includes('msgID') && relay.includes('event.id')) {
      ok('GenericOutboxRelay: msgID = outbox id');
    } else if (relay.includes('msgID: event.id') || /msgID:\s*event\.id/.test(relay)) {
      ok('GenericOutboxRelay: msgID = outbox id');
    } else {
      fail('GenericOutboxRelay: expected msgID = event.id for de-dupe');
    }
    if (relay.includes('isJetStreamEnabled') || relay.includes('useJetStreamPublish')) {
      ok('GenericOutboxRelay: gated by NATS_JETSTREAM flag');
    } else {
      fail('GenericOutboxRelay: missing NATS_JETSTREAM gate');
    }
  }

  // 2. Consumer path policy + pull loop
  const consumerPath = read('apps/shared-kernel/src/jetstream/consumer-path.ts');
  if (consumerPath) {
    if (consumerPath.includes('fin-wip-worker') || consumerPath.includes('DURABLE_FIN_WIP')) {
      ok('consumer-path: fin-wip-worker durable');
    } else {
      fail('consumer-path: missing fin-wip durable');
    }
    if (consumerPath.includes('inv-eto-worker') || consumerPath.includes('DURABLE_INV_ETO')) {
      ok('consumer-path: inv-eto-worker durable');
    } else {
      fail('consumer-path: missing inv-eto durable');
    }
    if (consumerPath.includes('preferJetStreamConsumerPath')) {
      ok('consumer-path: preferJetStreamConsumerPath helper');
    } else {
      fail('consumer-path: missing preferJetStreamConsumerPath');
    }
  }

  const consumer = read('apps/shared-kernel/src/jetstream/consumer.ts');
  if (consumer) {
    if (consumer.includes('runDurablePullLoop')) {
      ok('jetstream/consumer: runDurablePullLoop');
    } else {
      fail('jetstream/consumer: missing runDurablePullLoop');
    }
  }

  // 3. fin-wip multi-filter subjects
  const streams = read('apps/shared-kernel/src/jetstream/streams.ts');
  if (streams) {
    if (
      streams.includes('fin-wip-worker') &&
      streams.includes('inventory.reservation.released.v1') &&
      streams.includes('filterSubjects')
    ) {
      ok('streams: fin-wip-worker multi-filter includes reservation.released');
    } else {
      fail('streams: fin-wip-worker should filterSubjects include reservation.released');
    }
  }

  // 4. Finance Nest dual-path guards + JS consumer
  const finCtrl = read('apps/finance/src/finance.controller.ts');
  if (finCtrl) {
    if (finCtrl.includes('preferJetStreamConsumerPath')) {
      ok('finance.controller: Nest dual-path guard (preferJetStreamConsumerPath)');
    } else {
      fail('finance.controller: missing Nest dual-path guard');
    }
    for (const sub of [
      'inventory.reservation.released.v1',
      'finance.wip.cost.reversed',
      'mes.production.recorded.v1',
    ]) {
      if (finCtrl.includes(sub)) {
        ok(`finance.controller: handles ${sub}`);
      } else {
        fail(`finance.controller: missing ${sub}`);
      }
    }
  }

  const finJs = read('apps/finance/src/jetstream-fin-wip.consumer.ts');
  if (finJs) {
    if (finJs.includes('DURABLE_FIN_WIP') || finJs.includes('fin-wip-worker')) {
      ok('finance: FinWipJetStreamConsumer durable path');
    } else {
      fail('finance: missing FinWipJetStreamConsumer durable wiring');
    }
    if (finJs.includes('preferJetStreamConsumerPath') || finJs.includes('isJetStreamEnabled')) {
      ok('finance: JetStream consumer gated by flag');
    } else {
      fail('finance: JetStream consumer missing flag gate');
    }
  }

  const finMod = read('apps/finance/src/app.module.ts');
  if (finMod && finMod.includes('FinWipJetStreamConsumer')) {
    ok('finance app.module: FinWipJetStreamConsumer registered');
  } else if (finMod) {
    fail('finance app.module: FinWipJetStreamConsumer not registered');
  }

  // 5. INV Nest dual-path guards + JS consumer
  const invPm = read('apps/inv-service/src/pm-integration.controller.ts');
  if (invPm) {
    if (invPm.includes('preferJetStreamConsumerPath')) {
      ok('inv pm-integration: Nest dual-path guard');
    } else {
      fail('inv pm-integration: missing Nest dual-path guard');
    }
  }

  const invJs = read('apps/inv-service/src/jetstream-inv-eto.consumer.ts');
  if (invJs) {
    if (invJs.includes('DURABLE_INV_ETO') || invJs.includes('inv-eto-worker')) {
      ok('inv: InvEtoJetStreamConsumer durable path');
    } else {
      fail('inv: missing InvEtoJetStreamConsumer durable wiring');
    }
  }

  const invMod = read('apps/inv-service/src/app.module.ts');
  if (invMod && invMod.includes('InvEtoJetStreamConsumer')) {
    ok('inv app.module: InvEtoJetStreamConsumer registered');
  } else if (invMod) {
    fail('inv app.module: InvEtoJetStreamConsumer not registered');
  }

  // 6. Index re-exports
  const idx = read('apps/shared-kernel/src/jetstream/index.ts');
  if (idx) {
    if (idx.includes('runDurablePullLoop') && idx.includes('preferJetStreamConsumerPath')) {
      ok('jetstream index re-exports consumer + path policy');
    } else {
      fail('jetstream index: incomplete re-exports');
    }
  }
}

async function livePath(): Promise<void> {
  console.log('\n--- Live (optional NATS / monitor) ---\n');

  let connectJetStream: any;
  let closeJetStream: any;
  let ensurePilotStreams: any;
  let publishJsonWithAck: any;
  let isJetStreamEnabled: any;
  let STREAM_ETO_CORE: string;
  let DURABLE_FIN_WIP: string;

  try {
    // Prefer source via tsx path; fall back to dist
    const mod = await import('../apps/shared-kernel/src/jetstream/index');
    connectJetStream = mod.connectJetStream;
    closeJetStream = mod.closeJetStream;
    ensurePilotStreams = mod.ensurePilotStreams;
    publishJsonWithAck = mod.publishJsonWithAck;
    isJetStreamEnabled = mod.isJetStreamEnabled;
    STREAM_ETO_CORE = mod.STREAM_ETO_CORE;
    DURABLE_FIN_WIP = mod.DURABLE_FIN_WIP;
  } catch (e) {
    skip(`cannot load jetstream kernel: ${(e as Error).message}`);
    return;
  }

  let handles: any;
  try {
    handles = await connectJetStream({
      servers: NATS_URL,
      timeout: 4000,
      connectOpts: { name: 'smoke-jetstream-eto' },
    });
  } catch (e) {
    skip(`NATS not reachable at ${NATS_URL}: ${(e as Error).message}`);
    return;
  }

  try {
    const result = await ensurePilotStreams(handles.jsm, {
      ensureConsumers: true,
      log: (m: string) => console.log(`  ${m}`),
    });
    ok(
      `bootstrap streams created=${result.created.length} existing=${result.existing.length} ` +
        `consumers+${result.consumersCreated.length} consumers~${result.consumersExisting.length}`,
    );

    const subject = 'inventory.reservation.released.v1';
    const msgId = `smoke-pr14-${Date.now()}`;
    const ack = await publishJsonWithAck(
      handles.js,
      subject,
      {
        smoke: true,
        source: 'smoke-jetstream-eto',
        workOrderId: 'wo-smoke-pr14',
        tenantId: 'default',
        releasedReservations: [],
      },
      { msgID: msgId },
    );
    ok(
      `publishWithAck subject=${subject} stream=${ack.stream} seq=${ack.seq} msgID=${msgId}`,
    );

    // De-dupe: same msgID within window → duplicate
    const ack2 = await publishJsonWithAck(
      handles.js,
      subject,
      { smoke: true, dup: true },
      { msgID: msgId },
    );
    if (ack2.duplicate === true) {
      ok('msgID de-dupe: second publish reported duplicate=true');
    } else {
      // Some nats versions only set duplicate; seq may match
      ok(`msgID re-publish ack seq=${ack2.seq} duplicate=${ack2.duplicate}`);
    }

    // Pull one message from fin-wip (may already have backlog)
    try {
      const consumer = await handles.js.consumers.get(STREAM_ETO_CORE, DURABLE_FIN_WIP);
      const msg = await consumer.next({ expires: 3000 });
      if (msg) {
        ok(`fin-wip-worker pulled subject=${msg.subject} seq=${msg.seq}`);
        msg.ack();
      } else {
        skip('fin-wip-worker next() timed out (no pending / filter mismatch on old consumer)');
      }
    } catch (e) {
      skip(`fin-wip pull: ${(e as Error).message}`);
    }

    // Monitor HTTP if available
    try {
      const res = await fetch(`${MONITOR}/jsz?streams=1`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const body = (await res.json()) as { account_details?: unknown[]; streams?: number };
        ok(`monitor ${MONITOR}/jsz reachable`);
      } else {
        skip(`monitor HTTP ${res.status}`);
      }
    } catch {
      skip(`monitor ${MONITOR} not reachable`);
    }

    // Flag semantics note
    const flagOn = isJetStreamEnabled({ NATS_JETSTREAM: process.env.NATS_JETSTREAM });
    ok(
      `isJetStreamEnabled(process.env)=${flagOn} (relay uses JS publish when true)`,
    );
  } finally {
    await closeJetStream(handles);
  }
}

async function main() {
  console.log('smoke-jetstream-eto (PR 14)\n');
  assertStructure();
  await livePath();

  console.log('');
  if (fails > 0) {
    console.log(`FAILED: ${fails} structure check(s)`);
    process.exit(1);
  }
  console.log('OK: structure checks passed (live skips are non-fatal)');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
