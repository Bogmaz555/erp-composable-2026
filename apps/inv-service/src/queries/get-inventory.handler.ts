import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';

export class GetInventoryQuery {}

@QueryHandler(GetInventoryQuery)
export class GetInventoryHandler implements IQueryHandler<GetInventoryQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    return this.prisma.item.findMany({
      include: {
        stockLevels: true,
      },
      orderBy: {
        createdAt: 'desc',
      }
    });
  }
}
