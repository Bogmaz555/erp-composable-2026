import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { EamModule } from './eam.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    EamModule,
    new FastifyAdapter(),
  );

  app.enableCors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: {
      servers: [process.env.NATS_URL || 'nats://localhost:4222'],
      queue: 'eam_queue',
    },
  });

  await app.startAllMicroservices();
  // Keeps 4009 (approvals-service moved to 4019)
  const port = Number(process.env.PORT) || 4009;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  console.log(`EAM Service listening on http://${host}:${port}`);
}
bootstrap();
