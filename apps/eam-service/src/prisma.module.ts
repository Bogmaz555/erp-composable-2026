import { Global, Module } from '@nestjs/common';
import { PrismaClient } from '.prisma/client-eam';

@Global()
@Module({
  providers: [
    {
      provide: PrismaClient,
      useValue: new PrismaClient(),
    },
  ],
  exports: [PrismaClient],
})
export class PrismaModule {}
