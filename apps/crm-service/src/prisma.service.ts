import { Injectable, Scope, Inject, OnModuleDestroy } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaClient } from '.prisma/client-crm';
import {
  extendPrismaWithTenant,
  getTenantIdFromAls,
  resolveTenantId,
  SYSTEM_TENANT_ID,
  TENANT_HEADER,
} from '@erp/shared-kernel';

/**
 * CRM Prisma — request-scoped with shared tenant extension.
 *
 * NOTE: CRM Prisma schema currently has **no** `tenantId` columns on domain models.
 * `modelsWithTenantId: []` wires the shared extension API without illegal filters.
 * When CRM gains tenantId fields, switch to `'all'` (or an explicit model list).
 */
@Injectable({ scope: Scope.REQUEST })
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  public tenantId: string;

  constructor(@Inject(REQUEST) private readonly request: any) {
    super();
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
    // Prefer DEFAULT_TENANT_ID over legacy system-tenant default for user paths
    return resolveTenantId(process.env.DEFAULT_TENANT_ID || 'default');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Tenant-aware client (shared-kernel extension).
   * CRM models lack tenantId today → filter list empty (honest no-op filters, real API).
   * Cast: `$extends` return is `unknown` in shared-kernel generic; same pattern as pm-service.
   */
  get isolatedClient(): PrismaClient {
    const currentTenant = this.tenantId;
    return extendPrismaWithTenant(
      this,
      () => getTenantIdFromAls() || currentTenant,
      { modelsWithTenantId: [] },
    ) as unknown as PrismaClient;
  }
}
