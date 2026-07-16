import { Injectable, Logger } from '@nestjs/common';

type DlqSlice = {
  service: string;
  failed: number;
  pending: number;
  recent: unknown[];
  ok: boolean;
};

@Injectable()
export class OutboxDlqService {
  private readonly logger = new Logger(OutboxDlqService.name);

  private targets = [
    { service: 'inv', url: process.env.INV_SERVICE_URL || 'http://127.0.0.1:4003' },
    { service: 'proc', url: process.env.PROC_SERVICE_URL || 'http://127.0.0.1:4004' },
    { service: 'quality', url: process.env.QUALITY_SERVICE_URL || 'http://127.0.0.1:4008' },
  ];

  async summary() {
    const slices: DlqSlice[] = [];
    for (const t of this.targets) {
      slices.push(await this.fetchSlice(t.service, t.url));
    }
    const totalFailed = slices.reduce((n, s) => n + s.failed, 0);
    return {
      totalFailed,
      services: slices,
      checkedAt: new Date().toISOString(),
    };
  }

  private async fetchSlice(service: string, base: string): Promise<DlqSlice> {
    try {
      const res = await fetch(`${base}/outbox/dead-letter`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error(String(res.status));
      const body = await res.json();
      return {
        service,
        failed: body.failed ?? 0,
        pending: body.pending ?? 0,
        recent: body.recent ?? [],
        ok: true,
      };
    } catch (e) {
      this.logger.debug(`DLQ skip ${service}: ${(e as Error).message}`);
      return { service, failed: 0, pending: 0, recent: [], ok: false };
    }
  }
}
