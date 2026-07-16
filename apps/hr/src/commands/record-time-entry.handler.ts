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
    const entry = await this.prisma.timeEntry.create({
      data: {
        tenantId,
        employeeId: command.employeeId,
        projectId: command.projectId,
        workOrderId: command.workOrderId,
        hours: command.hours,
      },
    });

    await this.prisma.outboxEvent.create({
      data: {
        tenantId,
        aggregateId: entry.id,
        aggregateType: 'TimeEntry',
        eventType: 'hr.time.entry.recorded.v1',
        payload: {
          timeEntryId: entry.id,
          employeeId: employee.id,
          projectId: command.projectId,
          workOrderId: command.workOrderId,
          hours: command.hours,
          hourlyRatePln: employee.hourlyRate,
          tenantId,
          recordedAt: new Date().toISOString(),
        },
        status: 'PENDING',
      },
    });

    return { success: true, timeEntryId: entry.id };
  }
}
