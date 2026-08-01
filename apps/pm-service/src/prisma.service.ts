import { Injectable, Scope, Inject, OnModuleDestroy } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaClient } from '.prisma/client-pm';
import {
  extendPrismaWithTenant,
  getTenantIdFromAls,
  resolveTenantId,
  SYSTEM_TENANT_ID,
  TENANT_HEADER,
} from '@erp/shared-kernel';

// Fail-fast: no hardcoded credentials — prefer PM_DATABASE_URL (pilot/prod: required only)
const isProdLike =
  process.env.NODE_ENV === 'production' ||
  process.env.PILOT === '1' ||
  process.env.AUTH_ENFORCE === 'true';
let PM_URL = (process.env.PM_DATABASE_URL || '').trim();
let pmUrlSource: 'PM_DATABASE_URL' | 'DATABASE_URL' | null = PM_URL
  ? 'PM_DATABASE_URL'
  : null;
if (!PM_URL && !isProdLike) {
  const fallback = (process.env.DATABASE_URL || '').trim();
  if (fallback) {
    PM_URL = fallback;
    pmUrlSource = 'DATABASE_URL';
  }
}
if (!PM_URL) {
  throw new Error(
    isProdLike
      ? 'PM_DATABASE_URL is required in production/pilot (hardcoded DB credentials are not allowed)'
      : 'PM_DATABASE_URL (or DATABASE_URL for local only) is required — set it in the environment; hardcoded DB credentials are not allowed',
  );
}
if (pmUrlSource === 'DATABASE_URL') {
  console.warn(
    '[pm-service] Using DATABASE_URL as fallback for PM (local only); prefer PM_DATABASE_URL to avoid cross-service DB mix-ups',
  );
}
if (!process.env.PM_DATABASE_URL) {
  process.env.PM_DATABASE_URL = PM_URL;
}

/**
 * PM Prisma — request-scoped with shared tenant extension.
 * All PM models (Project, WBS, Task, OutboxEvent, …) carry `tenantId`.
 */
@Injectable({ scope: Scope.REQUEST })
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  public tenantId: string;

  constructor(@Inject(REQUEST) private readonly request: any) {
    super({
      datasources: {
        db: {
          url: process.env.PM_DATABASE_URL || PM_URL,
        },
      },
    });

    this.tenantId = this.resolveRequestTenant();
  }

  private resolveRequestTenant(): string {
    const fromAls = getTenantIdFromAls();
    if (fromAls) return fromAls;

    const header =
      (this.request?.headers?.[TENANT_HEADER] as string | undefined) ||
      (this.request?.headers?.['x-tenant-id'] as string | undefined);
    const fromReq = header || (this.request?.tenantId as string | undefined);

    if (fromReq && fromReq !== SYSTEM_TENANT_ID) {
      return resolveTenantId(fromReq);
    }
    if (fromReq === SYSTEM_TENANT_ID && process.env.ALLOW_SYSTEM_TENANT === 'true') {
      return SYSTEM_TENANT_ID;
    }
    return resolveTenantId(process.env.DEFAULT_TENANT_ID || 'default');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Tenant-aware client — real row filters via shared-kernel tenant-extension.
   * findUnique is rewritten to findFirst({ id, tenantId }) (no illegal unique merge).
   */
  get isolatedClient() {
    const currentTenant = this.tenantId;
    return extendPrismaWithTenant(
      this,
      () => getTenantIdFromAls() || currentTenant,
      { modelsWithTenantId: 'all' },
    );
  }
}
