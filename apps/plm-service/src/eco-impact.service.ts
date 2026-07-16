import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DoubleBomService } from './double-bom.service';

@Injectable()
export class EcoImpactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly doubleBom: DoubleBomService,
  ) {}

  private parseAffectedBoms(raw: unknown): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string');
    return [];
  }

  async analyze(ecoId: string) {
    const eco = await this.prisma.engineeringChangeOrder.findUnique({ where: { id: ecoId } });
    if (!eco) {
      return { found: false, ecoId };
    }

    const affectedBomIds = this.parseAffectedBoms(eco.affectedBoms);
    const bomDetails: Array<{
      bomVersionId: string;
      revision?: string;
      itemPartNumber?: string;
      topLevelComponents: number;
      explodedLeafCount: number;
      subAssemblyLinks: number;
    }> = [];

    for (const bomVersionId of affectedBomIds) {
      const status = await this.doubleBom.status(bomVersionId);
      const bom = await this.prisma.bomVersion.findUnique({
        where: { id: bomVersionId },
        include: { item: true },
      });
      bomDetails.push({
        bomVersionId,
        revision: bom?.revision,
        itemPartNumber: bom?.item?.partNumber,
        topLevelComponents: status.topLevelComponents,
        explodedLeafCount: status.explodedLeafCount,
        subAssemblyLinks: status.subAssemblyLinks,
      });
    }

    const totalExplodedLines = bomDetails.reduce((s, b) => s + b.explodedLeafCount, 0);
    const impactSummary = {
      affectedBomCount: affectedBomIds.length,
      totalExplodedLines,
      subAssemblyLinks: bomDetails.reduce((s, b) => s + b.subAssemblyLinks, 0),
      riskLevel: totalExplodedLines > 20 ? 'high' : totalExplodedLines > 5 ? 'medium' : 'low',
    };

    if (!eco.impactSummary) {
      await this.prisma.engineeringChangeOrder.update({
        where: { id: ecoId },
        data: { impactSummary },
      }).catch(() => {});
    }

    return {
      found: true,
      ecoId: eco.id,
      ecoNumber: eco.ecoNumber,
      title: eco.title,
      status: eco.status,
      impactSummary: eco.impactSummary ?? impactSummary,
      affectedBoms: bomDetails,
      checkedAt: new Date().toISOString(),
    };
  }
}
