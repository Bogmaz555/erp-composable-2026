import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma/prisma.service';

export class GetInspectionsQuery {}

@QueryHandler(GetInspectionsQuery)
export class GetInspectionsHandler implements IQueryHandler<GetInspectionsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    return this.prisma.inspection.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
