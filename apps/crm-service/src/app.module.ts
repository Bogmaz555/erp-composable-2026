import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PrismaService } from './prisma.service';
import { CrmController } from './crm.controller';
import { CrmResourcesController } from './crm-resources.controller';
import { GetOpportunitiesHandler } from './queries/get-opportunities.handler';
import { UpdatePipelineStageHandler } from './commands/update-pipeline-stage.handler';
import { CreateLeadHandler } from './commands/create-lead.handler';
import { OutboxRelayService } from './outbox-relay.service';
import { FinanceIntegrationController } from './finance-integration.controller';
import { ProductSyncController } from './product-sync.controller';

@Module({
  imports: [
    CqrsModule,
    ScheduleModule.forRoot(),
    ClientsModule.register([
      {
        name: 'NATS_SERVICE',
        transport: Transport.NATS,
        options: {
          servers: ['nats://localhost:4222'],
        },
      },
    ]),
  ],
  controllers: [CrmController, CrmResourcesController, FinanceIntegrationController, ProductSyncController],
  providers: [
    PrismaService,
    GetOpportunitiesHandler,
    UpdatePipelineStageHandler,
    CreateLeadHandler,
    OutboxRelayService
  ],
})
export class AppModule {}
