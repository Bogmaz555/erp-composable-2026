import { Controller, Get, Post, Body } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateEquipmentCommand, CreateMaintenanceTaskCommand } from './commands/eam.commands';
import { GetEquipmentQuery, GetMaintenanceTasksQuery } from './queries/eam.queries';

@Controller('eam')
export class EamController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('equipment')
  async getEquipment() {
    return this.queryBus.execute(new GetEquipmentQuery());
  }

  @Post('equipment')
  async createEquipment(@Body() dto: { name: string; model?: string; serialNumber?: string; location?: string }) {
    return this.commandBus.execute(
      new CreateEquipmentCommand(dto.name, dto.model, dto.serialNumber, dto.location)
    );
  }

  @Get('maintenance')
  async getMaintenanceTasks() {
    return this.queryBus.execute(new GetMaintenanceTasksQuery());
  }

  @Post('maintenance')
  async createMaintenanceTask(
    @Body() dto: { equipmentId: string; type: 'PREVENTIVE' | 'CORRECTIVE' | 'CALIBRATION'; description: string; scheduledDate: string }
  ) {
    return this.commandBus.execute(
      new CreateMaintenanceTaskCommand(dto.equipmentId, dto.type, dto.description, new Date(dto.scheduledDate))
    );
  }
}
