import { Injectable } from '@nestjs/common';

@Injectable()
export class ValidationReadinessService {
  private readonly plmBase = 'http://127.0.0.1:4007';
  private readonly analyticsBase = 'http://127.0.0.1:4011';

  async getReadiness() {
    let plmValidation = false;
    try {
      const res = await fetch(`${this.plmBase}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(6000),
      });
      plmValidation = res.status === 400;
    } catch {
      plmValidation = false;
    }

    let importValidation = false;
    try {
      const res = await fetch(`${this.analyticsBase}/import/products/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: 'partNumber,name\n,broken' }),
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const body = await res.json();
        importValidation = Number(body.invalidRows ?? 0) >= 1 || Number(body.validRows ?? 0) === 0;
      }
    } catch {
      importValidation = false;
    }

    const score = [plmValidation, importValidation].filter(Boolean).length;

    return {
      ready: score >= 1,
      td010: score >= 2 ? 'yellow-minimum' : score >= 1 ? 'partial' : 'down',
      domain: 'VALIDATION',
      plmCreateValidation: plmValidation,
      importPreviewValidation: importValidation,
      capabilities: ['PLM required fields 400', 'import CSV row validation'],
      checkedAt: new Date().toISOString(),
    };
  }
}
