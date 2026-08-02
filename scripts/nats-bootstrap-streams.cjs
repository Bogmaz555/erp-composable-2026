#!/usr/bin/env node
/**
 * Plain Node (CommonJS) bootstrap entry — no tsx required.
 * Loads apps/shared-kernel/dist/jetstream (run `pnpm --filter @erp/shared-kernel build` first
 * if dist is missing; CI/local usually builds via workspace).
 *
 * Prefer: bash scripts/nats-bootstrap-streams.sh  (wraps this + fallbacks)
 */
'use strict';

const path = require('path');
const root = path.resolve(__dirname, '..');

function loadKernel() {
  const dist = path.join(root, 'apps/shared-kernel/dist/jetstream/index.js');
  try {
    return require(dist);
  } catch (e) {
    console.error(
      '[nats-bootstrap] cannot load shared-kernel dist/jetstream — run: pnpm --filter @erp/shared-kernel build',
    );
    console.error(e && e.message ? e.message : e);
    process.exit(1);
  }
}

async function main() {
  const {
    closeJetStream,
    connectJetStream,
    ensurePilotStreams,
    STREAM_DEFINITIONS,
  } = loadKernel();

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
