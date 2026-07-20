import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { SearchServiceModule } from './search-service.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    SearchServiceModule,
    new FastifyAdapter(),
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: {
      servers: [process.env.NATS_URL || 'nats://localhost:4222'],
      queue: 'search_service_queue',
    },
  });

  await app.startAllMicroservices();
  await app.listen(4008, '127.0.0.1');
  console.log('Search Service listening on port 4008');
}
bootstrap();
