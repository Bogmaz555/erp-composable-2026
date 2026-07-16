import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TenantMiddleware } from './tenant.middleware';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PrismaService } from './prisma.service';
import { ProcurementController } from './proc.controller';
import { SuppliersController } from './suppliers.controller';
import { InvIntegrationController } from './inv-integration.controller';
import { ApprovePurchaseOrderHandler } from './commands/approve-purchase-order.handler';
import { CreatePurchaseOrderHandler } from './commands/create-purchase-order.handler';
import { ReceiveMaterialHandler } from './commands/receive-material.handler';
import { UpdatePurchaseOrderEtaHandler } from './commands/update-po-eta.handler';
import { PlmMrpController } from './plm-mrp.controller';
import { ProcOutboxRelayService } from './outbox-relay.service';
import { HealthController } from './health.controller';
import { MrpController } from './mrp.controller';
import { MrpNettingService } from './mrp-netting.service';
import { MrpAggregateService } from './mrp-aggregate.service';
import { LongLeadRadarService } from './long-lead-radar.service';
import { LongLeadRadarController } from './long-lead-radar.controller';
import { OutboxDlqController } from './outbox-dlq.controller';

@Module({
  imports: [
    CqrsModule,
    ScheduleModule.forRoot(),
    ClientsModule.register([
      {
        name: 'NATS_CLIENT',
        transport: Transport.NATS,
        options: {
          servers: [process.env.NATS_URL || 'nats://localhost:4222'],
        },
      },
    ]),
  ],
  controllers: [ProcurementController, SuppliersController, InvIntegrationController, PlmMrpController, LongLeadRadarController, MrpController, HealthController, OutboxDlqController],
  providers: [
    PrismaService,
    MrpNettingService,
    MrpAggregateService,
    LongLeadRadarService,
    ApprovePurchaseOrderHandler,
    CreatePurchaseOrderHandler,
    ReceiveMaterialHandler,
    UpdatePurchaseOrderEtaHandler,
    ProcOutboxRelayService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
