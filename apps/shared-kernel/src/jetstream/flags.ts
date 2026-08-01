/**
 * Feature flag for JetStream publish/consume path (Pilot v1 KD-3 / PR 14).
 *
 * Env: `NATS_JETSTREAM=true|1|yes|on` enables durable JetStream.
 * Default: **off** (core NATS / Nest Transport.NATS).
 *
 * When true:
 * - GenericOutboxRelay publishes via publishWithAck (msgID = outbox id)
 * - fin-wip / inv-eto workers pull durables; Nest @EventPattern for those
 *   subjects must no-op (never dual-subscribe Nest + JS)
 */

export type EnvLike = Record<string, string | undefined>;

function defaultEnv(): EnvLike {
  // Avoid hard NodeJS namespace dependency for isolated compile; process is global in Node.
  // eslint-disable-next-line no-undef
  return (typeof process !== 'undefined' ? process.env : {}) as EnvLike;
}

/**
 * Parse truthy flag values used across the monorepo (`true`, `1`, `yes`, `on`).
 * Empty / unset → false (opt-in).
 */
export function parseTruthyEnv(value: string | undefined | null): boolean {
  if (value === undefined || value === null) return false;
  const v = String(value).trim().toLowerCase();
  if (!v) return false;
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

/** Whether JetStream path should be used for publish/consume. */
export function isJetStreamEnabled(env: EnvLike = defaultEnv()): boolean {
  return parseTruthyEnv(env.NATS_JETSTREAM);
}

/** Env key name (for docs / bootstrap messaging). */
export const NATS_JETSTREAM_ENV = 'NATS_JETSTREAM' as const;

/** Default NATS URL when NATS_URL is unset. */
export function resolveNatsUrl(env: EnvLike = defaultEnv()): string {
  return env.NATS_URL?.trim() || 'nats://127.0.0.1:4222';
}
