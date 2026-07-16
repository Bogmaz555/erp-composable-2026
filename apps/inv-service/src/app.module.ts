import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PrismaService } from './prisma.service';
import { InventoryController } from './inv.controller';
import { PmIntegrationController } from './pm-integration.controller';
import { CreateItemHandler } from './commands/create-item.handler';
import { AdjustStockHandler } from './commands/adjust-stock.handler';
import { GetInventoryHandler } from './queries/get-inventory.handler';
import { ReserveMaterialHandler } from './commands/reserve-material.handler';
import { CreateReservationHandler } from './commands/create-reservation.handler';
import { GetAvailableStockHandler } from './queries/get-available-stock.handler';
import { PlmBomReleasedListener } from './infrastructure/plm-bom-released.listener';
import { ProcIntegrationController } from './proc-integration.controller';
import { ProductSyncController } from './product-sync.controller';
import { GenealogyController } from './genealogy.controller';
import { GetGenealogyForwardHandler } from './queries/get-genealogy-forward.handler';
import { GetGenealogyBackwardHandler } from './queries/get-genealogy-backward.handler';
import { GetGenealogyChainHandler } from './queries/get-genealogy-chain.handler';
import { OutboxDlqController } from './outbox-dlq.controller';
import { InvOutboxRelayService } from './outbox-relay.service';
import { HealthController } from './health.controller';
import { WmsController } from './wms.controller';
import { SagaCompensationController } from './saga-compensation.controller';
import { QualityIntegrationController } from './quality-integration.controller';

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
  controllers: [
    InventoryController,
    PmIntegrationController,
    GenealogyController,
    OutboxDlqController,
    ProcIntegrationController,
    ProductSyncController,
    HealthController,
    WmsController,
    SagaCompensationController,
    QualityIntegrationController,
  ],
  providers: [
    PrismaService,
    CreateItemHandler,
    AdjustStockHandler,
    GetInventoryHandler,
    CreateReservationHandler,
    ReserveMaterialHandler,
    GetAvailableStockHandler,
    GetGenealogyForwardHandler,
    GetGenealogyBackwardHandler,
    GetGenealogyChainHandler,
    PlmBomReleasedListener,
    InvOutboxRelayService,
  ],
})
export class AppModule {}
