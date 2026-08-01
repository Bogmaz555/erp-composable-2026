/**
 * JetStream kernel helpers for ERP Pilot v1.
 *
 * - Stream names: ETO_CORE / SUPPLY / QUALITY
 * - Feature flag: NATS_JETSTREAM
 * - publishWithAck / publishJsonWithAck
 * - ensurePilotStreams (idempotent bootstrap)
 *
 * Relay integration (GenericOutboxRelay → JS) and single durable consumer
 * path land in a follow-up PR; this package only provides the shared kernel.
 */

export {
  STREAM_ETO_CORE,
  STREAM_SUPPLY,
  STREAM_QUALITY,
  ALL_STREAM_NAMES,
  STREAM_SUBJECTS,
  STREAM_DEFINITIONS,
  STREAM_MAX_AGE_MS,
  STREAM_MAX_BYTES,
  BOOTSTRAP_DURABLE_CONSUMERS,
  resolveStreamForSubject,
  subjectMatchesPattern,
} from './streams';
export type {
  JetStreamName,
  DurableConsumerDef,
  StreamDefinition,
} from './streams';

export {
  isJetStreamEnabled,
  parseTruthyEnv,
  resolveNatsUrl,
  NATS_JETSTREAM_ENV,
} from './flags';
export type { EnvLike } from './flags';

export { connectJetStream, closeJetStream } from './client';
export type { JetStreamHandles, ConnectJetStreamOptions } from './client';

export {
  publishWithAck,
  publishJsonWithAck,
} from './publish';
export type { PublishWithAckOptions, PubAck } from './publish';

export {
  ensurePilotStreams,
  ensurePilotStreamsOnConnection,
} from './bootstrap';
export type { EnsureStreamsResult, EnsureStreamsOptions } from './bootstrap';
