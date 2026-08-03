import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateProjectFromOpportunityCommand } from './create-project-from-opportunity.command';
import { PrismaClient, OutboxStatus } from '.prisma/client-pm';
import { randomUUID } from 'crypto';

@CommandHandler(CreateProjectFromOpportunityCommand)
export class CreateProjectFromOpportunityHandler
  implements ICommandHandler<CreateProjectFromOpportunityCommand>
{
  /** Background client — NATS events have no HTTP request scope. */
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async execute(command: CreateProjectFromOpportunityCommand) {
    const { opportunityId, name, targetRevenue, baselineCost, bomItems } = command;
    const tenantId = process.env.DEFAULT_TENANT_ID || 'default';

    const existingProject = await this.prisma.project.findUnique({
      where: { id: opportunityId },
    });
    if (existingProject) {
      return existingProject;
    }

    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          id: opportunityId,
          tenantId,
          name: name || 'Project from CRM opportunity',
          status: 'ENGINEERING',
          targetRevenue,
          baselineCost,
          budget: baselineCost,
        },
      });

      const rootWbs = await tx.wbsElement.create({
        data: {
          tenantId,
          projectId: project.id,
          name: 'Stacja Główna (CRM → PM)',
          type: 'ROOT',
          status: 'PENDING',
        },
      });

      if (bomItems && bomItems.length > 0) {
        await tx.wbsElement.createMany({
          data: bomItems.map((item: { catalogItemId?: string; quantity?: number }) => ({
            tenantId,
            projectId: project.id,
            parentId: rootWbs.id,
            name: `Komponent: ${item.catalogItemId ?? 'item'} (×${item.quantity ?? 1})`,
            type: 'MATERIAL',
            status: 'PENDING',
          })),
        });
      }

      await tx.outboxEvent.create({
        data: {
          id: randomUUID(),
          tenantId,
          aggregateId: project.id,
          aggregateType: 'Project',
          eventType: 'pm.project.created.from-crm.v1',
          payload: {
            projectId: project.id,
            opportunityId,
            tenantId,
            name: project.name,
            status: project.status,
            targetRevenue: Number(targetRevenue ?? 0),
            baselineCost: Number(baselineCost ?? 0),
          },
          status: OutboxStatus.PENDING,
        },
      });

      return project;
    });
  }
}
