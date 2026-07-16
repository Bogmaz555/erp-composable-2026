import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';
import { GetGenealogyForwardQuery } from './get-genealogy-forward.query';

@QueryHandler(GetGenealogyForwardQuery)
export class GetGenealogyForwardHandler implements IQueryHandler<GetGenealogyForwardQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetGenealogyForwardQuery) {
    const tenantId = query.tenantId || 'default';
    const links = await this.prisma.itemGenealogy.findMany({
      where: {
        tenantId,
        parentSerialOrLot: query.parentSerialOrLot,
      },
      orderBy: { consumedAt: 'asc' },
    });
    return {
      parentSerialOrLot: query.parentSerialOrLot,
      tenantId,
      direction: 'forward',
      links,
      count: links.length,
    };
  }
}
