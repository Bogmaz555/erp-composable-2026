import './tracing';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { verifyToken } from './auth/verify-token';
import {
  assertPilotAuthConfig,
  isAuthEnforced,
  isPilotProfile,
  useKeycloakJwks,
} from './auth/auth-env';
import fastifyHttpProxy from '@fastify/http-proxy';

// Minimal public surface (P0 shrink). Everything else under /api/* requires bearer.
// Protected (no longer public): /api/analytics/{platform,import,export,outbox,tenants,auth},
// /api/hr, /api/mes/kiosk, /api/ai, and other analytics data-plane routes.
// Nest vs proxy dual-path documented until pure-proxy unification (PR 17).
const PUBLIC_PATH_PREFIXES = [
  '/health',
  '/api/analytics/health',
];

function isPublicPath(url: string): boolean {
  const path = url.split('?')[0];
  return PUBLIC_PATH_PREFIXES.some((p) => path === p || path.startsWith(p + '/') || path === p);
}

async function bootstrap() {
  // Pilot fail-fast: forbid AUTH_ENFORCE=false / AUTH_DISABLE=true; require JWKS.
  assertPilotAuthConfig();

  const app = await NestFactory.create<any>(
    AppModule,
    (new FastifyAdapter() as any)
  );

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : false,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const fastifyInstance = app.getHttpAdapter().getInstance();

  // TenantMiddleware (Fastify Hook) - Security Fix: Drop spoofed headers
  fastifyInstance.addHook('onRequest', async (request, reply) => {
    delete request.headers['x-tenant-id'];
    delete request.headers['x-user-id'];
    delete request.headers['x-roles'];
  });

  // Gateway auth boundary for fastify proxies (which bypass Nest guards).
  // Secure-by-default: ON unless AUTH_DISABLE=true or AUTH_ENFORCE=false (local insecure).
  if (isAuthEnforced()) {
    fastifyInstance.addHook('onRequest', async (request, reply) => {
      const url = request.url || '';
      if (!url.startsWith('/api/') || isPublicPath(url)) return;

      const authz = request.headers['authorization'];
      const token =
        typeof authz === 'string' && authz.startsWith('Bearer ')
          ? authz.slice(7)
          : null;
      if (!token) {
        reply.code(401).send({ statusCode: 401, message: 'Missing bearer token' });
        return reply;
      }

      try {
        const claims = await verifyToken(token);
        // Propagate validated claims to downstream services (RBAC enforced there).
        request.headers['x-user-id'] = claims.userId;
        request.headers['x-roles'] = claims.roles.join(',');
        request.headers['x-tenant-id'] = claims.tenantId;
        if (claims.email) request.headers['x-user-email'] = claims.email;
      } catch {
        reply.code(401).send({ statusCode: 401, message: 'Invalid or expired token' });
        return reply;
      }
    });
    console.log(
      `[Gateway] AUTH_ENFORCE on — proxy auth boundary ENABLED` +
        (useKeycloakJwks() ? ' (JWKS)' : ' (HS256)') +
        (isPilotProfile() ? ' [PILOT]' : ''),
    );
  } else {
    console.warn(
      '[Gateway] AUTH disabled (AUTH_DISABLE=true or AUTH_ENFORCE=false) — local insecure only',
    );
  }

  // TD-001: JWT Auth wired (Keycloak compatible).
  // Secure by default: global JWT guard unless AUTH_DISABLE=true or AUTH_ENFORCE=false.
  if (isAuthEnforced()) {
    app.useGlobalGuards(new JwtAuthGuard());
    console.log('[Gateway] AUTH_ENFORCE on — global JWT guard ENABLED');
  }
  // Claims propagated: user, roles, tenantId. Downstream services read from headers.
  //
  // TD-001 + ETO Spine: When requests hit protected controllers (PLM/MES/INV/PM),
  // the gateway (or caller) must forward x-user-id and x-roles in NATS message headers
  // so that event listeners (e.g. plm.bom.released.v2, mes.production.recorded.v1, inventory.reservation.released.v1)
  // in MES, INV and Finance can extract authenticated user for audit + WIP costing.
  // See: JwtStrategy validate(), downstream pm-integration.controller.ts files, and Finance WIP handler.

  // CRITICAL: Proxy CRM queries to CRM Microservice (Port: 4001)
  await app.register(fastifyHttpProxy as any, {
    upstream: 'http://127.0.0.1:4001',
    prefix: '/api/crm',
    replyOptions: {
      rewriteRequestHeaders: (originalReq, headers) => {
        return {
          ...headers,
          'x-tenant-id': originalReq.headers['x-tenant-id'] || 'public'
        };
      }
    }
  });

  // CRITICAL: Proxy PM queries to PM Microservice (Port: 4002)
  // Obsługuje ruting /api/pm/projects/:id/tasks (GET/POST) dla zadań WBS.
  await app.register(fastifyHttpProxy as any, {
    upstream: 'http://127.0.0.1:4002',
    prefix: '/api/pm',
    rewritePrefix: '',
    replyOptions: {
      rewriteRequestHeaders: (originalReq, headers) => {
        return {
          ...headers,
          'x-tenant-id': originalReq.headers['x-tenant-id'] || 'public'
        };
      }
    }
  });

  // CRITICAL: Proxy INV queries to INV Microservice (Port: 4003)
  await app.register(fastifyHttpProxy as any, {
    upstream: 'http://127.0.0.1:4003',
    prefix: '/api/inv',
    rewritePrefix: '',
    replyOptions: {
      rewriteRequestHeaders: (originalReq, headers) => {
        return {
          ...headers,
          'x-tenant-id': originalReq.headers['x-tenant-id'] || 'public'
        };
      }
    }
  });

  // CRITICAL: Proxy PROC queries to PROC Microservice (Port: 4004)
  await app.register(fastifyHttpProxy as any, {
    upstream: 'http://127.0.0.1:4004',
    prefix: '/api/proc',
    rewritePrefix: '',
    replyOptions: {
      rewriteRequestHeaders: (originalReq, headers) => {
        return {
          ...headers,
          'x-tenant-id': originalReq.headers['x-tenant-id'] || 'public'
        };
      }
    }
  });

  // CRITICAL: Proxy Analytics queries to Analytics Microservice (Port: 4011)
  await app.register(fastifyHttpProxy as any, {
    upstream: 'http://127.0.0.1:4011',
    prefix: '/api/analytics',
    rewritePrefix: '',
    replyOptions: {
      rewriteRequestHeaders: (originalReq, headers) => {
        return {
          ...headers,
          'x-tenant-id': originalReq.headers['x-tenant-id'] || 'public'
        };
      }
    }
  });

  // CRITICAL: Proxy MES queries to MES Microservice (Port: 4006)
  await app.register(fastifyHttpProxy as any, {
    upstream: 'http://127.0.0.1:4006',
    prefix: '/api/mes',
    rewritePrefix: '',
    replyOptions: {
      rewriteRequestHeaders: (originalReq, headers) => {
        return {
          ...headers,
          'x-tenant-id': originalReq.headers['x-tenant-id'] || 'public'
        };
      }
    }
  });

  // CRITICAL: Proxy Search queries to Meilisearch (Port: 7700)
  // MEILI_MASTER_KEY must come from env — never hardcode secrets in source
  const meiliMasterKey = (process.env.MEILI_MASTER_KEY || '').trim();
  const meiliRequired =
    process.env.MEILI_REQUIRED === 'true' ||
    process.env.NODE_ENV === 'production' ||
    process.env.AUTH_ENFORCE === 'true' ||
    process.env.PILOT === '1';
  if (!meiliMasterKey) {
    if (meiliRequired) {
      throw new Error(
        'MEILI_MASTER_KEY is required when NODE_ENV=production, AUTH_ENFORCE=true, PILOT=1, or MEILI_REQUIRED=true',
      );
    }
    console.warn(
      '[api-gateway] MEILI_MASTER_KEY is unset — stripping Authorization toward Meili (set env for pilot/prod)',
    );
  }
  await app.register(fastifyHttpProxy as any, {
    upstream: process.env.MEILI_URL || 'http://127.0.0.1:7700',
    prefix: '/api/search',
    rewritePrefix: '',
    replyOptions: {
      rewriteRequestHeaders: (originalReq, headers) => {
        const next = { ...headers };
        // Never forward caller JWT/credentials to Meili
        delete next['authorization'];
        delete next['Authorization'];
        if (meiliMasterKey) {
          next['Authorization'] = `Bearer ${meiliMasterKey}`;
        }
        return next;
      },
    },
  });

  // CRITICAL: Proxy AI Vector queries to Search Microservice (Port: 4008)
  await app.register(fastifyHttpProxy as any, {
    upstream: 'http://127.0.0.1:4008',
    prefix: '/api/ai',
    rewritePrefix: '/ai',
    replyOptions: {
      rewriteRequestHeaders: (originalReq, headers) => {
        return {
          ...headers,
          'x-tenant-id': originalReq.headers['x-tenant-id'] || 'public'
        };
      }
    }
  });

  // CRITICAL: Proxy Approvals queries to Approvals Microservice (Port: 4009)
  await app.register(fastifyHttpProxy as any, {
    upstream: 'http://127.0.0.1:4009',
    prefix: '/api/approvals',
    rewritePrefix: '',
    replyOptions: {
      rewriteRequestHeaders: (originalReq, headers) => {
        return {
          ...headers,
          'x-tenant-id': originalReq.headers['x-tenant-id'] || 'public'
        };
      }
    }
  });

  // Binding to 0.0.0.0 is mandatory for Docker networking/K6 integration
  await app.listen(4005, '127.0.0.1');
  console.log('API Gateway Fastify running natively on http://0.0.0.0:4005 with CORS Enabled and Multi-Tenant proxying');

  const { startMtlsHealthSidecar, startMtlsProxySidecar } = await import('./mtls-listen');
  startMtlsHealthSidecar();
  startMtlsProxySidecar();
}
bootstrap();
