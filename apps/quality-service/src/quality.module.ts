import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PrismaModule } from './prisma/prisma.module';
import { QualityController } from './quality.controller';
import { CreateInspectionHandler } from './commands/create-inspection.handler';
import { CreateNcrHandler } from './commands/create-ncr.handler';
import { CloseNcrHandler } from './commands/close-ncr.handler';
import { CreateCapaHandler } from './commands/create-capa.handler';
import { UpdateCapaStatusHandler } from './commands/update-capa-status.handler';
import { UpdateInspectionResultHandler } from './commands/update-inspection-result.handler';
import { GetInspectionsHandler } from './queries/get-inspections.handler';
import { GetNcrsHandler } from './queries/get-ncrs.handler';
import { GetCapaHandler } from './queries/get-capa.handler';
import { QualityOutboxRelayService } from './outbox-relay.service';
import { HealthController } from './health.controller';
import { ControlPlansController } from './control-plans.controller';
import { SpcController } from './spc.controller';
import { IsoController } from './iso.controller';
import { OutboxDlqController } from './outbox-dlq.controller';
import { CapaAggregateController } from './capa-aggregate.controller';
import { CapaAggregateService } from './capa-aggregate.service';
import { NcrCapaProductionController } from './ncr-capa-production.controller';
import { NcrCapaProductionService } from './ncr-capa-production.service';
import { DigitalPassportController } from './digital-passport.controller';

@Module({
  imports: [
    CqrsModule,
    ScheduleModule.forRoot(),
    PrismaModule,
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
  controllers: [QualityController, ControlPlansController, SpcController, IsoController, HealthController, OutboxDlqController, CapaAggregateController, NcrCapaProductionController, DigitalPassportController],
  providers: [
    CapaAggregateService,
    NcrCapaProductionService,
    CreateInspectionHandler,
    CreateNcrHandler,
    CloseNcrHandler,
    CreateCapaHandler,
    UpdateCapaStatusHandler,
    UpdateInspectionResultHandler,
    GetInspectionsHandler,
    GetNcrsHandler,
    GetCapaHandler,
    QualityOutboxRelayService,
  ],
})
export class QualityModule {}
