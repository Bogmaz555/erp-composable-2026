import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetProjectsWithWbsQuery } from './get-projects-with-wbs.query';

// STRZAŁ SNAJPERSKI: Zmiana importu na dedykowanego klienta PM!
import { PrismaClient } from '.prisma/client-pm';

// BRUTALNE OMINIĘCIE: Łączymy się z bazą bezpośrednio, ignorując Kwatermistrza (DI)
const directPrisma = new PrismaClient();

@QueryHandler(GetProjectsWithWbsQuery)
export class GetProjectsWithWbsHandler implements IQueryHandler<GetProjectsWithWbsQuery> {
  async execute(query: GetProjectsWithWbsQuery) {
    return directPrisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        wbsElements: {
          include: {
            children: true, // Pobiera podzadania
          },
        },
      },
    });
  }
}