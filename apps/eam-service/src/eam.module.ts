import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PrismaModule } from './prisma.module';
import { EamController } from './eam.controller';
import { EamEventsController } from './eam-events.controller';
import { EamIotController } from './eam-iot.controller';
import { CreateEquipmentHandler, CreateMaintenanceTaskHandler } from './commands/eam.commands';
import { GetEquipmentHandler, GetMaintenanceTasksHandler } from './queries/eam.queries';
import { HealthController } from './health.controller';
import { MaintenanceAggregateController } from './maintenance-aggregate.controller';
import { MaintenanceAggregateService } from './maintenance-aggregate.service';
import { EamProductionController } from './eam-production.controller';
import { EamProductionService } from './eam-production.service';

@Module({
  imports: [
    CqrsModule,
    PrismaModule,
    ClientsModule.register([
      {
        name: 'NATS_CLIENT',
        transport: Transport.NATS,
        options: { servers: [process.env.NATS_URL || 'nats://localhost:4222'] },
      },
    ]),
  ],
  controllers: [EamController, EamEventsController, EamIotController, HealthController, MaintenanceAggregateController, EamProductionController],
  providers: [
    MaintenanceAggregateService,
    EamProductionService,
    CreateEquipmentHandler,
    CreateMaintenanceTaskHandler,
    GetEquipmentHandler,
    GetMaintenanceTasksHandler,
  ],
})
export class EamModule {}
