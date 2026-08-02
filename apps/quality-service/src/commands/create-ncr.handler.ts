import { Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(CreateNcrHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateNcrCommand) {
    let ref = '';
    if (command.meta?.inspectionId) {
      const inspection = await this.prisma.inspection
        .findUnique({
          where: { id: command.meta.inspectionId },
        })
        .catch(() => null);
      ref = inspection?.referenceId || '';
    }

    const workOrderId =
      command.meta?.workOrderId || (ref.startsWith('WO-') ? ref : undefined);
    const projectId = command.meta?.projectId;
    const tenantId = command.meta?.tenantId || 'default';

    // Enterprise Q2: NCR + outbox in single TX — no silent empty catch
    const ncr = await this.prisma.$transaction(async (tx) => {
      const created = await tx.nonConformanceReport.create({
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

      await tx.outboxEvent.create({
        data: {
          tenantId,
          aggregateId: created.id,
          aggregateType: 'NonConformanceReport',
          eventType: 'quality.ncr.raised.v1',
          payload: {
            ncrId: created.id,
            inspectionId: created.inspectionId,
            defectCode: created.defectCode,
            defectDescription: created.defectDescription,
            attachmentIds: created.attachmentIds,
            severity: created.severity,
            status: created.status,
            projectId: created.projectId,
            workOrderId: created.workOrderId,
            bomComponentId: created.bomComponentId,
            tenantId,
            raisedAt: created.createdAt.toISOString(),
          },
          status: OutboxStatus.PENDING,
        },
      });

      return created;
    });

    this.logger.log(`[NCR] raised ${ncr.id} severity=${ncr.severity}`);
    return ncr;
  }
}
