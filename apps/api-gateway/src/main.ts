import './tracing';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import fastifyHttpProxy from '@fastify/http-proxy';

async function bootstrap() {
  const app = await NestFactory.create<any>(
    AppModule,
    (new FastifyAdapter() as any)
  );

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const fastifyInstance = app.getHttpAdapter().getInstance();

  // TenantMiddleware (Fastify Hook) 
  fastifyInstance.addHook('onRequest', async (request, reply) => {
    let tenantId = request.headers['x-tenant-id'];
    if (!tenantId) {
      tenantId = 'public';
      request.headers['x-tenant-id'] = tenantId;
    }
  });

  // TD-001: JWT Auth wired (Keycloak compatible)
  // Global guard example (uncomment for full protection):
  // app.useGlobalGuards(new JwtAuthGuard());
  // For now, the strategy + hook provides user context. Protect sensitive controllers with @UseGuards(JwtAuthGuard).
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
}
bootstrap();
