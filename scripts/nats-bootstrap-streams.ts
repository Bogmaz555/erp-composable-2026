/**
 * Idempotent JetStream stream + durable consumer bootstrap (Pilot v1).
 * Invoked via tsx by scripts/nats-bootstrap-streams.sh when dist is unavailable.
 *
 * Prefer scripts/nats-bootstrap-streams.cjs (loads compiled shared-kernel dist).
 *
 * Streams: ETO_CORE, SUPPLY, QUALITY
 * Env: NATS_URL (default nats://127.0.0.1:4222)
 */
import {
  closeJetStream,
  connectJetStream,
  ensurePilotStreams,
  STREAM_DEFINITIONS,
} from '../apps/shared-kernel/src/jetstream/index';

async function main(): Promise<void> {
  const servers = process.env.NATS_URL || 'nats://127.0.0.1:4222';
  console.log(`[nats-bootstrap] connecting ${servers}`);
  console.log(
    `[nats-bootstrap] streams: ${STREAM_DEFINITIONS.map((d) => d.name).join(', ')}`,
  );

  const handles = await connectJetStream({ servers, timeout: 8000 });
  try {
    const result = await ensurePilotStreams(handles.jsm, {
      ensureConsumers: process.env.NATS_BOOTSTRAP_SKIP_CONSUMERS !== '1',
      log: (m) => console.log(m),
    });
    console.log(
      `[nats-bootstrap] done created=${result.created.length} existing=${result.existing.length} ` +
        `updated=${result.updated.length} consumers+${result.consumersCreated.length} ` +
        `consumers~${result.consumersExisting.length}`,
    );
  } finally {
    await closeJetStream(handles);
  }
}

main().catch((err) => {
  console.error('[nats-bootstrap] FAILED', err instanceof Error ? err.message : err);
  process.exit(1);
});
