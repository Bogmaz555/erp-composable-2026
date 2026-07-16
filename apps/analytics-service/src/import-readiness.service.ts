import { Injectable } from '@nestjs/common';

@Injectable()
export class ImportReadinessService {
  private readonly analyticsBase = 'http://127.0.0.1:4011';

  async getReadiness() {
    const sampleCsv =
      'partNumber,name,type,category,standardCost,currency\n"PREVIEW-001","Test part","COMPONENT","Test",10,"PLN"';
    try {
      const res = await fetch(`${this.analyticsBase}/import/products/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: sampleCsv }),
        signal: AbortSignal.timeout(8000),
      });
      const body = res.ok ? await res.json() : null;
      const previewOk =
        res.ok &&
        body &&
        typeof body === 'object' &&
        (body as { mode?: string }).mode === 'preview' &&
        Number((body as { validRows?: number }).validRows) >= 1;

      let stagingOk = false;
      try {
        const stg = await fetch(`${this.analyticsBase}/import/products/stage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csv: sampleCsv }),
          signal: AbortSignal.timeout(8000),
        });
        const stgBody = stg.ok ? await stg.json() : null;
        const batchId = stgBody && (stgBody as { batchId?: string }).batchId;
        if (batchId) {
          const rb = await fetch(`${this.analyticsBase}/import/products/stage/${batchId}`, {
            method: 'DELETE',
            signal: AbortSignal.timeout(8000),
          });
          const rbBody = rb.ok ? await rb.json() : null;
          stagingOk = !!(rbBody && (rbBody as { rolledBack?: boolean }).rolledBack);
        }
      } catch {
        stagingOk = false;
      }

      return {
        ready: previewOk && stagingOk,
        td009: previewOk && stagingOk ? 'yellow-minimum' : previewOk ? 'partial' : 'down',
        domain: 'IMPORT',
        previewUp: previewOk,
        stagingUp: stagingOk,
        capabilities: ['CSV import preview', 'stage/commit/rollback'],
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return {
        ready: false,
        td009: 'down',
        domain: 'IMPORT',
        previewUp: false,
        stagingUp: false,
        capabilities: ['CSV import preview'],
        checkedAt: new Date().toISOString(),
      };
    }
  }
}
