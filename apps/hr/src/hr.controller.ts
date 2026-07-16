import { Controller, Get, Post, Body } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { RecordTimeEntryCommand } from './commands/record-time-entry.command';
import { PrismaService } from './prisma.service';

@Controller('hr')
export class HrController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly prisma: PrismaService,
  ) {}

  @Get('health')
  health() {
    return { status: 'HR Service running' };
  }

  @Get('employees')
  async listEmployees() {
    return this.prisma.employee.findMany({ where: { isActive: true }, take: 50 });
  }

  @Post('time-entries')
  async recordTime(
    @Body()
    body: {
      employeeId: string;
      projectId: string;
      hours: number;
      workOrderId?: string;
      tenantId?: string;
    },
  ) {
    return this.commandBus.execute(
      new RecordTimeEntryCommand(
        body.employeeId,
        body.projectId,
        body.hours,
        body.workOrderId,
        body.tenantId,
      ),
    );
  }
}
