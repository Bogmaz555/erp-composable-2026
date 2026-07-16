import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ScheduleModule } from '@nestjs/schedule';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PrismaService } from './prisma.service';
import { CreateBOMHandler } from './commands/create-bom.handler';
import { CreateECOHandler } from './commands/create-eco.handler';
import { GetBOMsHandler } from './queries/get-boms.handler';
import { GetECOsHandler } from './queries/get-ecos.handler';
import { PlmBomController, PlmEcoController, PlmBomVersionsController } from './plm.controller';
import { ProductController } from './product.controller';
import { CreateItemHandler } from './commands/create-item.handler';
import { ReleaseBomVersionHandler } from './commands/release-bom-version.handler';
import { AddBomComponentHandler } from './commands/add-bom-component.handler';
import { PlmNatsListener } from './infrastructure/plm-nats.listener';
import { CreateBomVersionHandler } from './commands/create-bom-version.handler';
import { OutboxRelayService } from './outbox-relay.service';
import { GetBomTreeHandler } from './queries/get-bom-tree.handler';
import { HealthController } from './health.controller';
import { DoubleBomService } from './double-bom.service';
import { EcoImpactService } from './eco-impact.service';
import { LinkSubBomHandler } from './commands/link-sub-bom.handler';

const CommandHandlers = [
  CreateBOMHandler, 
  CreateECOHandler,
  CreateItemHandler,
  ReleaseBomVersionHandler,
  AddBomComponentHandler,
  CreateBomVersionHandler,
  LinkSubBomHandler,
];
const QueryHandlers = [GetBOMsHandler, GetECOsHandler, GetBomTreeHandler];

@Module({
  imports: [
    CqrsModule,
    ScheduleModule.forRoot(),
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
    PlmBomController, 
    PlmEcoController,
    ProductController,
    PlmBomVersionsController,
    HealthController,
  ],
  providers: [PrismaService, DoubleBomService, EcoImpactService, ...CommandHandlers, ...QueryHandlers, PlmNatsListener, OutboxRelayService],
})
export class AppModule {}
