import { Injectable } from '@nestjs/common';
import type { IssueKsefInvoiceRequest } from '@erp/shared-kernel';
import { KsefSandboxService } from './ksef-sandbox.service';
import { KsefProductionService } from './ksef-production.service';

@Injectable()
export class KsefRouterService {
  constructor(
    private readonly sandbox: KsefSandboxService,
    private readonly production: KsefProductionService,
  ) {}

  isProduction() {
    return process.env.KSEF_MODE === 'production';
  }

  async sendInvoice(request: IssueKsefInvoiceRequest) {
    if (this.isProduction()) {
      return this.production.sendInvoice(request);
    }
    const result = await this.sandbox.sendInvoice(request);
    return { ...result, mode: 'sandbox' };
  }

  getStatus() {
    if (this.isProduction()) {
      return this.production.getStatus();
    }
    return {
      mode: 'sandbox',
      sandboxUrl: process.env.KSEF_SANDBOX_URL || 'mock',
      ready: true,
    };
  }
}
