/**
 * Single consumer path policy for Pilot ETO (design §3 / PR 14).
 *
 * When `NATS_JETSTREAM=true`:
 * - Publishers (GenericOutboxRelay) use publishWithAck
 * - Consumers use durable pull workers (fin-wip-worker, inv-eto-worker, …)
 * - Nest `@EventPattern` handlers for migrated subjects MUST no-op
 *   (core NATS still receives JetStream publishes → dual delivery otherwise)
 */
import { isJetStreamEnabled, type EnvLike } from './flags';
import { STREAM_ETO_CORE } from './streams';

/** Durable names wired by bootstrap + PR 14 workers. */
export const DURABLE_FIN_WIP = 'fin-wip-worker' as const;
export const DURABLE_INV_ETO = 'inv-eto-worker' as const;

export const STREAM_FOR_ETO_DURABLES = STREAM_ETO_CORE;

/**
 * Finance WIP path subjects — Nest handlers skip when JetStream consumer path is on.
 * Must stay aligned with BOOTSTRAP_DURABLE_CONSUMERS fin-wip-worker filters.
 */
export const FIN_WIP_CONSUMER_SUBJECTS = [
  'finance.wip.cost.reversed',
  'finance.wip.cost.recorded',
  'inventory.reservation.released.v1',
  'mes.production.recorded.v1',
] as const;

/**
 * INV ETO spine subjects — Nest handlers skip when JetStream consumer path is on.
 * inv-eto-worker pulls whole ETO_CORE; these are the handlers that must not dual-fire.
 */
export const INV_ETO_CONSUMER_SUBJECTS = [
  'plm.bom.released.v2',
  'pm.material.requested.v1',
  'mes.production.recorded.v1',
] as const;

/** True when services must use durable JS consumers (not Nest EventPattern). */
export function preferJetStreamConsumerPath(env?: EnvLike): boolean {
  return isJetStreamEnabled(env);
}

/** Nest @EventPattern for this subject should return immediately when flag on. */
export function nestEventPatternDisabled(
  subject: string,
  env?: EnvLike,
): boolean {
  if (!preferJetStreamConsumerPath(env)) return false;
  return (
    (FIN_WIP_CONSUMER_SUBJECTS as readonly string[]).includes(subject) ||
    (INV_ETO_CONSUMER_SUBJECTS as readonly string[]).includes(subject)
  );
}

/**
 * Filter subjects for fin-wip-worker durable (multi-filter).
 * Wildcards + exact subjects covered by Finance WIP pilot handlers.
 */
export const FIN_WIP_FILTER_SUBJECTS = [
  'finance.wip.>',
  'inventory.reservation.released.v1',
  'mes.production.recorded.v1',
] as const;
