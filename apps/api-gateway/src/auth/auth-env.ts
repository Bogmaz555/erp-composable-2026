/**
 * Gateway auth environment helpers.
 * Secure-by-default: enforced unless AUTH_DISABLE=true or AUTH_ENFORCE=false.
 * Pilot profile requires JWKS (USE_KEYCLOAK_JWKS=true) and forbids auth off-switches.
 */

export function isPilotProfile(): boolean {
  const p = process.env.PILOT;
  return p === '1' || p === 'true';
}

/** Explicit local/dev insecure bypass only. */
export function isAuthDisabled(): boolean {
  return (
    process.env.AUTH_DISABLE === 'true' ||
    process.env.AUTH_ENFORCE === 'false'
  );
}

export function isAuthEnforced(): boolean {
  return !isAuthDisabled();
}

/** JWKS when Keycloak flag set, or always in pilot (pilot also asserts the flag). */
export function useKeycloakJwks(): boolean {
  return process.env.USE_KEYCLOAK_JWKS === 'true' || isPilotProfile();
}

/**
 * Fail-fast for pilot: no AUTH_ENFORCE=false / AUTH_DISABLE=true; JWKS required.
 * Also fail-fast when auth is enforced on HS256 without JWT_SECRET.
 * Call once at gateway bootstrap.
 */
export function assertPilotAuthConfig(): void {
  if (isPilotProfile()) {
    if (process.env.AUTH_DISABLE === 'true') {
      throw new Error(
        '[Gateway] PILOT=1 forbids AUTH_DISABLE=true — unset AUTH_DISABLE for pilot',
      );
    }
    if (process.env.AUTH_ENFORCE === 'false') {
      throw new Error(
        '[Gateway] PILOT=1 forbids AUTH_ENFORCE=false — set AUTH_ENFORCE=true (or unset) for pilot',
      );
    }
    if (process.env.USE_KEYCLOAK_JWKS !== 'true') {
      throw new Error(
        '[Gateway] PILOT=1 requires USE_KEYCLOAK_JWKS=true (Keycloak JWKS validation)',
      );
    }
  }

  // Non-JWKS + auth on: require JWT_SECRET (align with verify-token / JwtStrategy).
  if (isAuthEnforced() && !useKeycloakJwks()) {
    if (!process.env.JWT_SECRET?.trim()) {
      throw new Error(
        '[Gateway] JWT_SECRET is required when auth is enforced and USE_KEYCLOAK_JWKS is not set',
      );
    }
  }
}
