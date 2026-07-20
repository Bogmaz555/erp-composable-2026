import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateProjectFromOpportunityCommand } from './create-project-from-opportunity.command';
import { PrismaClient } from '.prisma/client-pm';

@CommandHandler(CreateProjectFromOpportunityCommand)
export class CreateProjectFromOpportunityHandler implements ICommandHandler<CreateProjectFromOpportunityCommand> {
  // Creating a dedicated isolated background client since NATS Event doesn't have an HTTP Request scope
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async execute(command: CreateProjectFromOpportunityCommand) {
    const { opportunityId, name, targetRevenue, baselineCost, bomItems } = command;

    const existingProject = await this.prisma.project.findUnique({
      where: { id: opportunityId }
    });

    if (existingProject) {
      return existingProject;
    }

    return this.prisma.$transaction(async (tx) => {
      // Create Project using CRM Opportunity ID
      const project = await tx.project.create({
        data: {
          id: opportunityId,
          name,
          status: 'ENGINEERING',
          targetRevenue,
          baselineCost,
          budget: baselineCost, // keep budget synced to baselineCost for legacy logic
        },
      });

      // Create root WBS element
      const rootWbs = await tx.wbsElement.create({
        data: {
          projectId: project.id,
          name: 'Stacja Główna (Automatyczna generacja CRM)',
          type: 'ROOT',
          status: 'PENDING'
        }
      });

      // Import BOM Items as material tasks or child elements
      if (bomItems && bomItems.length > 0) {
        await tx.wbsElement.createMany({
          data: bomItems.map(item => ({
            projectId: project.id,
            parentId: rootWbs.id,
            name: `Komponent: ${item.catalogItemId} (Ilość: ${item.quantity})`,
            type: 'MATERIAL',
            status: 'PENDING'
          }))
        });
      }

      return project;
    });
  }
}
