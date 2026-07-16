import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaClient } from '.prisma/client-eam';

export class GetEquipmentQuery {}

@QueryHandler(GetEquipmentQuery)
export class GetEquipmentHandler implements IQueryHandler<GetEquipmentQuery> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute() {
    return this.prisma.equipment.findMany({
      include: {
        maintenanceTasks: true,
      },
    });
  }
}

export class GetMaintenanceTasksQuery {}

@QueryHandler(GetMaintenanceTasksQuery)
export class GetMaintenanceTasksHandler implements IQueryHandler<GetMaintenanceTasksQuery> {
  constructor(private readonly prisma: PrismaClient) {}

  async execute() {
    return this.prisma.maintenanceTask.findMany({
      include: {
        equipment: true,
      },
    });
  }
}
