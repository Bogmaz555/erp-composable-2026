import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetProjectTasksQuery } from './get-project-tasks.query';
import { PrismaService } from '../prisma.service';

@QueryHandler(GetProjectTasksQuery)
export class GetProjectTasksHandler implements IQueryHandler<GetProjectTasksQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetProjectTasksQuery) {
    return this.prisma.isolatedClient.task.findMany({
      where: {
        projectId: query.projectId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
