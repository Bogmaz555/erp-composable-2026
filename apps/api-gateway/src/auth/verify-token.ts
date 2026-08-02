import * as jwt from 'jsonwebtoken';
import * as jwksRsa from 'jwks-rsa';
import { TENANT_JWT_CLAIM } from '@erp/shared-kernel';
import { useKeycloakJwks } from './auth-env';

const DEFAULT_KEYCLOAK_JWKS =
  'http://localhost:8080/realms/erp/protocol/openid-connect/certs';

export interface GatewayClaims {
  userId: string;
  roles: string[];
  /** OQ-1: claim name is always `tenantId` (see TENANT_JWT_CLAIM). */
  tenantId: string;
  email?: string;
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
  };
}

/**
 * Verifies a bearer token at the gateway boundary.
 * Keycloak (USE_KEYCLOAK_JWKS=true or PILOT) → JWKS RS256; otherwise dev HS256 secret.
 * Explicit algorithms reject alg=none.
 */
export function verifyToken(token: string): Promise<GatewayClaims> {
  const useKeycloak = useKeycloakJwks();

  return new Promise((resolve, reject) => {
    if (useKeycloak) {
      const issuer =
        process.env.KEYCLOAK_ISSUER ||
        process.env.JWT_ISSUER ||
        'http://localhost:8080/realms/erp';
      const audience = process.env.JWT_AUDIENCE; // optional; Keycloak often omits azp-only
      const opts: jwt.VerifyOptions = {
        algorithms: ['RS256'],
        issuer,
      };
      if (audience) {
        opts.audience = audience;
      }
      jwt.verify(token, getKey, opts, (err, decoded) => {
        if (err || !decoded) return reject(err || new Error('invalid token'));
        resolve(toClaims(decoded));
      });
    } else {
      try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          return reject(new Error('JWT_SECRET is required when USE_KEYCLOAK_JWKS is not set'));
        }
        const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
        resolve(toClaims(decoded));
      } catch (e) {
        reject(e);
      }
    }
  });
}
