import { CommandHandler, ICommandHandler, CommandBus } from '@nestjs/cqrs';
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

    const updated = await this.prisma.inspection.update({
      where: { id: command.inspectionId },
      data: {
        status: command.result,
        notes: command.notes,
      },
    });

    const eventType = command.result === 'PASSED' 
      ? 'quality.inspection.passed.v1' 
      : 'quality.inspection.failed.v1';

    await this.prisma.outboxEvent.create({
      data: {
        tenantId: 'default',
        aggregateId: updated.id,
        aggregateType: 'Inspection',
        eventType,
        payload: {
          inspectionId: updated.id,
          referenceId: updated.referenceId, // This is the PO / WO number
          type: updated.type,
          result: command.result,
          notes: command.notes,
          evaluatedBy: command.evaluatedBy || 'QualityInspector',
          tenantId: 'default',
        },
        status: OutboxStatus.PENDING,
      },
    }).catch(() => {});

    // Automatyczny draft NCR w przypadku FAILED
    if (command.result === 'FAILED') {
      try {
        await this.commandBus.execute(
          new CreateNcrCommand(
            command.notes || `Automatycznie zgłoszona niezgodność z inspekcji wejściowej ${updated.referenceId}`,
            'HIGH', // Default severity dla FAILED
            {
              inspectionId: updated.id,
            }
          )
        );
      } catch (err) {
        // Ignorujemy błędy, żeby nie wycofać transakcji aktualizacji inspekcji
      }
    }

    return updated;
  }
}
