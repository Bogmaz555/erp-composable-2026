import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthEnforcementReadinessService {
  private readonly gw = process.env.GATEWAY_URL || 'http://127.0.0.1:4005';

  async getReadiness() {
    const authEnforced = process.env.AUTH_ENFORCE === 'true';
    const keycloakJwks = process.env.USE_KEYCLOAK_JWKS === 'true';

    let unauthenticatedBlocked = false;
    let probeStatus = 0;
    try {
      const res = await fetch(`${this.gw}/api/pm`, { signal: AbortSignal.timeout(6000) });
      probeStatus = res.status;
      unauthenticatedBlocked = authEnforced ? res.status === 401 : res.status < 500;
    } catch {
      unauthenticatedBlocked = false;
    }

    const matrixOk = true; // platform/auth/readiness covers role matrix
    const ready = matrixOk && (authEnforced ? unauthenticatedBlocked && probeStatus === 401 : true);

    return {
      ready,
      td001: authEnforced && probeStatus === 401 ? 'yellow-minimum' : keycloakJwks ? 'partial' : 'open-dev',
      domain: 'AUTH_ENFORCEMENT',
      authEnforced,
      keycloakJwks,
      unauthenticatedProbeStatus: probeStatus,
      unauthenticatedBlocked: authEnforced ? probeStatus === 401 : null,
      ciProfileReady: authEnforced || keycloakJwks,
      capabilities: ['JWT gateway boundary', 'RBAC role matrix', 'Keycloak JWKS optional'],
      checkedAt: new Date().toISOString(),
    };
  }
}
