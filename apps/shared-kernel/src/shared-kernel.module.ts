import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateSharedKernelHandler } from './shared-kernel.handler';

@Module({
  imports: [CqrsModule],
  providers: [CreateSharedKernelHandler],
})
export class SharedKernelModule {}
