import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxStatus } from '@prisma/client-quality';

export class CreateNcrCommand {
  constructor(
    public readonly defectDescription: string,
    public readonly severity: string,
    public readonly meta?: {
      inspectionId?: string;
      defectCode?: string;
      attachmentIds?: string[];
      projectId?: string;
      workOrderId?: string;
      bomComponentId?: string;
      tenantId?: string;
    },
  ) {}
}

@CommandHandler(CreateNcrCommand)
export class CreateNcrHandler implements ICommandHandler<CreateNcrCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateNcrCommand) {
    let ref = '';
    if (command.meta?.inspectionId) {
      const inspection = await this.prisma.inspection.findUnique({
        where: { id: command.meta.inspectionId },
      }).catch(() => null);
      ref = inspection?.referenceId || '';
    }

    const workOrderId =
      command.meta?.workOrderId ||
      (ref.startsWith('WO-') ? ref : undefined);
    const projectId = command.meta?.projectId;
    const tenantId = command.meta?.tenantId || 'default';

    const ncr = await this.prisma.nonConformanceReport.create({
      data: {
        tenantId,
        inspectionId: command.meta?.inspectionId,
        defectCode: command.meta?.defectCode,
        defectDescription: command.defectDescription,
        attachmentIds: command.meta?.attachmentIds || [],
        severity: command.severity,
        status: 'OPEN',
        projectId,
        workOrderId,
        bomComponentId: command.meta?.bomComponentId,
      },
    });

    await this.prisma.outboxEvent.create({
      data: {
        tenantId,
        aggregateId: ncr.id,
        aggregateType: 'NonConformanceReport',
        eventType: 'quality.ncr.raised.v1',
        payload: {
          ncrId: ncr.id,
          inspectionId: ncr.inspectionId,
          defectCode: ncr.defectCode,
          defectDescription: ncr.defectDescription,
          attachmentIds: ncr.attachmentIds,
          severity: ncr.severity,
          status: ncr.status,
          projectId: ncr.projectId,
          workOrderId: ncr.workOrderId,
          bomComponentId: ncr.bomComponentId,
          tenantId,
          raisedAt: ncr.createdAt.toISOString(),
        },
        status: OutboxStatus.PENDING,
      },
    }).catch(() => {});

    return ncr;
  }
}
