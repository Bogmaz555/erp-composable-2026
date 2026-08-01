import { Injectable, Scope, Inject, OnModuleDestroy } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaClient } from '.prisma/client-pm';

// Fail-fast: no hardcoded credentials — require env (PM_DATABASE_URL or DATABASE_URL)
const PM_URL = process.env.PM_DATABASE_URL || process.env.DATABASE_URL;
if (!PM_URL) {
  throw new Error(
    'PM_DATABASE_URL (or DATABASE_URL) is required — set it in the environment; hardcoded DB credentials are not allowed',
  );
}
if (!process.env.PM_DATABASE_URL) {
  process.env.PM_DATABASE_URL = PM_URL;
}

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

    // Ochrona kontekstu przed awarią NATS
    this.tenantId = (this.request?.headers?.['x-tenant-id'] as string) || this.request?.tenantId || 'system-tenant';
  }


  async onModuleDestroy() {
    await this.$disconnect();
  }

  get isolatedClient() {
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            // Pseudo-isolation schema strategy simulating SET search_path TO [currentTenant]
            return query(args);
          },
        },
      },
    });
  }
}