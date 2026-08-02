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
 *
 * Enterprise (Q0 / KD-1):
 * - `ENTERPRISE=1` or `ERP_PROFILE=enterprise` requires JetStream at boot
 * - Use `assertEnterpriseMessaging()` early in service main (fail closed)
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

/** Enterprise profile: `ENTERPRISE=1|true|yes|on`. */
export const ENTERPRISE_ENV = 'ENTERPRISE' as const;

/** Alternate enterprise profile selector: `ERP_PROFILE=enterprise`. */
export const ERP_PROFILE_ENV = 'ERP_PROFILE' as const;

/**
 * True when runtime is enterprise profile:
 * - ENTERPRISE truthy, or
 * - ERP_PROFILE equals "enterprise" (case-insensitive)
 */
export function isEnterpriseProfile(env: EnvLike = defaultEnv()): boolean {
  if (parseTruthyEnv(env[ENTERPRISE_ENV])) return true;
  const profile = (env[ERP_PROFILE_ENV] ?? '').trim().toLowerCase();
  return profile === 'enterprise';
}

/**
 * Fail closed under enterprise profile if JetStream is not enabled.
 * Call early in service bootstrap (e.g. api-gateway main) when enterprise flags may be set.
 *
 * No-op when not enterprise (pilot / local core NATS still allowed).
 *
 * @throws Error when ENTERPRISE / ERP_PROFILE=enterprise and NATS_JETSTREAM is not truthy
 */
export function assertEnterpriseMessaging(env: EnvLike = defaultEnv()): void {
  if (!isEnterpriseProfile(env)) return;
  if (isJetStreamEnabled(env)) return;
  throw new Error(
    'Enterprise profile requires NATS_JETSTREAM=true (or 1/yes/on). ' +
      'Set NATS_JETSTREAM and restart, or unset ENTERPRISE / ERP_PROFILE=enterprise for local pilot. ' +
      'See infra/enterprise.env.example and docs/ENTERPRISE-0.1-PLATFORM-DESIGN.md (KD-1).',
  );
}

/** Default NATS URL when NATS_URL is unset. */
export function resolveNatsUrl(env: EnvLike = defaultEnv()): string {
  return env.NATS_URL?.trim() || 'nats://127.0.0.1:4222';
}
