import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetBomTreeQuery } from './get-bom-tree.query';
import { PrismaService } from '../prisma.service';

@QueryHandler(GetBomTreeQuery)
export class GetBomTreeHandler implements IQueryHandler<GetBomTreeQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetBomTreeQuery) {
    // Recursive BOM tree fetch using Prisma (simplified for now, production would use CTE or recursive function)
    const bomVersion = await this.prisma.bomVersion.findUnique({
      where: { id: query.bomVersionId },
      include: {
        item: true,
        components: {
          include: {
            childItem: true,
          },
        },
      },
    });

    if (!bomVersion) return null;

    // Build tree structure (recursive for deep ETO BOM visibility - production should use Postgres recursive CTE for performance)
    const buildTree = async (components: any[], depth: number = 0): Promise<any[]> => {
      if (depth > 12) return []; // Safety limit for very deep machine BOMs

      return Promise.all(components.map(async (comp) => {
        const childBom = comp.subBomVersionId
          ? await this.prisma.bomVersion.findUnique({ where: { id: comp.subBomVersionId } })
          : await this.prisma.bomVersion.findFirst({
              where: { itemId: comp.childItemId, status: 'RELEASED' },
              orderBy: { createdAt: 'desc' },
            });

        let subComponents: any[] = [];
        if (childBom) {
          const rawSub = await this.prisma.bomComponent.findMany({
            where: { bomVersionId: childBom.id },
            include: { childItem: true },
          });
          subComponents = await buildTree(rawSub, depth + 1);
        }

        return {
          ...comp,
          childItem: comp.childItem,
          subBom: childBom ? { version: childBom, components: subComponents } : null,
        };
      }));
    };

    const treeComponents = await buildTree(bomVersion.components);

    return {
      ...bomVersion,
      components: treeComponents,
    };
  }
}
