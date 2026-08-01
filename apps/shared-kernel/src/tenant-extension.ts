/**
 * Shared tenant isolation for Prisma + worker context (Pilot PR 15).
 *
 * Model: single-tenant-per-deployment with row-level `tenantId` as defense-in-depth.
 * JWT / Keycloak claim name (OQ-1): {@link TENANT_JWT_CLAIM} = `tenantId`.
 *
 * Prisma rules (see design §4):
 * - findMany / findFirst / count / aggregate / updateMany / deleteMany → merge `where.tenantId`
 * - create / createMany → force `data.tenantId`
 * - findUnique → **rewrite to findFirst({ where: { …unique, tenantId } })**
 *   (never inject tenantId into findUnique where — illegal unless @@unique([id, tenantId]))
 * - update / delete by id → load with tenant scope first, then mutate by id
 * - upsert → findFirst + update/create with tenant (no id-only findUnique)
 *
 * Workers (no HTTP REQUEST scope):
 *   runWithTenant(event.tenantId || process.env.DEFAULT_TENANT_ID, () => handler(event));
 *
 * `system-tenant` is allowed only when ALLOW_SYSTEM_TENANT=true (migrate/seed jobs).
 */

import { AsyncLocalStorage } from 'async_hooks';

/** JWT / Keycloak claim name for tenant isolation (OQ-1 resolved). */
export const TENANT_JWT_CLAIM = 'tenantId' as const;

/** Header propagated by API gateway after claim validation. */
export const TENANT_HEADER = 'x-tenant-id' as const;

/** Reserved identity for migrate/seed system jobs — not for user HTTP. */
export const SYSTEM_TENANT_ID = 'system-tenant' as const;

export type TenantStore = {
  tenantId: string;
};

const tenantAls = new AsyncLocalStorage<TenantStore>();

export class TenantContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantContextError';
  }
}

/**
 * Normalize and validate a tenant id.
 * - Rejects empty
 * - Rejects `system-tenant` unless ALLOW_SYSTEM_TENANT=true
 */
export function resolveTenantId(raw?: string | null): string {
  const tid = (raw ?? '').trim();
  if (!tid) {
    throw new TenantContextError(
      'tenantId is required (set JWT claim tenantId, x-tenant-id, or DEFAULT_TENANT_ID)',
    );
  }
  if (tid === SYSTEM_TENANT_ID && process.env.ALLOW_SYSTEM_TENANT !== 'true') {
    throw new TenantContextError(
      'system-tenant is not allowed for user/worker paths (set ALLOW_SYSTEM_TENANT=true only for migrate/seed jobs)',
    );
  }
  return tid;
}

/**
 * Run `fn` with tenant bound in AsyncLocalStorage (NATS / cron workers).
 * Prefer explicit event.tenantId; fall back to DEFAULT_TENANT_ID via caller.
 */
export function runWithTenant<T>(tenantId: string, fn: () => T): T {
  const resolved = resolveTenantId(tenantId);
  return tenantAls.run({ tenantId: resolved }, fn);
}

/** Async variant for worker handlers. */
export async function runWithTenantAsync<T>(
  tenantId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const resolved = resolveTenantId(tenantId);
  return tenantAls.run({ tenantId: resolved }, fn);
}

/** Current ALS tenant, or undefined if not inside runWithTenant. */
export function getTenantIdFromAls(): string | undefined {
  return tenantAls.getStore()?.tenantId;
}

/**
 * Resolve active tenant: ALS → explicit → DEFAULT_TENANT_ID.
 * Throws if none available / invalid.
 */
export function getTenantId(explicit?: string | null): string {
  const fromAls = getTenantIdFromAls();
  if (fromAls) return fromAls;
  if (explicit != null && String(explicit).trim() !== '') {
    return resolveTenantId(explicit);
  }
  const def = process.env.DEFAULT_TENANT_ID?.trim();
  if (def) return resolveTenantId(def);
  throw new TenantContextError(
    'No tenant context (AsyncLocalStorage empty, no explicit tenantId, DEFAULT_TENANT_ID unset)',
  );
}

/** Extract tenant claim from a JWT-like payload (claim name = tenantId). */
export function tenantIdFromClaims(payload: Record<string, unknown> | null | undefined): string {
  if (!payload) {
    throw new TenantContextError('Missing token payload for tenant claim');
  }
  const primary = payload[TENANT_JWT_CLAIM];
  const legacy = payload['tenant'];
  const raw =
    typeof primary === 'string'
      ? primary
      : typeof legacy === 'string'
        ? legacy
        : null;
  return resolveTenantId(raw);
}

export type TenantExtensionOptions = {
  /**
   * Prisma schema model names (PascalCase) that include a `tenantId` column.
   * - omit or `'all'` → filter every model (PM / INV / FIN / …)
   * - `string[]` → only those models (use `[]` when schema has no tenantId yet, e.g. CRM)
   */
  modelsWithTenantId?: 'all' | string[];
};

function modelHasTenant(
  model: string,
  options?: TenantExtensionOptions,
): boolean {
  const cfg = options?.modelsWithTenantId;
  if (cfg === undefined || cfg === 'all') return true;
  return cfg.includes(model);
}

function uncapitalize(model: string): string {
  if (!model) return model;
  return model.charAt(0).toLowerCase() + model.slice(1);
}

function mergeWhere(where: unknown, tenantId: string): Record<string, unknown> {
  if (where == null || (typeof where === 'object' && Object.keys(where as object).length === 0)) {
    return { tenantId };
  }
  return { AND: [where, { tenantId }] };
}

function prismaNotFound(model: string, tenantId: string): Error {
  const err = new Error(
    `No ${model} found for tenant ${tenantId} (tenant-scoped ${'findFirst'} / mutate)`,
  ) as Error & { code?: string };
  err.code = 'P2025';
  return err;
}

/**
 * Build a Prisma client `$extends` argument that enforces tenant filters.
 * Prefer {@link extendPrismaWithTenant} so findUnique can rewrite via the base client.
 */
export function createTenantExtension(
  getTenantIdFn: () => string,
  options?: TenantExtensionOptions,
) {
  return {
    name: 'erpTenantIsolation',
    query: {
      $allModels: {
        async findMany({ model, args, query }: any) {
          if (!modelHasTenant(model, options)) return query(args);
          const tenantId = getTenantIdFn();
          args = { ...args, where: mergeWhere(args?.where, tenantId) };
          return query(args);
        },
        async findFirst({ model, args, query }: any) {
          if (!modelHasTenant(model, options)) return query(args);
          const tenantId = getTenantIdFn();
          args = { ...args, where: mergeWhere(args?.where, tenantId) };
          return query(args);
        },
        async findFirstOrThrow({ model, args, query }: any) {
          if (!modelHasTenant(model, options)) return query(args);
          const tenantId = getTenantIdFn();
          args = { ...args, where: mergeWhere(args?.where, tenantId) };
          return query(args);
        },
        /** findUnique is intentionally NOT rewritten here — use extendPrismaWithTenant. */
        async findUnique({ model, args, query }: any) {
          if (!modelHasTenant(model, options)) return query(args);
          // Safety net if used without extendPrismaWithTenant: post-filter only.
          const tenantId = getTenantIdFn();
          const row = await query(args);
          if (row != null && (row as { tenantId?: string }).tenantId !== tenantId) {
            return null;
          }
          return row;
        },
        async findUniqueOrThrow({ model, args, query }: any) {
          if (!modelHasTenant(model, options)) return query(args);
          const tenantId = getTenantIdFn();
          const row = await query(args);
          if (row == null || (row as { tenantId?: string }).tenantId !== tenantId) {
            throw prismaNotFound(model, tenantId);
          }
          return row;
        },
        async count({ model, args, query }: any) {
          if (!modelHasTenant(model, options)) return query(args);
          const tenantId = getTenantIdFn();
          args = { ...args, where: mergeWhere(args?.where, tenantId) };
          return query(args);
        },
        async aggregate({ model, args, query }: any) {
          if (!modelHasTenant(model, options)) return query(args);
          const tenantId = getTenantIdFn();
          args = { ...args, where: mergeWhere(args?.where, tenantId) };
          return query(args);
        },
        async groupBy({ model, args, query }: any) {
          if (!modelHasTenant(model, options)) return query(args);
          const tenantId = getTenantIdFn();
          args = { ...args, where: mergeWhere(args?.where, tenantId) };
          return query(args);
        },
        async create({ model, args, query }: any) {
          if (!modelHasTenant(model, options)) return query(args);
          const tenantId = getTenantIdFn();
          args = { ...args, data: { ...(args?.data ?? {}), tenantId } };
          return query(args);
        },
        async createMany({ model, args, query }: any) {
          if (!modelHasTenant(model, options)) return query(args);
          const tenantId = getTenantIdFn();
          const data = args?.data;
          if (Array.isArray(data)) {
            args = {
              ...args,
              data: data.map((row: Record<string, unknown>) => ({ ...row, tenantId })),
            };
          } else if (data && typeof data === 'object') {
            args = { ...args, data: { ...data, tenantId } };
          }
          return query(args);
        },
        async updateMany({ model, args, query }: any) {
          if (!modelHasTenant(model, options)) return query(args);
          const tenantId = getTenantIdFn();
          args = { ...args, where: mergeWhere(args?.where, tenantId) };
          // Prevent tenant reassignment via data
          if (args?.data && typeof args.data === 'object') {
            const { tenantId: _drop, ...rest } = args.data as Record<string, unknown>;
            args = { ...args, data: rest };
          }
          return query(args);
        },
        async deleteMany({ model, args, query }: any) {
          if (!modelHasTenant(model, options)) return query(args);
          const tenantId = getTenantIdFn();
          args = { ...args, where: mergeWhere(args?.where, tenantId) };
          return query(args);
        },
      },
    },
  };
}

/**
 * Extend a PrismaClient with full tenant isolation including findUnique → findFirst rewrite.
 *
 * @example
 *   const db = extendPrismaWithTenant(prisma, () => getTenantId(requestTenant));
 *   await db.project.findUnique({ where: { id } }); // → findFirst({ where: { id, tenantId } })
 */
export function extendPrismaWithTenant<TClient extends { $extends: (arg: unknown) => unknown }>(
  client: TClient,
  getTenantIdFn: () => string,
  options?: TenantExtensionOptions,
): ReturnType<TClient['$extends']> {
  const should = (model: string) => modelHasTenant(model, options);

  const baseExt = createTenantExtension(getTenantIdFn, options);

  return client.$extends({
    name: 'erpTenantIsolation',
    query: {
      $allModels: {
        ...baseExt.query.$allModels,

        /**
         * Do NOT merge tenantId into findUnique `where` (illegal for @id-only models).
         * Rewrite to base-client findFirst({ …where, tenantId }).
         */
        async findUnique({ model, args }: any) {
          if (!should(model)) {
            const delegate = (client as any)[uncapitalize(model)];
            return delegate.findUnique(args);
          }
          const tenantId = getTenantIdFn();
          const delegate = (client as any)[uncapitalize(model)];
          return delegate.findFirst({
            ...args,
            where: mergeWhere(args?.where, tenantId),
          });
        },

        async findUniqueOrThrow({ model, args }: any) {
          if (!should(model)) {
            const delegate = (client as any)[uncapitalize(model)];
            return delegate.findUniqueOrThrow(args);
          }
          const tenantId = getTenantIdFn();
          const delegate = (client as any)[uncapitalize(model)];
          if (typeof delegate.findFirstOrThrow === 'function') {
            return delegate.findFirstOrThrow({
              ...args,
              where: mergeWhere(args?.where, tenantId),
            });
          }
          const row = await delegate.findFirst({
            ...args,
            where: mergeWhere(args?.where, tenantId),
          });
          if (row == null) throw prismaNotFound(model, tenantId);
          return row;
        },

        async update({ model, args, query }: any) {
          if (!should(model)) return query(args);
          const tenantId = getTenantIdFn();
          const delegate = (client as any)[uncapitalize(model)];
          const existing = await delegate.findFirst({
            where: mergeWhere(args?.where, tenantId),
          });
          if (!existing) throw prismaNotFound(model, tenantId);
          const data = { ...(args?.data ?? {}) };
          delete data.tenantId; // never reassign tenant via update
          return query({
            ...args,
            where: { id: existing.id },
            data,
          });
        },

        async delete({ model, args, query }: any) {
          if (!should(model)) return query(args);
          const tenantId = getTenantIdFn();
          const delegate = (client as any)[uncapitalize(model)];
          const existing = await delegate.findFirst({
            where: mergeWhere(args?.where, tenantId),
          });
          if (!existing) throw prismaNotFound(model, tenantId);
          return query({
            ...args,
            where: { id: existing.id },
          });
        },

        /**
         * Prefer findFirst + update/create with tenant; avoid id-only upsert race across tenants.
         */
        async upsert({ model, args }: any) {
          if (!should(model)) {
            const delegate = (client as any)[uncapitalize(model)];
            return delegate.upsert(args);
          }
          const tenantId = getTenantIdFn();
          const delegate = (client as any)[uncapitalize(model)];
          const existing = await delegate.findFirst({
            where: mergeWhere(args?.where, tenantId),
          });
          if (existing) {
            const updateData = { ...(args?.update ?? {}) };
            delete updateData.tenantId;
            return delegate.update({
              where: { id: existing.id },
              data: updateData,
            });
          }
          return delegate.create({
            data: {
              ...(args?.create ?? {}),
              tenantId,
            },
          });
        },
      },
    },
  }) as ReturnType<TClient['$extends']>;
}

/**
 * Pure helper used by smokes/unit tests: describe how findUnique must be rewritten.
 * Illegal: findUnique({ where: { id, tenantId } }) when tenantId is not part of a unique index.
 * Legal: findFirst({ where: { id, tenantId } }) or findFirst({ where: { AND: [{ id }, { tenantId }] } }).
 */
export function findUniqueTenantRewrite(
  where: Record<string, unknown>,
  tenantId: string,
): { operation: 'findFirst'; where: Record<string, unknown> } {
  return {
    operation: 'findFirst',
    where: mergeWhere(where, tenantId),
  };
}

/** @deprecated Use extendPrismaWithTenant — alias for discoverability. */
export const withTenant = extendPrismaWithTenant;
