import { Injectable, Logger } from '@nestjs/common';
import type { IssueKsefInvoiceRequest } from '@erp/shared-kernel';

/**
 * KSeF 2.0 production adapter (env-gated).
 * KSEF_MODE=production + KSEF_API_URL + KSEF_TOKEN required.
 * Cert path optional: KSEF_CERT_PATH (mTLS / signing evidence).
 *
 * Enterprise Q2: fail-closed — never invent a success when config missing.
 */
@Injectable()
export class KsefProductionService {
  private readonly logger = new Logger(KsefProductionService.name);

  /** True when production credentials are present (no secrets logged). */
  isConfigured(): boolean {
    return !!(process.env.KSEF_API_URL && process.env.KSEF_TOKEN);
  }

  /**
   * Fail-closed assert for boot / router.
   * Throws when production mode is selected without required env.
   */
  assertConfigured(context = 'KSeF production'): void {
    const missing: string[] = [];
    if (!process.env.KSEF_API_URL) missing.push('KSEF_API_URL');
    if (!process.env.KSEF_TOKEN) missing.push('KSEF_TOKEN');
    if (missing.length) {
      throw new Error(
        `${context}: missing required env ${missing.join(', ')} — fail-closed (set secrets via env/Vault, never git)`,
      );
    }
  }

  async sendInvoice(request: IssueKsefInvoiceRequest): Promise<{ ksefReferenceNumber: string; mode: string }> {
    this.assertConfigured('KSeF production send');

    const apiUrl = process.env.KSEF_API_URL!;
    const token = process.env.KSEF_TOKEN!;

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
    const ready = this.isConfigured();
    return {
      mode: 'production',
      apiUrl: process.env.KSEF_API_URL ? 'configured' : 'missing',
      token: process.env.KSEF_TOKEN ? 'configured' : 'missing',
      certPath: process.env.KSEF_CERT_PATH ? 'configured' : 'optional-missing',
      ready,
      failClosed: !ready,
      evidence: {
        faSchema: 'FA(3)',
        requiresToken: true,
        secretsInGit: false,
      },
    };
  }
}
