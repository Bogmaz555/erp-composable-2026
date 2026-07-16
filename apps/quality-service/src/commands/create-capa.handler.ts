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
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateCapaCommand) {
    const tenantId = command.meta?.tenantId || 'default';

    const capa = await this.prisma.capaAction.create({
      data: {
        tenantId,
        ncrId: command.ncrId,
        type: command.type,
        description: command.description,
        rootCause: command.meta?.rootCause,
        assignee: command.meta?.assignee,
        dueDate: command.meta?.dueDate ? new Date(command.meta.dueDate) : null,
        status: 'OPEN',
      },
    });

    await this.prisma.outboxEvent.create({
      data: {
        tenantId,
        aggregateId: capa.id,
        aggregateType: 'CapaAction',
        eventType: 'quality.capa.created.v1',
        payload: {
          capaId: capa.id,
          ncrId: capa.ncrId,
          type: capa.type,
          assignee: capa.assignee,
          dueDate: capa.dueDate?.toISOString(),
          status: capa.status,
        },
        status: OutboxStatus.PENDING,
      },
    }).catch(() => {});

    return capa;
  }
}
