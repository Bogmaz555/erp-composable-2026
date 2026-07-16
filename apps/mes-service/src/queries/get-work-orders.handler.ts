import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetWorkOrdersQuery } from './get-work-orders.query';
import { PrismaService } from '../prisma.service';

@QueryHandler(GetWorkOrdersQuery)
export class GetWorkOrdersHandler implements IQueryHandler<GetWorkOrdersQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetWorkOrdersQuery) {
    return this.prisma.workOrder.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
