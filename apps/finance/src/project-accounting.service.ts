import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

const COST_TYPES = ['MATERIAL', 'LABOR', 'OVERHEAD', 'SUBCONTRACT'] as const;

@Injectable()
export class ProjectAccountingService {
  constructor(private readonly prisma: PrismaService) {}

  async getWipBreakdown(projectId: string) {
    const costs = await this.prisma.projectCost.findMany({
      where: { projectId },
      orderBy: { bookedAt: 'desc' },
    });

    const byType: Record<string, { amount: number; count: number }> = {};
    for (const t of COST_TYPES) {
      byType[t] = { amount: 0, count: 0 };
    }
    for (const c of costs) {
      const key = c.costType in byType ? c.costType : 'OTHER';
      if (!byType[key]) byType[key] = { amount: 0, count: 0 };
      byType[key].amount += c.amount;
      byType[key].count += 1;
    }

    const wip = await this.prisma.wipAccount.findUnique({ where: { projectId } });
    const milestones = await this.prisma.milestoneBilling.findMany({
      where: { projectId },
      orderBy: { milestone: 'asc' },
    });

    const costTotal = Object.values(byType).reduce((s, v) => s + v.amount, 0);
    const wipBalance = wip?.wipBalance ?? 0;
    const materialReserved = wip?.materialReserved ?? 0;
    const laborFromWip = wip?.laborCost ?? 0;

    return {
      found: costs.length > 0 || !!wip || milestones.length > 0,
      projectId,
      breakdown: byType,
      wip: wip
        ? {
            wipBalance: Math.round(wip.wipBalance * 100) / 100,
            materialReserved: Math.round(wip.materialReserved * 100) / 100,
            laborCost: Math.round(wip.laborCost * 100) / 100,
          }
        : null,
      milestones: milestones.map((m) => ({
        milestone: m.milestone,
        amount: m.amount,
        status: m.status,
        percent: m.percent,
      })),
      totals: {
        projectCostEntries: costs.length,
        costByTypeTotal: Math.round(costTotal * 100) / 100,
        wipBalance: Math.round(wipBalance * 100) / 100,
        materialReserved: Math.round(materialReserved * 100) / 100,
        laborFromWip: Math.round(laborFromWip * 100) / 100,
        combinedActual: Math.round((costTotal + laborFromWip + materialReserved) * 100) / 100,
      },
      checkedAt: new Date().toISOString(),
    };
  }
}
