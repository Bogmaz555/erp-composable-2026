import { Injectable, OnModuleInit } from '@nestjs/common';
import { BiProjectDashboardService } from './bi-project-dashboard.service';
import { PrismaService } from './prisma.service';

@Injectable()
export class BiProjectionService implements OnModuleInit {
  private usePrisma = false;

  constructor(
    private readonly dashboard: BiProjectDashboardService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      await this.prisma.biProjectSnapshot.findFirst({ take: 1 });
      this.usePrisma = true;
    } catch {
      this.usePrisma = false;
    }
  }

  getPersistenceMode() {
    return this.usePrisma ? 'prisma' : 'memory';
  }

  async refresh(projectId: string) {
    const payload = await this.dashboard.getDashboard(projectId);
    const refreshedAt = new Date();
    if (this.usePrisma) {
      await this.prisma.biProjectSnapshot.upsert({
        where: { projectId },
        create: { projectId, payload, refreshedAt },
        update: { payload, refreshedAt },
      });
    }
    return {
      projectId,
      source: 'materialized',
      persistence: this.getPersistenceMode(),
      refreshedAt: refreshedAt.toISOString(),
      snapshot: payload,
    };
  }

  async getSnapshot(projectId: string) {
    if (!this.usePrisma) {
      return { found: false, projectId, source: 'materialized', persistence: 'memory' };
    }
    const row = await this.prisma.biProjectSnapshot.findUnique({ where: { projectId } });
    if (!row) {
      return { found: false, projectId, source: 'materialized', persistence: 'prisma' };
    }
    return {
      found: true,
      projectId,
      source: 'materialized',
      persistence: 'prisma',
      payload: row.payload,
      refreshedAt: row.refreshedAt.toISOString(),
    };
  }

  getTtlHours() {
    return Number(process.env.BI_SNAPSHOT_TTL_HOURS || 168);
  }

  async snapshotStats() {
    if (!this.usePrisma) {
      return { total: 0, ttlHours: this.getTtlHours(), persistence: 'memory' as const };
    }
    const total = await this.prisma.biProjectSnapshot.count();
    return { total, ttlHours: this.getTtlHours(), persistence: 'prisma' as const };
  }

  async purgeExpired() {
    const ttlHours = this.getTtlHours();
    if (!this.usePrisma) {
      return { purged: 0, ttlHours, persistence: 'memory' as const, cutoff: null };
    }
    const cutoff = new Date(Date.now() - ttlHours * 3600000);
    const result = await this.prisma.biProjectSnapshot.deleteMany({
      where: { refreshedAt: { lt: cutoff } },
    });
    return {
      purged: result.count,
      ttlHours,
      persistence: 'prisma' as const,
      cutoff: cutoff.toISOString(),
    };
  }
}
