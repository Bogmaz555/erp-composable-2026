import './tracing';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  assertEnterpriseMessaging,
  assertTenancyModel,
  isEnterpriseProfile,
  resolveTenancyModel,
} from '@erp/shared-kernel';
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

// Minimal public surface (P0). Everything else under /api/* requires bearer.
// Pure-proxy unification (PR 17): all domain traffic via fastifyHttpProxy + one onRequest auth boundary.
// Nest AppController health: @Controller('api') + @Get('health') → /api/health.
// Analytics health via proxy: /api/analytics/health.
export const PUBLIC_PATH_PREFIXES = [
  '/api/health',
  '/api/metrics',
  '/api/analytics/health',
];

export function isPublicPath(url: string): boolean {
  const path = url.split('?')[0];
  return PUBLIC_PATH_PREFIXES.some(
    (p) => path === p || path.startsWith(p + '/'),
  );
}

/** Default local upstream; override with *_SERVICE_URL in compose/k8s. */
function upstream(envKey: string, fallback: string): string {
  const v = (process.env[envKey] || '').trim();
  return v || fallback;
}

function tenantHeaders(originalReq: { headers: Record<string, unknown> }, headers: Record<string, unknown>) {
  return {
    ...headers,
    'x-tenant-id': originalReq.headers['x-tenant-id'] || 'public',
  };
}

async function registerProxy(
  app: { register: (plugin: unknown, opts: Record<string, unknown>) => Promise<unknown> },
  opts: {
    envKey: string;
    fallback: string;
    prefix: string;
    rewritePrefix?: string;
    rewriteRequestHeaders?: (
      originalReq: { headers: Record<string, unknown> },
      headers: Record<string, unknown>,
    ) => Record<string, unknown>;
  },
) {
  const config: Record<string, unknown> = {
    upstream: upstream(opts.envKey, opts.fallback),
    prefix: opts.prefix,
    replyOptions: {
      rewriteRequestHeaders:
        opts.rewriteRequestHeaders ||
        ((originalReq: { headers: Record<string, unknown> }, headers: Record<string, unknown>) =>
          tenantHeaders(originalReq, headers)),
    },
  };
  if (opts.rewritePrefix !== undefined) {
    config.rewritePrefix = opts.rewritePrefix;
  }
  await app.register(fastifyHttpProxy as any, config);
}

async function bootstrap() {
  // Enterprise Q0 (KD-1): when ENTERPRISE=1 or ERP_PROFILE=enterprise, require JetStream.
  // Fail closed before Nest init if messaging profile is mis-set.
  assertEnterpriseMessaging();
  assertTenancyModel();
  if (isEnterpriseProfile()) {
    console.log(
      `[Gateway] ENTERPRISE profile — JetStream required; tenancy=${resolveTenancyModel()}`,
    );
  }

  // Pilot fail-fast: forbid AUTH_ENFORCE=false / AUTH_DISABLE=true; require JWKS.
  assertPilotAuthConfig();

  const app = await NestFactory.create<any>(
    AppModule,
    (new FastifyAdapter() as any),
  );

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : false,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const fastifyInstance = app.getHttpAdapter().getInstance();


  // Drop spoofed identity headers — only gateway-validated claims may set them.
  fastifyInstance.addHook('onRequest', async (request) => {
    delete request.headers['x-tenant-id'];
    delete request.headers['x-user-id'];
    delete request.headers['x-roles'];
  });

  // Single auth boundary for pure-proxy path (and any remaining Nest routes).
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

  // Nest health only — domain RBAC is downstream (PR 3). Global guard still protects Nest surface.
  if (isAuthEnforced()) {
    app.useGlobalGuards(new JwtAuthGuard());
    console.log('[Gateway] AUTH_ENFORCE on — global JWT guard ENABLED');
  }

  // --- Pure proxy map (env SERVICE_URL, local defaults for dev) ---
  // Port map: crm 4001, pm 4002, inv 4003, proc 4004, mes 4006, plm 4007,
  // quality 4008, eam 4009, fin 4010, analytics 4011, hr 4012, tax 4015,
  // search 4018, approvals 4019. Gateway listen default 4005.

  await registerProxy(app, {
    envKey: 'CRM_SERVICE_URL',
    fallback: 'http://127.0.0.1:4001',
    prefix: '/api/crm',
  });

  await registerProxy(app, {
    envKey: 'PM_SERVICE_URL',
    fallback: 'http://127.0.0.1:4002',
    prefix: '/api/pm',
    rewritePrefix: '',
  });

  await registerProxy(app, {
    envKey: 'INV_SERVICE_URL',
    fallback: 'http://127.0.0.1:4003',
    prefix: '/api/inv',
    rewritePrefix: '',
  });

  await registerProxy(app, {
    envKey: 'PROC_SERVICE_URL',
    fallback: 'http://127.0.0.1:4004',
    prefix: '/api/proc',
    rewritePrefix: '',
  });

  await registerProxy(app, {
    envKey: 'MES_SERVICE_URL',
    fallback: 'http://127.0.0.1:4006',
    prefix: '/api/mes',
    rewritePrefix: '',
  });

  await registerProxy(app, {
    envKey: 'PLM_SERVICE_URL',
    fallback: 'http://127.0.0.1:4007',
    prefix: '/api/plm',
    rewritePrefix: '',
  });

  await registerProxy(app, {
    envKey: 'QUALITY_SERVICE_URL',
    fallback: 'http://127.0.0.1:4008',
    prefix: '/api/quality',
    rewritePrefix: '',
  });

  // EAM controllers live under /eam/* on the service.
  await registerProxy(app, {
    envKey: 'EAM_SERVICE_URL',
    fallback: 'http://127.0.0.1:4009',
    prefix: '/api/eam',
    rewritePrefix: '/eam',
  });

  // Finance controllers live under /fin/* on the service.
  await registerProxy(app, {
    envKey: 'FIN_SERVICE_URL',
    fallback: 'http://127.0.0.1:4010',
    prefix: '/api/fin',
    rewritePrefix: '/fin',
  });

  await registerProxy(app, {
    envKey: 'ANALYTICS_SERVICE_URL',
    fallback: 'http://127.0.0.1:4011',
    prefix: '/api/analytics',
    rewritePrefix: '',
  });

  // HR controllers live under /hr/* on the service.
  await registerProxy(app, {
    envKey: 'HR_SERVICE_URL',
    fallback: 'http://127.0.0.1:4012',
    prefix: '/api/hr',
    rewritePrefix: '/hr',
  });

  // TaxLegal controllers live under /tax-legal/* on the service.
  await registerProxy(app, {
    envKey: 'TAX_SERVICE_URL',
    fallback: 'http://127.0.0.1:4015',
    prefix: '/api/tax-legal',
    rewritePrefix: '/tax-legal',
  });

  // Meilisearch (optional search UI) — not search-service
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
      rewriteRequestHeaders: (_originalReq, headers) => {
        const next = { ...headers };
        delete next['authorization'];
        delete next['Authorization'];
        if (meiliMasterKey) {
          next['Authorization'] = `Bearer ${meiliMasterKey}`;
        }
        return next;
      },
    },
  });

  // AI vector → search-service (reassigned 4018 to free 4008 for quality)
  await registerProxy(app, {
    envKey: 'SEARCH_SERVICE_URL',
    fallback: 'http://127.0.0.1:4018',
    prefix: '/api/ai',
    rewritePrefix: '/ai',
  });

  // Approvals (reassigned 4019 to free 4009 for eam); service routes under /approvals/*
  await registerProxy(app, {
    envKey: 'APPROVALS_SERVICE_URL',
    fallback: 'http://127.0.0.1:4019',
    prefix: '/api/approvals',
    rewritePrefix: '/approvals',
  });

  // Container-safe bind: HOST (default 0.0.0.0) + PORT (default 4005)
  const port = Number(process.env.PORT) || 4005;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  console.log(
    `API Gateway Fastify pure-proxy on http://${host}:${port} (CORS + multi-tenant claim injection)`,
  );

  const { startMtlsHealthSidecar, startMtlsProxySidecar } = await import('./mtls-listen');
  startMtlsHealthSidecar();
  startMtlsProxySidecar();
}
bootstrap();
