import { Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(CloseNcrHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CloseNcrCommand) {
    // NCR close + outbox TX — no silent empty catch
    const ncr = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.nonConformanceReport.update({
        where: { id: command.ncrId },
        data: {
          status: 'CLOSED',
          disposition: command.disposition,
          closedAt: new Date(),
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: updated.tenantId,
          aggregateId: updated.id,
          aggregateType: 'NonConformanceReport',
          eventType: 'quality.ncr.closed.v1',
          payload: {
            ncrId: updated.id,
            disposition: command.disposition,
            closedBy: command.closedBy || 'quality-inspector',
            closedAt: new Date().toISOString(),
            projectId: updated.projectId,
          },
          status: OutboxStatus.PENDING,
        },
      });

      return updated;
    });

    this.logger.log(`[NCR] closed ${ncr.id} disposition=${command.disposition}`);
    return ncr;
  }
}
