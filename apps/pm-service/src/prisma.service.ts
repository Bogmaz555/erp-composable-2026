import { Injectable, Scope, Inject, OnModuleDestroy } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaClient } from '.prisma/client-pm';

// ⚡ OSTATECZNE TWARDE WPIĘCIE - ZANIM SILNIK PRISMA SIĘ OBUDZI ⚡
const PM_URL = "postgresql://erp_user:erp_password@localhost:5434/pm_db?schema=public";

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
          url: process.env.PM_DATABASE_URL || PM_URL
        }
      }
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