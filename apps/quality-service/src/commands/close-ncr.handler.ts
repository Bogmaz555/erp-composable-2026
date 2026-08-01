import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxStatus } from '@prisma/client-quality';

export class CloseNcrCommand {
  constructor(
    public readonly ncrId: string,
    public readonly disposition: string,
    public readonly closedBy?: string,
  ) {}
}

@CommandHandler(CloseNcrCommand)
export class CloseNcrHandler implements ICommandHandler<CloseNcrCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CloseNcrCommand) {
    // Domain write + outbox in one TX (never close NCR without event row)
    return this.prisma.$transaction(async (tx) => {
      const ncr = await tx.nonConformanceReport.update({
        where: { id: command.ncrId },
        data: {
          status: 'CLOSED',
          disposition: command.disposition,
          closedAt: new Date(),
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: ncr.tenantId,
          aggregateId: ncr.id,
          aggregateType: 'NonConformanceReport',
          eventType: 'quality.ncr.closed.v1',
          payload: {
            ncrId: ncr.id,
            disposition: command.disposition,
            closedBy: command.closedBy || 'quality-inspector',
            closedAt: new Date().toISOString(),
            projectId: ncr.projectId,
          },
          status: OutboxStatus.PENDING,
        },
      });

      return ncr;
    });
  }
}
