import * as jwt from 'jsonwebtoken';
import * as jwksRsa from 'jwks-rsa';
import { TENANT_JWT_CLAIM, isEnterpriseProfile } from '@erp/shared-kernel';
import { useKeycloakJwks } from './auth-env';

const DEFAULT_KEYCLOAK_JWKS =
  'http://localhost:8080/realms/erp/protocol/openid-connect/certs';

export interface GatewayClaims {
  userId: string;
  roles: string[];
  /** OQ-1: claim name is always `tenantId` (see TENANT_JWT_CLAIM). */
  tenantId: string;
  email?: string;
  azp?: string;
  aud?: string | string[];
}

let jwksClient: jwksRsa.JwksClient | null = null;

function getJwksClient(): jwksRsa.JwksClient {
  if (!jwksClient) {
    jwksClient = jwksRsa({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: process.env.KEYCLOAK_JWKS_URI || DEFAULT_KEYCLOAK_JWKS,
    });
  }
  return jwksClient;
}

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  getJwksClient().getSigningKey(header.kid as string, (err, key) => {
    if (err) return callback(err);
    callback(null, key?.getPublicKey());
  });
}

function toClaims(payload: any): GatewayClaims {
  // Canonical claim = tenantId (OQ-1). Legacy `tenant` accepted only as fallback.
  const claim =
    (typeof payload?.[TENANT_JWT_CLAIM] === 'string' && payload[TENANT_JWT_CLAIM]) ||
    (typeof payload?.tenant === 'string' && payload.tenant) ||
    'public';
  return {
    userId: payload.sub || payload.userId || 'unknown',
    roles: payload.realm_access?.roles || payload.roles || ['VIEWER'],
    tenantId: claim,
    email: payload.email,
    azp: typeof payload.azp === 'string' ? payload.azp : undefined,
    aud: payload.aud,
  };
}

/**
 * Hard claim path (Enterprise Q0 / E0.5):
 * - ENTERPRISE=1 / ERP_PROFILE=enterprise → require JWT_AUDIENCE + JWT_AZP_ALLOWLIST
 * - JWT_HARD_CLAIMS=true → same
 * - Pilot alone: if JWT_AUDIENCE / JWT_AZP_ALLOWLIST set, enforce them (soft until enterprise)
 */
function requiresEnterpriseHardClaims(): boolean {
  return isEnterpriseProfile() || process.env.JWT_HARD_CLAIMS === 'true';
}

function parseAllowlist(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * After signature verify: enforce iss already via jwt.verify options;
 * enforce aud/azp policy for enterprise (required) or when env allowlists are set.
 */
export function assertTokenHardClaims(payload: jwt.JwtPayload | string | GatewayClaims): void {
  const p = typeof payload === 'string' ? {} : (payload as jwt.JwtPayload);
  const enterpriseHard = requiresEnterpriseHardClaims();

  const audience = process.env.JWT_AUDIENCE?.trim();
  if (enterpriseHard && !audience) {
    throw new Error('JWT_AUDIENCE is required under enterprise profile');
  }
  if (audience) {
    const aud = (p as jwt.JwtPayload).aud;
    const ok = Array.isArray(aud)
      ? aud.includes(audience)
      : aud === audience;
    if (!ok) {
      throw new Error(`Token audience mismatch (expected ${audience})`);
    }
  }

  const allow = parseAllowlist(process.env.JWT_AZP_ALLOWLIST);
  if (enterpriseHard && allow.length === 0) {
    throw new Error(
      'JWT_AZP_ALLOWLIST is required under enterprise profile (authorized party pin)',
    );
  }
  if (allow.length > 0) {
    const azp = (p as jwt.JwtPayload).azp as string | undefined;
    if (!azp || !allow.includes(azp)) {
      throw new Error(
        `Token azp not allowed (got ${azp ?? 'missing'}; allowlist ${allow.join(',')})`,
      );
    }
  }
}

/**
 * Verifies a bearer token at the gateway boundary.
 * Keycloak (USE_KEYCLOAK_JWKS=true or PILOT) → JWKS RS256; otherwise dev HS256 secret.
 * Explicit algorithms reject alg=none.
 * Enterprise/pilot: hard iss + required aud + azp allowlist (when configured / required).
 */
export function verifyToken(token: string): Promise<GatewayClaims> {
  const useKeycloak = useKeycloakJwks();

  return new Promise((resolve, reject) => {
    if (useKeycloak) {
      const issuerEnv =
        process.env.KEYCLOAK_ISSUER ||
        process.env.JWT_ISSUER ||
        '';
      const extra = parseAllowlist(process.env.JWT_ISSUER_EXTRA);
      const issuers = issuerEnv
        ? [issuerEnv, ...extra]
        : requiresEnterpriseHardClaims()
          ? [] // force configure under enterprise
          : [
              'http://localhost:8080/realms/erp',
              'http://127.0.0.1:8080/realms/erp',
            ];

      if (requiresEnterpriseHardClaims() && issuers.length === 0) {
        return reject(
          new Error(
            'KEYCLOAK_ISSUER or JWT_ISSUER is required under enterprise profile',
          ),
        );
      }

      const audience = process.env.JWT_AUDIENCE?.trim();
      const opts: jwt.VerifyOptions = {
        algorithms: ['RS256'],
        issuer: issuers.length === 1 ? issuers[0] : issuers,
      };
      // Always pass audience when set — jwt.verify enforces it
      if (audience) {
        opts.audience = audience;
      }

      jwt.verify(token, getKey, opts, (err, decoded) => {
        if (err || !decoded) return reject(err || new Error('invalid token'));
        try {
          assertTokenHardClaims(decoded as jwt.JwtPayload);
        } catch (e) {
          return reject(e);
        }
        resolve(toClaims(decoded));
      });
    } else {
      try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          return reject(new Error('JWT_SECRET is required when USE_KEYCLOAK_JWKS is not set'));
        }
        const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
        try {
          assertTokenHardClaims(decoded as jwt.JwtPayload);
        } catch (e) {
          return reject(e);
        }
        resolve(toClaims(decoded));
      } catch (e) {
        reject(e);
      }
    }
  });
}

