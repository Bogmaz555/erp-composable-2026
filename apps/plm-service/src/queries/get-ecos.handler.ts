import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';

export class GetECOsQuery {}

@QueryHandler(GetECOsQuery)
export class GetECOsHandler implements IQueryHandler<GetECOsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    return this.prisma.engineeringChangeOrder.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
