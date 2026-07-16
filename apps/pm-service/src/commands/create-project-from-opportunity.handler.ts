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
    const {  name, totalBudget } = command;

    const existingProject = await this.prisma.project.findUnique({
      where: { id: command.opportunityId }
    });

    if (existingProject) {
      return existingProject;
    }

    return this.prisma.project.create({
      data: {
        name,
        
        status: 'ENGINEERING',
         // Soft link to CRM
      },
    });
  }
}
