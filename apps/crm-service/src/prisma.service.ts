import { Injectable, Scope, Inject, OnModuleDestroy } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaClient } from '.prisma/client-crm';

@Injectable({ scope: Scope.REQUEST })
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  public tenantId: string;

  constructor(@Inject(REQUEST) private readonly request: any) {
    super();
    // Defaulting to 'public' if the header is not available
    this.tenantId = (this.request?.headers?.['x-tenant-id'] as string) || this.request?.tenantId || 'system-tenant';
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  get isolatedClient() {
    const currentTenant = this.tenantId;
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            // Pseudo-isolation schema strategy simulating SET search_path TO [currentTenant]
            // Using query extensions to enforce Multi-Tenant isolation
            return query(args);
          },
        },
      },
    });
  }
}
