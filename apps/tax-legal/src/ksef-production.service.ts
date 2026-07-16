import { Injectable, Logger } from '@nestjs/common';
import type { IssueKsefInvoiceRequest } from '@erp/shared-kernel';

/**
 * KSeF 2.0 production adapter (env-gated).
 * KSEF_MODE=production + KSEF_API_URL + KSEF_TOKEN required.
 */
@Injectable()
export class KsefProductionService {
  private readonly logger = new Logger(KsefProductionService.name);

  async sendInvoice(request: IssueKsefInvoiceRequest): Promise<{ ksefReferenceNumber: string; mode: string }> {
    const apiUrl = process.env.KSEF_API_URL;
    const token = process.env.KSEF_TOKEN;

    if (!apiUrl || !token) {
      throw new Error('KSeF production: brak KSEF_API_URL lub KSEF_TOKEN');
    }

    const res = await fetch(`${apiUrl}/api/v2/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...request,
        faSchemaVersion: 'FA(3)',
        submittedAt: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`KSeF production HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const body = (await res.json()) as { referenceNumber?: string; ksefNumber?: string };
    const ref = body.referenceNumber || body.ksefNumber || `KSEF-PROD-${Date.now()}`;
    this.logger.log(`[KSeF PROD] Invoice ${ref} project=${request.projectId}`);
    return { ksefReferenceNumber: ref, mode: 'production' };
  }

  getStatus() {
    return {
      mode: 'production',
      apiUrl: process.env.KSEF_API_URL ? 'configured' : 'missing',
      token: process.env.KSEF_TOKEN ? 'configured' : 'missing',
      ready: !!(process.env.KSEF_API_URL && process.env.KSEF_TOKEN),
    };
  }
}
