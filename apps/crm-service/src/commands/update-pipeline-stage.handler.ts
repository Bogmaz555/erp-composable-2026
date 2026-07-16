import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdatePipelineStageCommand } from './update-pipeline-stage.command';
import { PrismaService } from '../prisma.service';
import { OutboxStatus } from '.prisma/client-crm';

@CommandHandler(UpdatePipelineStageCommand)
export class UpdatePipelineStageHandler implements ICommandHandler<UpdatePipelineStageCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdatePipelineStageCommand) {
    const { id, status } = command;
    
    if (status === 'ACCEPTED') {
      const opportunity = await this.prisma.isolatedClient.opportunity.findUnique({ where: { id } });
      if (!opportunity) throw new Error('Opportunity not found');

      return this.prisma.isolatedClient.$transaction(async (tx) => {
        const updated = await tx.opportunity.update({
          where: { id },
          data: { status },
        });

        await tx.outboxEvent.create({ data: { id: require('crypto').randomUUID(), 
            aggregateId: updated.id,
            aggregateType: 'Opportunity',
            eventType: 'OpportunityWon',
            payload: { ...updated },
            status: OutboxStatus.PENDING,
          },
        });

        return updated;
      });
    }

    return this.prisma.isolatedClient.opportunity.update({
      where: { id },
      data: { status },
    });
  }
}
