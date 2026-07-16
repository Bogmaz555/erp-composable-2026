import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { HrController } from './hr.controller';
import { PrismaService } from './prisma.service';
import { RecordTimeEntryHandler } from './commands/record-time-entry.handler';

@Module({
  imports: [CqrsModule],
  controllers: [HrController],
  providers: [PrismaService, RecordTimeEntryHandler],
})
export class HrModule {}
