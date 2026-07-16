import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { PrismaService } from '../prisma.service';
import { StartOperationCommand } from '../commands/start-operation.command';
import { CompleteOperationCommand } from '../commands/complete-operation.command';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller()
export class OperationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
  ) {}

  @Get('work-orders/:workOrderId/operations')
  async listForWorkOrder(@Param('workOrderId') workOrderId: string) {
    return this.prisma.operation.findMany({
      where: { workOrderId },
      orderBy: { sequence: 'asc' },
    });
  }

  @Patch('operations/:id/start')
  async start(@Param('id') id: string) {
    return this.commandBus.execute(new StartOperationCommand(id));
  }

  @Patch('operations/:id/complete')
  async complete(@Param('id') id: string) {
    return this.commandBus.execute(new CompleteOperationCommand(id));
  }

  @Get('oee/summary')
  async oeeSummary() {
    const ops = await this.prisma.operation.findMany({
      where: { status: { in: ['COMPLETED', 'IN_PROGRESS'] } },
    });
    const completed = ops.filter((o) => o.status === 'COMPLETED');
    const totalStd = completed.reduce((s, o) => s + (o.standardTimeMinutes ?? 0), 0);
    const totalActual = completed.reduce((s, o) => {
      if (!o.startedAt || !o.completedAt) return s;
      return s + (o.completedAt.getTime() - o.startedAt.getTime()) / 60000;
    }, 0);
    const availability = ops.length ? completed.length / ops.length : 0;
    const performance = totalActual > 0 ? Math.min(totalStd / totalActual, 1.5) : (totalStd > 0 ? 1 : 0);
    const oee = availability * performance * 0.95;
    return {
      availability: Math.round(availability * 100),
      performance: Math.round(performance * 100),
      quality: 95,
      oee: Math.round(oee * 100),
      completedOps: completed.length,
      totalOps: ops.length,
    };
  }
}
