import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateIotAiHandler } from './iot-ai.handler';

@Module({
  imports: [CqrsModule],
  providers: [CreateIotAiHandler],
})
export class IotAiModule {}
