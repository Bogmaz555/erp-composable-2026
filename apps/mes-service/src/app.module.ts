import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaService } from './prisma.service';
import { WorkOrdersController } from './controllers/work-orders.controller';
import { OperationsController } from './controllers/operations.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { StartProductionHandler } from './commands/start-production.handler';
import { FinishProductionHandler } from './commands/finish-production.handler';
import { GetWorkOrdersHandler } from './queries/get-work-orders.handler';
import { CreateWorkOrderHandler } from './commands/create-work-order.handler';
import { PmIntegrationController } from './pm-integration.controller';
import { EamIntegrationController } from './eam-integration.controller';
import { RecordProductionHandler } from './commands/record-production.handler';
import { ConsumeMaterialHandler } from './commands/consume-material.handler';
import { StartOperationHandler } from './commands/start-operation.handler';
import { CompleteOperationHandler } from './commands/complete-operation.handler';
import { HealthController } from './health.controller';
import { SagaCompensationController } from './saga-compensation.controller';
import { RoutingController } from './routing.controller';
import { RoutingAggregateService } from './routing-aggregate.service';
import { MesAndonController } from './controllers/mes-andon.controller';
import { PassportIntegrationController } from './controllers/passport-integration.controller';
import { RaiseAndonNcrHandler } from './commands/raise-andon-ncr.handler';

import { MesOutboxRelayService } from './outbox-relay.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    CqrsModule,
    ScheduleModule.forRoot(),
    ClientsModule.register([
      {
        name: 'NATS_SERVICE',
        transport: Transport.NATS,
        options: {
          servers: [process.env.NATS_URL || 'nats://localhost:4222'],
        },
      },
    ]),
  ],
  controllers: [WorkOrdersController, OperationsController, PmIntegrationController, EamIntegrationController, HealthController, SagaCompensationController, RoutingController, MesAndonController, PassportIntegrationController],
  providers: [
    PrismaService,
    RoutingAggregateService,
    StartProductionHandler,
    FinishProductionHandler,
    GetWorkOrdersHandler,
    CreateWorkOrderHandler,
    // Faza 1 Traceability
    RecordProductionHandler,
    ConsumeMaterialHandler,
    StartOperationHandler,
    CompleteOperationHandler,
    RaiseAndonNcrHandler,
    MesOutboxRelayService,
  ],
})
export class AppModule {}
