import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxStatus } from '@prisma/client-quality';

export type CapaStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'VERIFIED';

export class UpdateCapaStatusCommand {
  constructor(
    public readonly capaId: string,
    public readonly status: CapaStatus,
    public readonly rootCause?: string,
  ) {}
}

@CommandHandler(UpdateCapaStatusCommand)
export class UpdateCapaStatusHandler implements ICommandHandler<UpdateCapaStatusCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdateCapaStatusCommand) {
    const isClosed = command.status === 'DONE' || command.status === 'VERIFIED';

    // Domain write + outbox (when VERIFIED) in one TX
    return this.prisma.$transaction(async (tx) => {
      const capa = await tx.capaAction.update({
        where: { id: command.capaId },
        data: {
          status: command.status,
          ...(command.rootCause ? { rootCause: command.rootCause } : {}),
          ...(isClosed ? { completedAt: new Date() } : {}),
        },
      });

      if (command.status === 'VERIFIED') {
        await tx.outboxEvent.create({
          data: {
            tenantId: capa.tenantId,
            aggregateId: capa.id,
            aggregateType: 'CapaAction',
            eventType: 'quality.capa.verified.v1',
            payload: {
              capaId: capa.id,
              ncrId: capa.ncrId,
              verifiedAt: new Date().toISOString(),
            },
            status: OutboxStatus.PENDING,
          },
        });
      }

      return capa;
    });
  }
}
