import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';

export class RaiseAndonNcrCommand {
  constructor(
    public readonly operationId: string,
    public readonly defectCode: string,
    public readonly description: string,
    public readonly attachmentIds: string[] = [],
    public readonly reportedBy?: string,
  ) {}
}

@CommandHandler(RaiseAndonNcrCommand)
export class RaiseAndonNcrHandler implements ICommandHandler<RaiseAndonNcrCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: RaiseAndonNcrCommand) {
    try {
      // Domain write (ON_HOLD) + outbox in one TX — never pause op without NCR event row
      return await this.prisma.$transaction(async (tx) => {
        const operation = await tx.operation.findUnique({
          where: { id: command.operationId },
          include: { workOrder: true },
        });

        if (!operation) {
          throw new Error(`Operation ${command.operationId} not found`);
        }

        await tx.operation.update({
          where: { id: operation.id },
          data: {
            status: 'ON_HOLD',
          },
        });

        await tx.outboxEvent.create({
          data: {
            tenantId: operation.tenantId,
            aggregateId: operation.workOrderId,
            aggregateType: 'WorkOrder',
            eventType: 'mes.ncr.raised.v1',
            payload: {
              workOrderId: operation.workOrderId,
              operationId: operation.id,
              defectCode: command.defectCode,
              defectDescription: command.description,
              attachmentIds: command.attachmentIds,
              projectId: operation.workOrder.projectId,
              reportedBy: command.reportedBy,
              raisedAt: new Date().toISOString(),
            },
            status: 'PENDING',
          },
        });

        return { ok: true, operationId: operation.id, status: 'ON_HOLD' };
      });
    } catch (error: any) {
      return { ok: false, error: error.message, stack: error.stack };
    }
  }
}
