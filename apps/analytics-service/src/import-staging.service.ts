import { Injectable, OnModuleInit } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { PrismaService } from './prisma.service';
import { randomUUID } from 'crypto';

interface StagedBatch {
  batchId: string;
  rows: Record<string, string>[];
  createdAt: string;
}

@Injectable()
export class ImportStagingService implements OnModuleInit {
  private usePrisma = false;
  private readonly batches = new Map<string, StagedBatch>();

  constructor(
    private readonly platform: PlatformService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      await this.prisma.importStagingBatch.findFirst({ take: 1 });
      this.usePrisma = true;
    } catch {
      this.usePrisma = false;
    }
  }

  getPersistenceMode() {
    return this.usePrisma ? 'prisma' : 'memory';
  }

  async stage(csv: string) {
    const { rows, errors } = this.platform.parseProductCsv(csv);
    const batchId = `stg-${randomUUID().slice(0, 8)}`;
    const createdAt = new Date().toISOString();

    if (this.usePrisma) {
      await this.prisma.importStagingBatch.create({
        data: {
          id: batchId,
          rows,
          rowCount: rows.length,
          status: 'STAGED',
        },
      });
    } else {
      this.batches.set(batchId, { batchId, rows, createdAt });
    }

    return {
      batchId,
      stagedRows: rows.length,
      persistence: this.getPersistenceMode(),
      errors: errors.slice(0, 10),
      expiresHint: this.usePrisma ? 'persisted in analytics DB' : 'commit or rollback before restart',
      checkedAt: new Date().toISOString(),
    };
  }

  async getBatch(batchId: string) {
    if (this.usePrisma) {
      const batch = await this.prisma.importStagingBatch.findUnique({ where: { id: batchId } });
      if (!batch || batch.status !== 'STAGED') return null;
      const rows = batch.rows as Record<string, string>[];
      return {
        batchId: batch.id,
        stagedRows: batch.rowCount,
        persistence: this.getPersistenceMode(),
        preview: rows.slice(0, 3),
        createdAt: batch.createdAt.toISOString(),
      };
    }

    const batch = this.batches.get(batchId);
    if (!batch) return null;
    return {
      batchId: batch.batchId,
      stagedRows: batch.rows.length,
      persistence: this.getPersistenceMode(),
      preview: batch.rows.slice(0, 3),
      createdAt: batch.createdAt,
    };
  }

  async commit(batchId: string) {
    const rows = await this.loadRows(batchId);
    if (!rows) return { ok: false, error: 'Batch not found', imported: 0 };

    let imported = 0;
    const errors: string[] = [];
    for (const row of rows) {
      try {
        const res = await fetch('http://127.0.0.1:4007/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            partNumber: row.partNumber,
            name: row.name,
            type: row.type || 'COMPONENT',
            category: row.category,
            standardCost: parseFloat(row.standardCost) || 0,
            currency: row.currency || 'PLN',
          }),
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) imported++;
        else errors.push(`${row.partNumber}: HTTP ${res.status}`);
      } catch (e) {
        errors.push(`${row.partNumber}: ${(e as Error).message}`);
      }
    }

    await this.removeBatch(batchId, 'COMMITTED');
    this.platform.recordEvent('platform.import.staging.commit', 'platform', { batchId, imported });
    return { ok: true, batchId, imported, persistence: this.getPersistenceMode(), errors: errors.slice(0, 10) };
  }

  async rollback(batchId: string) {
    const existed = await this.removeBatch(batchId, 'ROLLED_BACK');
    if (existed) {
      this.platform.recordEvent('platform.import.staging.rollback', 'platform', { batchId });
    }
    return { ok: existed, batchId, rolledBack: existed, persistence: this.getPersistenceMode() };
  }

  async stagedCount() {
    if (this.usePrisma) {
      return this.prisma.importStagingBatch.count({ where: { status: 'STAGED' } });
    }
    return this.batches.size;
  }

  private async loadRows(batchId: string): Promise<Record<string, string>[] | null> {
    if (this.usePrisma) {
      const batch = await this.prisma.importStagingBatch.findUnique({ where: { id: batchId } });
      if (!batch || batch.status !== 'STAGED') return null;
      return batch.rows as Record<string, string>[];
    }
    const batch = this.batches.get(batchId);
    return batch?.rows ?? null;
  }

  private async removeBatch(batchId: string, status: 'COMMITTED' | 'ROLLED_BACK') {
    if (this.usePrisma) {
      const batch = await this.prisma.importStagingBatch.findUnique({ where: { id: batchId } });
      if (!batch || batch.status !== 'STAGED') return false;
      await this.prisma.importStagingBatch.update({
        where: { id: batchId },
        data: { status },
      });
      return true;
    }
    return this.batches.delete(batchId);
  }
}
