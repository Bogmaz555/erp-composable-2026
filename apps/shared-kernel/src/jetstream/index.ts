/**
 * JetStream kernel helpers for ERP Pilot v1.
 *
 * - Stream names: ETO_CORE / SUPPLY / QUALITY
 * - Feature flag: NATS_JETSTREAM
 * - publishWithAck / publishJsonWithAck (GenericOutboxRelay when flag on)
 * - ensurePilotStreams (idempotent bootstrap)
 * - runDurablePullLoop + single consumer path policy (fin-wip / inv-eto)
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
  isEnterpriseProfile,
  assertEnterpriseMessaging,
  parseTruthyEnv,
  resolveNatsUrl,
  NATS_JETSTREAM_ENV,
  ENTERPRISE_ENV,
  ERP_PROFILE_ENV,
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

export { runDurablePullLoop, parseJsMsg } from './consumer';
export type {
  DurableMessage,
  DurableMessageHandler,
  RunDurablePullOptions,
} from './consumer';

export {
  preferJetStreamConsumerPath,
  nestEventPatternDisabled,
  DURABLE_FIN_WIP,
  DURABLE_INV_ETO,
  STREAM_FOR_ETO_DURABLES,
  FIN_WIP_CONSUMER_SUBJECTS,
  INV_ETO_CONSUMER_SUBJECTS,
  FIN_WIP_FILTER_SUBJECTS,
} from './consumer-path';
