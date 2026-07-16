import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';
import { GetGenealogyBackwardQuery } from './get-genealogy-backward.query';

@QueryHandler(GetGenealogyBackwardQuery)
export class GetGenealogyBackwardHandler implements IQueryHandler<GetGenealogyBackwardQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetGenealogyBackwardQuery) {
    const tenantId = query.tenantId || 'default';
    if (!query.childLotId && !query.bomComponentId) {
      throw new Error('Provide childLotId or bomComponentId for backward genealogy');
    }

    const links = await this.prisma.itemGenealogy.findMany({
      where: {
        tenantId,
        ...(query.childLotId ? { childLotId: query.childLotId } : {}),
        ...(query.bomComponentId ? { bomComponentId: query.bomComponentId } : {}),
      },
      orderBy: { consumedAt: 'desc' },
    });

    return {
      childLotId: query.childLotId,
      bomComponentId: query.bomComponentId,
      tenantId,
      direction: 'backward',
      links,
      count: links.length,
    };
  }
}
