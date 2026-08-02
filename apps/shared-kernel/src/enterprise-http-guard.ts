/**
 * Enterprise Q1 (KD-E1.8): block inter-service HTTP write demos under enterprise profile.
 */
import { isEnterpriseProfile, type EnvLike } from './jetstream/flags';

export class EnterpriseHttpWriteForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(path: string) {
    super(
      `ENTERPRISE=1 forbids sync HTTP write path "${path}". Use NATS/JetStream + outbox events.`,
    );
    this.name = 'EnterpriseHttpWriteForbiddenError';
  }
}

/**
 * Throw when enterprise profile is active (or force=true).
 * Call at the start of legacy integration mutation endpoints.
 */
export function assertEnterpriseHttpWriteAllowed(
  path: string,
  env?: EnvLike,
): void {
  if (isEnterpriseProfile(env)) {
    throw new EnterpriseHttpWriteForbiddenError(path);
  }
}

/** Soft check for controllers that return HTTP response objects instead of throwing. */
export function enterpriseHttpWriteBlocked(env?: EnvLike): boolean {
  return isEnterpriseProfile(env);
}
