import { Logger } from '@nestjs/common';
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
export class UpdateCapaStatusHandler
  implements ICommandHandler<UpdateCapaStatusCommand>
{
  private readonly logger = new Logger(UpdateCapaStatusHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdateCapaStatusCommand) {
    const isClosed = command.status === 'DONE' || command.status === 'VERIFIED';

    // CAPA status + outbox TX (close/verify events); no silent empty catch
    const capa = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.capaAction.update({
        where: { id: command.capaId },
        data: {
          status: command.status,
          ...(command.rootCause ? { rootCause: command.rootCause } : {}),
          ...(isClosed ? { completedAt: new Date() } : {}),
        },
      });

      if (command.status === 'DONE') {
        await tx.outboxEvent.create({
          data: {
            tenantId: updated.tenantId,
            aggregateId: updated.id,
            aggregateType: 'CapaAction',
            eventType: 'quality.capa.closed.v1',
            payload: {
              capaId: updated.id,
              ncrId: updated.ncrId,
              status: updated.status,
              closedAt: new Date().toISOString(),
            },
            status: OutboxStatus.PENDING,
          },
        });
      }

      if (command.status === 'VERIFIED') {
        await tx.outboxEvent.create({
          data: {
            tenantId: updated.tenantId,
            aggregateId: updated.id,
            aggregateType: 'CapaAction',
            eventType: 'quality.capa.verified.v1',
            payload: {
              capaId: updated.id,
              ncrId: updated.ncrId,
              verifiedAt: new Date().toISOString(),
            },
            status: OutboxStatus.PENDING,
          },
        });
      }

      return updated;
    });

    this.logger.log(`[CAPA] ${capa.id} → ${capa.status}`);
    return capa;
  }
}
