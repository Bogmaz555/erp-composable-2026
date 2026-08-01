import { CommandHandler, ICommandHandler, CommandBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxStatus } from '@prisma/client-quality';
import { CreateNcrCommand } from './create-ncr.handler';

export class UpdateInspectionResultCommand {
  constructor(
    public readonly inspectionId: string,
    public readonly result: 'PASSED' | 'FAILED',
    public readonly notes?: string,
    public readonly evaluatedBy?: string,
  ) {}
}

@CommandHandler(UpdateInspectionResultCommand)
export class UpdateInspectionResultHandler implements ICommandHandler<UpdateInspectionResultCommand> {
  private readonly logger = new Logger(UpdateInspectionResultHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: UpdateInspectionResultCommand) {
    const inspection = await this.prisma.inspection.findUnique({
      where: { id: command.inspectionId },
    });

    if (!inspection) {
      throw new Error(`Inspekcja o ID ${command.inspectionId} nie istnieje`);
    }

    const eventType = command.result === 'PASSED'
      ? 'quality.inspection.passed.v1'
      : 'quality.inspection.failed.v1';

    // Domain write + outbox in one TX (never mark result without event row)
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.inspection.update({
        where: { id: command.inspectionId },
        data: {
          status: command.result,
          notes: command.notes,
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: 'default',
          aggregateId: row.id,
          aggregateType: 'Inspection',
          eventType,
          payload: {
            inspectionId: row.id,
            referenceId: row.referenceId,
            type: row.type,
            result: command.result,
            notes: command.notes,
            evaluatedBy: command.evaluatedBy || 'QualityInspector',
            tenantId: 'default',
          },
          status: OutboxStatus.PENDING,
        },
      });

      return row;
    });

    // Auto draft NCR on FAILED — separate handler (own TX); after inspection commit
    if (command.result === 'FAILED') {
      try {
        await this.commandBus.execute(
          new CreateNcrCommand(
            command.notes || `Automatycznie zgłoszona niezgodność z inspekcji wejściowej ${updated.referenceId}`,
            'HIGH',
            {
              inspectionId: updated.id,
            },
          ),
        );
      } catch (err) {
        this.logger.warn(
          `Auto-NCR after FAILED inspection ${updated.id} failed: ${(err as Error).message}`,
        );
      }
    }

    return updated;
  }
}
