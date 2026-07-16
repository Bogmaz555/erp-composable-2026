import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';
import { GetGenealogyChainQuery } from './get-genealogy-chain.query';

@QueryHandler(GetGenealogyChainQuery)
export class GetGenealogyChainHandler implements IQueryHandler<GetGenealogyChainQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetGenealogyChainQuery) {
    const tenantId = query.tenantId || 'default';
    const links = await this.prisma.itemGenealogy.findMany({
      where: { tenantId, parentSerialOrLot: query.parentSerialOrLot },
      orderBy: { consumedAt: 'asc' },
    });

    const workOrderIds = [...new Set(links.map((l) => l.workOrderId).filter(Boolean))] as string[];
    const bomLines = [...new Set(links.map((l) => l.bomComponentId).filter(Boolean))] as string[];
    const totalQty = links.reduce((s, l) => s + (l.quantityUsed ?? 0), 0);

    return {
      parentSerialOrLot: query.parentSerialOrLot,
      tenantId,
      direction: 'chain',
      links,
      count: links.length,
      summary: {
        componentLines: links.length,
        uniqueBomComponents: bomLines.length,
        workOrders: workOrderIds.length,
        totalQuantityUsed: totalQty,
        workOrderIds,
      },
    };
  }
}
