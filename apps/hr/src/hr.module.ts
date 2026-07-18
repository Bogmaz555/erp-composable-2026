import { Module } from '@nestjs/common';
import { OutboxRelayService } from './outbox-relay.service';
import { ScheduleModule } from '@nestjs/schedule';
import { CqrsModule } from '@nestjs/cqrs';
import { HrController } from './hr.controller';
import { PrismaService } from './prisma.service';
import { RecordTimeEntryHandler } from './commands/record-time-entry.handler';

@Module({
  imports: [
    ScheduleModule.forRoot(),CqrsModule],
  controllers: [HrController],
  providers: [
    OutboxRelayService,PrismaService, RecordTimeEntryHandler],
})
export class HrModule {}
