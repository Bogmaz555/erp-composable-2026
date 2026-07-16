import { Controller, Get, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GetWorkOrdersQuery } from '../queries/get-work-orders.query';
import { StartProductionCommand } from '../commands/start-production.command';
import { FinishProductionCommand } from '../commands/finish-production.command';
import { RecordProductionCommand } from '../commands/record-production.command';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

// TD-001: Protected with JWT guard + Roles example (real RBAC on production actions)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('work-orders')
export class WorkOrdersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  async getWorkOrders() {
    return this.queryBus.execute(new GetWorkOrdersQuery());
  }

  @Patch(':id/start')
  @Roles('PRODUCTION_MANAGER', 'SUPERVISOR')
  async startProduction(@Param('id') id: string, @Req() req: any) {
    const operatorId = req.user?.id || 'unknown';
    // Real usage of authenticated user from TD-001 (logged for audit)
    console.log(`[TD-001] User ${operatorId} starting production on WO ${id}`);
    return this.commandBus.execute(new StartProductionCommand(id));
  }

  @Patch(':id/finish')
  @Roles('PRODUCTION_MANAGER', 'SUPERVISOR')
  async finishProduction(
    @Param('id') id: string,
    @Body()
    body: { quantityGood?: number; quantityScrap?: number; laborHours?: number } = {},
    @Req() req: any,
  ) {
    const operatorId = req.user?.id || 'unknown';
    console.log(`[TD-001] User ${operatorId} finishing production on WO ${id}`);
    await this.commandBus.execute(new FinishProductionCommand(id));
    const quantityGood = body.quantityGood ?? 1;
    const laborHours = body.laborHours ?? 0;
    return this.commandBus.execute(
      new RecordProductionCommand(
        id,
        quantityGood,
        body.quantityScrap ?? 0,
        operatorId,
        laborHours,
      ),
    );
  }
}
