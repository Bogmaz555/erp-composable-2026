import { Injectable, Logger } from '@nestjs/common';
import type { IssueKsefInvoiceRequest } from '@erp/shared-kernel';

/**
 * KSeF 2.0 sandbox adapter (Faza 2 POC).
 * ADR-004: Only TaxLegalPBC may issue tax invoices.
 */
@Injectable()
export class KsefSandboxService {
  private readonly logger = new Logger(KsefSandboxService.name);

  async sendInvoice(request: IssueKsefInvoiceRequest): Promise<{ ksefReferenceNumber: string }> {
    const sandbox = process.env.KSEF_SANDBOX_URL;
    if (sandbox) {
      try {
        const res = await fetch(`${sandbox}/api/v2/invoices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        if (res.ok) {
          const body = (await res.json()) as { referenceNumber?: string };
          return { ksefReferenceNumber: body.referenceNumber || `KSEF-${Date.now()}` };
        }
      } catch (e) {
        this.logger.warn(`KSeF sandbox unreachable: ${(e as Error).message}`);
      }
    }

    const ref = `KSEF-SBX-${request.projectId.slice(0, 8)}-${request.milestone}-${Date.now()}`;
    this.logger.log(`[KSeF MOCK] Invoice ${ref} amount=${request.amount} ${request.currency}`);
    return { ksefReferenceNumber: ref };
  }
}
