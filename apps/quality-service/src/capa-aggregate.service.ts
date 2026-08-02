import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class CapaAggregateService {
  constructor(private readonly prisma: PrismaService) {}

  async aggregate() {
    const ncrByStatus: Record<string, number> = {};
    const ncrBySeverity: Record<string, number> = {};
    let ncrCount = 0;
    let openNcr = 0;
    let skipNcr = 0;
    while (true) {
      const batch = await this.prisma.nonConformanceReport.findMany({ skip: skipNcr, take: 500 });
      if (batch.length === 0) break;
      for (const n of batch) {
        ncrByStatus[n.status] = (ncrByStatus[n.status] ?? 0) + 1;
        ncrBySeverity[n.severity] = (ncrBySeverity[n.severity] ?? 0) + 1;
        if (n.status === 'OPEN') openNcr++;
      }
      ncrCount += batch.length;
      skipNcr += 500;
    }

    const capaByStatus: Record<string, number> = {};
    let capaCount = 0;
    let openCapa = 0;
    let skipCapa = 0;
    while (true) {
      const batch = await this.prisma.capaAction.findMany({ skip: skipCapa, take: 500 });
      if (batch.length === 0) break;
      for (const c of batch) {
        capaByStatus[c.status] = (capaByStatus[c.status] ?? 0) + 1;
        if (!['DONE', 'VERIFIED'].includes(c.status)) openCapa++;
      }
      capaCount += batch.length;
      skipCapa += 500;
    }

    const inspectionCount = await this.prisma.inspection.count();

    const capaCoveragePct = ncrCount ? Math.round((capaCount / ncrCount) * 100) : 0;

    return {
      ncrCount,
      capaCount,
      inspectionCount,
      openNcr,
      openCapa,
      capaCoveragePct,
      ncrByStatus,
      ncrBySeverity,
      capaByStatus,
      checkedAt: new Date().toISOString(),
    };
  }
}
