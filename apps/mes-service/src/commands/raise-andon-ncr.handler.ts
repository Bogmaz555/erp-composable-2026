import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';
import { OutboxStatus } from '@prisma/client-mes';

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
      // 1. Zlokalizuj operację
      const operation = await this.prisma.operation.findUnique({
        where: { id: command.operationId },
        include: { workOrder: true },
      });

      if (!operation) {
        throw new Error(`Operation ${command.operationId} not found`);
      }

      // 2. Pauza operacji (zegar kosztowy)
      await this.prisma.operation.update({
        where: { id: operation.id },
        data: {
          status: 'ON_HOLD',
        },
      });

      // 3. Emisja zdarzenia mes.ncr.raised.v1 dla quality-service
      await this.prisma.outboxEvent.create({
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
    } catch (error: any) {
      return { ok: false, error: error.message, stack: error.stack };
    }
  }
}
