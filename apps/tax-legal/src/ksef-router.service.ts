import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { IssueKsefInvoiceRequest } from '@erp/shared-kernel';
import { KsefSandboxService } from './ksef-sandbox.service';
import { KsefProductionService } from './ksef-production.service';

/**
 * Routes KSeF to sandbox (default) or production.
 * Enterprise Q2 fail-closed: when KSEF_MODE=production under ENTERPRISE,
 * missing config aborts boot (see main.ts assertKsefEnterpriseBoot).
 */
@Injectable()
export class KsefRouterService implements OnModuleInit {
  private readonly logger = new Logger(KsefRouterService.name);

  constructor(
    private readonly sandbox: KsefSandboxService,
    private readonly production: KsefProductionService,
  ) {}

  onModuleInit() {
    const mode = process.env.KSEF_MODE || 'sandbox';
    if (mode === 'production' && !this.production.isConfigured()) {
      this.logger.error(
        'KSEF_MODE=production but KSEF_API_URL/KSEF_TOKEN missing — sends will fail-closed',
      );
    } else {
      this.logger.log(`KSeF router mode=${mode} ready=${this.getStatus().ready !== false}`);
    }
  }

  isProduction() {
    return process.env.KSEF_MODE === 'production';
  }

  async sendInvoice(request: IssueKsefInvoiceRequest) {
    if (this.isProduction()) {
      // assertConfigured inside production service
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
      failClosed: false,
    };
  }
}
