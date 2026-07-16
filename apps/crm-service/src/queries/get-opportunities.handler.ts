import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetOpportunitiesQuery } from './get-opportunities.query';
import { PrismaService } from '../prisma.service';

@QueryHandler(GetOpportunitiesQuery)
export class GetOpportunitiesHandler implements IQueryHandler<GetOpportunitiesQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetOpportunitiesQuery) {
    const rows = await this.prisma.isolatedClient.opportunity.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        Customer: true,
        Activity: { orderBy: { createdAt: 'desc' } },
        Document: { orderBy: { uploadedAt: 'desc' } },
        BOMItem: { include: { CatalogItem: true } },
      },
    });

    return rows.map((o) => ({
      ...o,
      customer: o.Customer,
      activities: o.Activity,
      documents: o.Document,
      bomItems: o.BOMItem?.map((b) => ({
        ...b,
        catalogItem: b.CatalogItem,
      })),
      Customer: undefined,
      Activity: undefined,
      Document: undefined,
      BOMItem: undefined,
    }));
  }
}
