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
  // Reassigned from 4008 → 4018 (4008 reserved for quality-service)
  const port = Number(process.env.PORT) || 4018;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  console.log(`Search Service listening on http://${host}:${port}`);
}
bootstrap();
