import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma/prisma.service';

export class GetNcrsQuery {}

@QueryHandler(GetNcrsQuery)
export class GetNcrsHandler implements IQueryHandler<GetNcrsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    return this.prisma.nonConformanceReport.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
