import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAvailableStockQuery } from './get-available-stock.query';
import { PrismaService } from '../prisma.service';

@QueryHandler(GetAvailableStockQuery)
export class GetAvailableStockHandler implements IQueryHandler<GetAvailableStockQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetAvailableStockQuery) {
    const stock = await this.prisma.stockLevel.findMany({
      where: { itemId: query.itemId },
    });

    const activeReservations = await this.prisma.reservation.findMany({
      where: {
        itemId: query.itemId,
        status: 'ACTIVE',
        ...(query.projectId && { projectId: query.projectId }),
      },
    });

    const totalStock = stock.reduce((sum, s) => sum + s.quantity, 0);
    const reserved = activeReservations.reduce((sum, r) => sum + r.quantity, 0);

    return {
      itemId: query.itemId,
      totalStock,
      reserved,
      available: totalStock - reserved,
      locations: stock.map(s => ({ location: s.location, qty: s.quantity })),
    };
  }
}
