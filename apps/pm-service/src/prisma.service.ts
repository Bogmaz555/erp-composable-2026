import { Injectable, Scope, Inject, OnModuleDestroy } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaClient } from '.prisma/client-pm';

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