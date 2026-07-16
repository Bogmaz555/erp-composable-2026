import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

const PLM_URL = process.env.PLM_SERVICE_URL || 'http://127.0.0.1:4007';
const DEFAULT_LEAD_DAYS = 14;

@Injectable()
export class LongLeadRadarService {
  private readonly logger = new Logger(LongLeadRadarService.name);
  readonly thresholdDays = parseInt(process.env.LONG_LEAD_THRESHOLD_DAYS || '28', 10);

  constructor(private readonly prisma: PrismaService) {}

  async resolveLeadTimeDays(sku: string, tenantId: string): Promise<number> {
    try {
      const res = await fetch(`${PLM_URL}/products?tenantId=${tenantId}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const items = (await res.json()) as Array<{ sku?: string; partNumber?: string; leadTimeDays?: number | null }>;
        const hit = items.find((i) => i.sku === sku || i.partNumber === sku);
        if (hit?.leadTimeDays != null) return hit.leadTimeDays;
      }
    } catch {
      /* PLM optional */
    }

    const supplier = await this.prisma.supplier.findFirst({
      where: { isActive: true, leadTimeDays: { not: null } },
      orderBy: { leadTimeDays: 'desc' },
    });
    return supplier?.leadTimeDays ?? DEFAULT_LEAD_DAYS;
  }

  isLongLead(leadTimeDays: number): boolean {
    return leadTimeDays >= this.thresholdDays;
  }

  async status(tenantId = 'default') {
    const longLead = await this.prisma.purchaseOrder.count({
      where: { tenantId, source: 'LONG_LEAD' },
    });
    const recent = await this.prisma.purchaseOrder.findMany({
      where: { tenantId, source: 'LONG_LEAD' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { supplier: true },
    });
    return {
      thresholdDays: this.thresholdDays,
      longLeadOrders: longLead,
      recent,
    };
  }
}
