import { Module } from '@nestjs/common';
import { OutboxRelayService } from './outbox-relay.service';
import { ScheduleModule } from '@nestjs/schedule';
import { CqrsModule } from '@nestjs/cqrs';
import { FinanceController } from './finance.controller';
import { MilestoneIntegrationController } from './milestone-integration.controller';
import { ProcIntegrationController } from './proc-integration.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RecordTransactionHandler } from './commands/record-transaction.handler';
import { ReverseWipCostHandler } from './commands/reverse-wip-cost.handler';
import { ReverseRevenueHandler } from './commands/reverse-revenue.handler';
import { ReleaseCommitmentHandler } from './commands/release-commitment.handler';
import { ReverseMaterialReservationHandler } from './commands/reverse-material-reservation.handler';
import { PrismaService } from './prisma.service';
import { FixedAssetsController } from './fixed-assets.controller';
import { FixedAssetsService } from './fixed-assets.service';
import { UniversalJournalService } from './universal-journal.service';
import { UniversalJournalController } from './universal-journal.controller';
import { ProjectAccountingService } from './project-accounting.service';
import { FinWipJetStreamConsumer } from './jetstream-fin-wip.consumer';
import { PeriodCloseService } from './period-close.service';
import { PeriodCloseController } from './period-close.controller';
import { ArApService } from './ar-ap.service';
import { ArApController } from './ar-ap.controller';
import { CompensationMatrixService } from './compensation-matrix.service';
import { CompensationController } from './compensation.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CqrsModule,
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
    FinanceController,
    FixedAssetsController,
    MilestoneIntegrationController,
    ProcIntegrationController,
    UniversalJournalController,
    PeriodCloseController,
    ArApController,
    CompensationController,
  ],
  providers: [
    OutboxRelayService,
    RecordTransactionHandler,
    ReverseWipCostHandler,
    ReverseRevenueHandler,
    ReleaseCommitmentHandler,
    ReverseMaterialReservationHandler,
    PrismaService,
    FixedAssetsService,
    UniversalJournalService,
    ProjectAccountingService,
    PeriodCloseService,
    ArApService,
    CompensationMatrixService,
    // Controllers also as providers so FinWipJetStreamConsumer can inject them
    FinanceController,
    UniversalJournalController,
    FinWipJetStreamConsumer,
  ],
})
export class AppModule {}
