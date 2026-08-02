import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxStatus } from '@prisma/client-quality';

export class CreateCapaCommand {
  constructor(
    public readonly ncrId: string,
    public readonly description: string,
    public readonly type: 'CORRECTIVE' | 'PREVENTIVE' = 'CORRECTIVE',
    public readonly meta?: {
      rootCause?: string;
      assignee?: string;
      dueDate?: string;
      tenantId?: string;
    },
  ) {}
}

@CommandHandler(CreateCapaCommand)
export class CreateCapaHandler implements ICommandHandler<CreateCapaCommand> {
  private readonly logger = new Logger(CreateCapaHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateCapaCommand) {
    const tenantId = command.meta?.tenantId || 'default';

    // Enterprise Q2: enforce NCR → CAPA link (NCR must exist)
    const ncr = await this.prisma.nonConformanceReport.findUnique({
      where: { id: command.ncrId },
    });
    if (!ncr) {
      throw new BadRequestException(
        `CAPA requires existing NCR: ncrId=${command.ncrId} not found`,
      );
    }

    // CAPA + outbox TX — no silent empty catch
    const capa = await this.prisma.$transaction(async (tx) => {
      const created = await tx.capaAction.create({
        data: {
          tenantId: ncr.tenantId || tenantId,
          ncrId: command.ncrId,
          type: command.type,
          description: command.description,
          rootCause: command.meta?.rootCause,
          assignee: command.meta?.assignee,
          dueDate: command.meta?.dueDate ? new Date(command.meta.dueDate) : null,
          status: 'OPEN',
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: created.tenantId,
          aggregateId: created.id,
          aggregateType: 'CapaAction',
          eventType: 'quality.capa.created.v1',
          payload: {
            capaId: created.id,
            ncrId: created.ncrId,
            type: created.type,
            assignee: created.assignee,
            dueDate: created.dueDate?.toISOString(),
            status: created.status,
            projectId: ncr.projectId,
            tenantId: created.tenantId,
          },
          status: OutboxStatus.PENDING,
        },
      });

      return created;
    });

    this.logger.log(`[CAPA] created ${capa.id} for ncr=${capa.ncrId}`);
    return capa;
  }
}
