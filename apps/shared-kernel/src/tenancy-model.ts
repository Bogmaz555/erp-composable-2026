/**
 * Enterprise Q3 — tenancy model lock (DEDICATED_STACK default).
 * SHARED_RLS only when explicitly allowed (STATUS + env).
 */

import { isEnterpriseProfile, type EnvLike } from './jetstream/flags';

export type TenancyModel = 'DEDICATED_STACK' | 'SHARED_RLS';

function defaultEnv(): EnvLike {
  // eslint-disable-next-line no-undef
  return (typeof process !== 'undefined' ? process.env : {}) as EnvLike;
}

function parseTruthy(value: string | undefined | null): boolean {
  if (value === undefined || value === null) return false;
  const v = String(value).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

/** Resolve TENANCY_MODEL; default DEDICATED_STACK. */
export function resolveTenancyModel(env: EnvLike = defaultEnv()): TenancyModel {
  const raw = String(env.TENANCY_MODEL || 'DEDICATED_STACK').trim().toUpperCase();
  if (raw === 'SHARED_RLS') return 'SHARED_RLS';
  return 'DEDICATED_STACK';
}

/**
 * Fail closed under enterprise if SHARED_RLS without explicit allow flag.
 * STATUS human flip: set TENANCY_MODEL=SHARED_RLS and ALLOW_SHARED_RLS=true.
 */
export function assertTenancyModel(env: EnvLike = defaultEnv()): void {
  if (!isEnterpriseProfile(env)) return;
  const model = resolveTenancyModel(env);
  if (model === 'SHARED_RLS' && !parseTruthy(env.ALLOW_SHARED_RLS)) {
    throw new Error(
      'Enterprise: TENANCY_MODEL=SHARED_RLS requires ALLOW_SHARED_RLS=true ' +
        '(and STATUS tenancy change). Default is DEDICATED_STACK. See ADR-009.',
    );
  }
  if (model !== 'DEDICATED_STACK' && model !== 'SHARED_RLS') {
    throw new Error(`Enterprise: unknown TENANCY_MODEL=${model}`);
  }
}
