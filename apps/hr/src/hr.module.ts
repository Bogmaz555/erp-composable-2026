import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OutboxRelayService } from './outbox-relay.service';
import { ScheduleModule } from '@nestjs/schedule';
import { CqrsModule } from '@nestjs/cqrs';
import { HrController } from './hr.controller';
import { PrismaService } from './prisma.service';
import { RecordTimeEntryHandler } from './commands/record-time-entry.handler';

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
  controllers: [HrController],
  providers: [
    OutboxRelayService,PrismaService, RecordTimeEntryHandler],
})
export class HrModule {}
