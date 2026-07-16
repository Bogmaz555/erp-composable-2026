import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface ExplodedBomLine {
  bomComponentId: string;
  childItemId: string;
  childPartNumber: string;
  quantity: number;
  position?: number;
  scrapFactor: number;
  bomLevel: number;
  parentBomComponentId?: string;
  isSubAssembly: boolean;
  subBomVersionId?: string;
}

@Injectable()
export class DoubleBomService {
  constructor(private readonly prisma: PrismaService) {}

  /** Rozwija Double BOM do listy liści (MRP/INV/reservations). */
  async explodeBomVersion(bomVersionId: string, maxDepth = 12): Promise<ExplodedBomLine[]> {
    const bomVersion = await this.prisma.bomVersion.findUnique({
      where: { id: bomVersionId },
      include: {
        components: { include: { childItem: true } },
      },
    });
    if (!bomVersion) return [];

    const out: ExplodedBomLine[] = [];
    const walk = async (
      components: typeof bomVersion.components,
      level: number,
      qtyMultiplier: number,
      parentBomComponentId?: string,
    ) => {
      if (level > maxDepth) return;
      for (const comp of components) {
        const lineQty = comp.quantity * qtyMultiplier * (1 + (comp.scrapFactor || 0));
        let subBomId = comp.subBomVersionId;
        if (!subBomId) {
          const auto = await this.prisma.bomVersion.findFirst({
            where: { itemId: comp.childItemId, status: 'RELEASED' },
            orderBy: { createdAt: 'desc' },
          });
          subBomId = auto?.id ?? null;
        }

        if (subBomId) {
          const sub = await this.prisma.bomVersion.findUnique({
            where: { id: subBomId },
            include: {
              components: { include: { childItem: true } },
            },
          });
          if (sub?.components?.length) {
            out.push({
              bomComponentId: comp.id,
              childItemId: comp.childItemId,
              childPartNumber: comp.childItem.partNumber,
              quantity: lineQty,
              position: comp.position ?? undefined,
              scrapFactor: comp.scrapFactor,
              bomLevel: level,
              parentBomComponentId,
              isSubAssembly: true,
              subBomVersionId: subBomId,
            });
            await walk(sub.components, level + 1, lineQty, comp.id);
            continue;
          }
        }

        out.push({
          bomComponentId: comp.id,
          childItemId: comp.childItemId,
          childPartNumber: comp.childItem.partNumber,
          quantity: lineQty,
          position: comp.position ?? undefined,
          scrapFactor: comp.scrapFactor,
          bomLevel: level,
          parentBomComponentId,
          isSubAssembly: false,
        });
      }
    };

    await walk(bomVersion.components, 0, 1);
    return out;
  }

  async status(bomVersionId: string) {
    const exploded = await this.explodeBomVersion(bomVersionId);
    const subAssemblies = exploded.filter((l) => l.isSubAssembly).length;
    return {
      bomVersionId,
      topLevelComponents: await this.prisma.bomComponent.count({ where: { bomVersionId } }),
      explodedLeafCount: exploded.filter((l) => !l.isSubAssembly).length,
      subAssemblyLinks: subAssemblies,
      hasDoubleBom: subAssemblies > 0,
      lines: exploded.slice(0, 50),
    };
  }
}
