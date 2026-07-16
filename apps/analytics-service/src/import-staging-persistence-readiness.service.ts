import { Injectable } from '@nestjs/common';
import { ImportStagingService } from './import-staging.service';

@Injectable()
export class ImportStagingPersistenceReadinessService {
  private readonly analyticsBase = 'http://127.0.0.1:4011';

  constructor(private readonly staging: ImportStagingService) {}

  private async probe(url: string, init?: RequestInit) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = undefined;
      }
      return { ok: res.ok, body };
    } catch {
      return { ok: false, body: undefined };
    }
  }

  async getReadiness() {
    const persistenceMode = this.staging.getPersistenceMode();
    const sampleCsv =
      'partNumber,name,type,category,standardCost,currency\n"PERSIST-001","Persist part","COMPONENT","Test",5,"PLN"';

    const stage = await this.probe(`${this.analyticsBase}/import/products/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: sampleCsv }),
    });
    const batchId =
      stage.body && typeof stage.body === 'object'
        ? (stage.body as { batchId?: string }).batchId
        : undefined;
    const stagePersistence =
      stage.body && typeof stage.body === 'object'
        ? (stage.body as { persistence?: string }).persistence
        : undefined;

    let rollbackOk = false;
    if (batchId) {
      const rb = await this.probe(`${this.analyticsBase}/import/products/stage/${batchId}`, {
        method: 'DELETE',
      });
      rollbackOk = !!(rb.body && (rb.body as { rolledBack?: boolean }).rolledBack);
    }

    const persistentStaging = persistenceMode === 'prisma' && stagePersistence === 'prisma';
    const ready = persistentStaging && stage.ok && rollbackOk;
    const stagedCount = await this.staging.stagedCount();

    return {
      ready,
      td009: persistentStaging ? 'yellow-minimum' : stage.ok ? 'partial' : 'down',
      domain: 'IMPORT_STAGING',
      persistenceMode,
      persistentStaging,
      stagingUp: stage.ok && rollbackOk,
      stagedCount,
      capabilities: ['Prisma-backed import staging', 'stage/commit/rollback persistence'],
      checkedAt: new Date().toISOString(),
    };
  }
}
