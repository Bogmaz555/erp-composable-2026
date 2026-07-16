import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { MrpNettingService } from './mrp-netting.service';

@Injectable()
export class MrpAggregateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mrp: MrpNettingService,
  ) {}

  async aggregate(projectId?: string) {
    const { lines } = await this.mrp.computeNetting(projectId);
    const orders = await this.prisma.purchaseOrder.findMany({
      where: projectId ? { projectId } : undefined,
    });

    const byStatus: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    for (const po of orders) {
      byStatus[po.status] = (byStatus[po.status] ?? 0) + 1;
      bySource[po.source] = (bySource[po.source] ?? 0) + 1;
    }

    const netPositive = lines.filter((l) => l.netRequirement > 0).length;
    const totalNetQty = lines.reduce((s, l) => s + Math.max(0, l.netRequirement), 0);

    return {
      purchaseOrderCount: orders.length,
      mrpLineCount: lines.length,
      netPositiveLines: netPositive,
      totalNetRequirement: Math.round(totalNetQty * 100) / 100,
      ordersByStatus: byStatus,
      ordersBySource: bySource,
      topShortages: lines
        .filter((l) => l.netRequirement > 0)
        .sort((a, b) => b.netRequirement - a.netRequirement)
        .slice(0, 5)
        .map((l) => ({ sku: l.sku, netRequirement: l.netRequirement })),
      checkedAt: new Date().toISOString(),
    };
  }
}
