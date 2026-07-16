import * as jwt from 'jsonwebtoken';
import * as jwksRsa from 'jwks-rsa';

const DEFAULT_KEYCLOAK_JWKS =
  'http://localhost:8080/realms/erp/protocol/openid-connect/certs';

export interface GatewayClaims {
  userId: string;
  roles: string[];
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
  return {
    userId: payload.sub || payload.userId || 'unknown',
    roles: payload.realm_access?.roles || payload.roles || ['VIEWER'],
    tenantId: payload.tenantId || payload.tenant || 'public',
    email: payload.email,
  };
}

/**
 * Verifies a bearer token at the gateway boundary.
 * Keycloak (USE_KEYCLOAK_JWKS=true) → JWKS RS256; otherwise dev HS256 secret.
 */
export function verifyToken(token: string): Promise<GatewayClaims> {
  const useKeycloak = process.env.USE_KEYCLOAK_JWKS === 'true';

  return new Promise((resolve, reject) => {
    if (useKeycloak) {
      jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
        if (err || !decoded) return reject(err || new Error('invalid token'));
        resolve(toClaims(decoded));
      });
    } else {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod',
        );
        resolve(toClaims(decoded));
      } catch (e) {
        reject(e);
      }
    }
  });
}
