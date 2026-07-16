import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma/prisma.service';

export class GetCapaQuery {
  constructor(public readonly ncrId?: string) {}
}

@QueryHandler(GetCapaQuery)
export class GetCapaHandler implements IQueryHandler<GetCapaQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetCapaQuery) {
    return this.prisma.capaAction.findMany({
      where: query.ncrId ? { ncrId: query.ncrId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }
}
