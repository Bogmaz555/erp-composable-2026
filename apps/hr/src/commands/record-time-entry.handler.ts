import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RecordTimeEntryCommand } from './record-time-entry.command';
import { PrismaService } from '../prisma.service';

@CommandHandler(RecordTimeEntryCommand)
export class RecordTimeEntryHandler implements ICommandHandler<RecordTimeEntryCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: RecordTimeEntryCommand) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: command.employeeId },
    });
    if (!employee) throw new Error('Employee not found');

    const tenantId = command.tenantId || 'default';
    const hourlyRatePln =
      typeof employee.hourlyRate === 'object' && employee.hourlyRate != null
        ? Number(employee.hourlyRate)
        : Number(employee.hourlyRate);

    // Domain write + outbox in one TX (never book time without labor event row)
    const entry = await this.prisma.$transaction(async (tx) => {
      const timeEntry = await tx.timeEntry.create({
        data: {
          tenantId,
          employeeId: command.employeeId,
          projectId: command.projectId,
          workOrderId: command.workOrderId,
          hours: command.hours,
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId,
          aggregateId: timeEntry.id,
          aggregateType: 'TimeEntry',
          eventType: 'hr.time.entry.recorded.v1',
          payload: {
            timeEntryId: timeEntry.id,
            employeeId: employee.id,
            projectId: command.projectId,
            workOrderId: command.workOrderId,
            hours: command.hours,
            hourlyRatePln,
            tenantId,
            recordedAt: new Date().toISOString(),
          },
          status: 'PENDING',
        },
      });

      return timeEntry;
    });

    return { success: true, timeEntryId: entry.id };
  }
}
