import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { FinanceController } from './finance.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RecordTransactionHandler } from './commands/record-transaction.handler';
import { PrismaService } from './prisma.service';

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
  controllers: [FinanceController],
  providers: [RecordTransactionHandler, PrismaService],
})
export class AppModule {}
