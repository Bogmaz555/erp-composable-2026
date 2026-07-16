import './tracing';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { verifyToken } from './auth/verify-token';
import fastifyHttpProxy from '@fastify/http-proxy';

// Paths that bypass auth even when AUTH_ENFORCE=true (health/telemetry).
const PUBLIC_PATH_PREFIXES = [
  '/api/analytics/stream',
  '/api/analytics/counters',
  '/api/analytics/health',
  '/api/analytics/search',
  '/api/analytics/kpi',
  '/api/analytics/audit',
  '/api/analytics/notifications',
  '/api/analytics/export',
  '/api/analytics/import',
  '/api/analytics/auth',
  '/api/analytics/approvals',
  '/api/analytics/tenants',
  '/api/analytics/tenants/',
  '/api/analytics/mail',
  '/api/analytics/command-center',
  '/api/analytics/operations',
  '/api/analytics/traceability',
  '/api/analytics/eto-chain',
  '/api/analytics/otel',
  '/api/analytics/outbox',
  '/api/analytics/platform',
  '/api/hr',
  '/health',
];

function isPublicPath(url: string): boolean {
  const path = url.split('?')[0];
  return PUBLIC_PATH_PREFIXES.some((p) => path === p || path.startsWith(p));
}

async function bootstrap() {
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
  // AUTH_ENFORCE=true → verify bearer token for /api/* and propagate RBAC claims downstream.
  if (process.env.AUTH_ENFORCE === 'true') {
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
    console.log('[Gateway] AUTH_ENFORCE=true — proxy auth boundary ENABLED');
  }

  // TD-001: JWT Auth wired (Keycloak compatible).
  // Production: set AUTH_ENFORCE=true to enable the global JWT guard across Nest controllers.
  // Dev/demo (default): guard is opt-in per controller via @UseGuards(JwtAuthGuard) so the demo flows stay open.
  if (process.env.AUTH_ENFORCE === 'true') {
    app.useGlobalGuards(new JwtAuthGuard());
    console.log('[Gateway] AUTH_ENFORCE=true — global JWT guard ENABLED');
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

  // Binding to 0.0.0.0 is mandatory for Docker networking/K6 integration
  await app.listen(4005, '0.0.0.0');
  console.log('API Gateway Fastify running natively on http://0.0.0.0:4005 with CORS Enabled and Multi-Tenant proxying');

  const { startMtlsHealthSidecar, startMtlsProxySidecar } = await import('./mtls-listen');
  startMtlsHealthSidecar();
  startMtlsProxySidecar();
}
bootstrap();
