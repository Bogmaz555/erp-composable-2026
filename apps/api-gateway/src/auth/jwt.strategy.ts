import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';

const DEFAULT_KEYCLOAK_JWKS =
  'http://localhost:8080/realms/erp/protocol/openid-connect/certs';

/**
 * TD-001: JWT validation — dev secret OR Keycloak JWKS (USE_KEYCLOAK_JWKS=true).
 * Docker smoke: start keycloak service, set USE_KEYCLOAK_JWKS=true, obtain token for demo.engineer.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const useKeycloak = process.env.USE_KEYCLOAK_JWKS === 'true';
    const jwksUri = process.env.KEYCLOAK_JWKS_URI || DEFAULT_KEYCLOAK_JWKS;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      ...(useKeycloak
        ? {
            secretOrKeyProvider: jwksRsa.passportJwtSecret({
              cache: true,
              rateLimit: true,
              jwksRequestsPerMinute: 5,
              jwksUri,
            }),
          }
        : {
            secretOrKey: process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod',
          }),
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub || payload.userId,
      roles: payload.realm_access?.roles || payload.roles || ['VIEWER'],
      tenantId: payload.tenantId || payload.tenant || 'public',
      email: payload.email,
    };
  }
}
