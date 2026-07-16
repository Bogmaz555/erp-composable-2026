import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaClient } from '.prisma/client-eam';

export class CreateEquipmentCommand {
  constructor(
    public readonly name: string,
    public readonly model?: string,
    public readonly serialNumber?: string,
    public readonly location?: string,
  ) {}
}

@CommandHandler(CreateEquipmentCommand)
export class CreateEquipmentHandler implements ICommandHandler<CreateEquipmentCommand> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: CreateEquipmentCommand) {
    const equipment = await this.prisma.equipment.create({
      data: {
        name: command.name,
        model: command.model,
        serialNumber: command.serialNumber,
        location: command.location,
      },
    });
    return equipment;
  }
}

export class CreateMaintenanceTaskCommand {
  constructor(
    public readonly equipmentId: string,
    public readonly type: 'PREVENTIVE' | 'CORRECTIVE' | 'CALIBRATION',
    public readonly description: string,
    public readonly scheduledDate: Date,
  ) {}
}

@CommandHandler(CreateMaintenanceTaskCommand)
export class CreateMaintenanceTaskHandler implements ICommandHandler<CreateMaintenanceTaskCommand> {
  constructor(
    private readonly prisma: PrismaClient,
    @Inject('NATS_CLIENT') private readonly nats: ClientProxy,
  ) {}

  async execute(command: CreateMaintenanceTaskCommand) {
    const task = await this.prisma.maintenanceTask.create({
      data: {
        equipmentId: command.equipmentId,
        type: command.type,
        description: command.description,
        scheduledDate: command.scheduledDate,
      },
    });

    this.nats.emit('eam.maintenance.scheduled.v1', {
      taskId: task.id,
      equipmentId: task.equipmentId,
      type: task.type,
      scheduledDate: task.scheduledDate.toISOString(),
      description: task.description,
    });

    return task;
  }
}
