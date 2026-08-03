import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdatePipelineStageCommand } from './update-pipeline-stage.command';
import { PrismaService } from '../prisma.service';
import { OutboxStatus } from '.prisma/client-crm';
import { randomUUID } from 'crypto';

function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && v !== null && 'toNumber' in v) {
    return (v as { toNumber: () => number }).toNumber();
  }
  return Number(v) || 0;
}

@CommandHandler(UpdatePipelineStageCommand)
export class UpdatePipelineStageHandler implements ICommandHandler<UpdatePipelineStageCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdatePipelineStageCommand) {
    const { id, status } = command;

    // CRM models have no tenantId — use base Prisma client (isolatedClient findUnique breaks on empty model list)
    const db = this.prisma;

    if (status === 'ACCEPTED') {
      const opportunity = await db.opportunity.findUnique({
        where: { id },
        include: { BOMItem: true },
      });
      if (!opportunity) throw new Error('Opportunity not found');

      return db.$transaction(async (tx) => {
        const updated = await tx.opportunity.update({
          where: { id },
          data: { status },
          include: { BOMItem: true },
        });

        // Payload matches OpportunityAcceptedEvent for PM consumer
        const payload = {
          id: updated.id,
          title: updated.title,
          value: toNum(updated.value),
          tkw: toNum(updated.tkw),
          customerId: updated.customerId,
          status: updated.status,
          BOMItem: (updated.BOMItem || []).map((b) => ({
            catalogItemId: b.catalogItemId,
            quantity: b.quantity,
            price: toNum(b.price),
          })),
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        };

        await tx.outboxEvent.create({
          data: {
            id: randomUUID(),
            aggregateId: updated.id,
            aggregateType: 'Opportunity',
            eventType: 'crm.opportunity.won.v1',
            payload,
            status: OutboxStatus.PENDING,
          },
        });

        return { ...updated, value: toNum(updated.value), tkw: toNum(updated.tkw) };
      });
    }

    return db.opportunity.update({
      where: { id },
      data: { status },
    });
  }
}
