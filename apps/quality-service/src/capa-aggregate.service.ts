import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class CapaAggregateService {
  constructor(private readonly prisma: PrismaService) {}

  async aggregate() {
    const [ncrs, capas, inspections] = await Promise.all([
      this.prisma.nonConformanceReport.findMany(),
      this.prisma.capaAction.findMany(),
      this.prisma.inspection.findMany(),
    ]);

    const ncrByStatus: Record<string, number> = {};
    const ncrBySeverity: Record<string, number> = {};
    for (const n of ncrs) {
      ncrByStatus[n.status] = (ncrByStatus[n.status] ?? 0) + 1;
      ncrBySeverity[n.severity] = (ncrBySeverity[n.severity] ?? 0) + 1;
    }

    const capaByStatus: Record<string, number> = {};
    for (const c of capas) {
      capaByStatus[c.status] = (capaByStatus[c.status] ?? 0) + 1;
    }

    const openNcr = ncrs.filter((n) => n.status === 'OPEN').length;
    const openCapa = capas.filter((c) => !['DONE', 'VERIFIED'].includes(c.status)).length;
    const capaCoverage = ncrs.length ? Math.round((capas.length / ncrs.length) * 100) : 0;

    return {
      ncrCount: ncrs.length,
      capaCount: capas.length,
      inspectionCount: inspections.length,
      openNcr,
      openCapa,
      capaCoveragePct: capaCoverage,
      ncrByStatus,
      ncrBySeverity,
      capaByStatus,
      checkedAt: new Date().toISOString(),
    };
  }
}
