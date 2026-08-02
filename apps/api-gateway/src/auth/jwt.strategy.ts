import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';
import * as crypto from 'crypto';
import { TENANT_JWT_CLAIM } from '@erp/shared-kernel';
import { isAuthEnforced, useKeycloakJwks } from './auth-env';

const DEFAULT_KEYCLOAK_JWKS =
  'http://localhost:8080/realms/erp/protocol/openid-connect/certs';

/**
 * TD-001: JWT validation — dev secret OR Keycloak JWKS (USE_KEYCLOAK_JWKS=true or PILOT).
 * Never uses a hardcoded shared secret. HS256 requires JWT_SECRET when auth is enforced.
 * Docker smoke: start keycloak, set USE_KEYCLOAK_JWKS=true, token for demo.engineer.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const useKeycloak = useKeycloakJwks();
    const jwksUri = process.env.KEYCLOAK_JWKS_URI || DEFAULT_KEYCLOAK_JWKS;

    if (useKeycloak) {
      super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        algorithms: ['RS256'],
        secretOrKeyProvider: jwksRsa.passportJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
          jwksUri,
        }),
      });
      return;
    }

    let secret = process.env.JWT_SECRET?.trim();
    if (!secret) {
      if (isAuthEnforced()) {
        throw new Error(
          '[JwtStrategy] JWT_SECRET is required when USE_KEYCLOAK_JWKS is not set and auth is enforced',
        );
      }
      // Auth off: ephemeral unguessable key so no client can forge with a known default.
      secret = crypto.randomBytes(32).toString('hex');
      console.warn(
        '[JwtStrategy] AUTH off and JWT_SECRET unset — using ephemeral HS256 key (not shared)',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['HS256'],
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    // OQ-1: claim name = tenantId (legacy `tenant` fallback only)
    const raw =
      (typeof payload?.[TENANT_JWT_CLAIM] === 'string' && payload[TENANT_JWT_CLAIM]) ||
      (typeof payload?.tenant === 'string' && payload.tenant) ||
      '';
    // Missing/public claim → DEFAULT_TENANT_ID (seeded data lives under `default`)
    const tenantClaim =
      raw && raw !== 'public'
        ? raw
        : (process.env.DEFAULT_TENANT_ID || 'default').trim() || 'default';
    return {
      id: payload.sub || payload.userId,
      roles: payload.realm_access?.roles || payload.roles || ['VIEWER'],
      tenantId: tenantClaim,
      email: payload.email,
    };
  }
}
