import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { FinanceController } from './finance.controller';
import { MilestoneIntegrationController } from './milestone-integration.controller';
import { ProcIntegrationController } from './proc-integration.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RecordTransactionHandler } from './commands/record-transaction.handler';
import { PrismaService } from './prisma.service';
import { FixedAssetsController } from './fixed-assets.controller';
import { FixedAssetsService } from './fixed-assets.service';
import { UniversalJournalService } from './universal-journal.service';
import { UniversalJournalController } from './universal-journal.controller';
import { ProjectAccountingService } from './project-accounting.service';

@Module({
  imports: [
    CqrsModule,
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
  controllers: [FinanceController, FixedAssetsController, MilestoneIntegrationController, ProcIntegrationController, UniversalJournalController],
  providers: [RecordTransactionHandler, PrismaService, FixedAssetsService, UniversalJournalService, ProjectAccountingService],
})
export class AppModule {}
