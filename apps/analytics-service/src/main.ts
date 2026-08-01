import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.enableCors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: {
      servers: [process.env.NATS_URL || 'nats://localhost:4222'],
    },
  });

  await app.startAllMicroservices();
  const port = Number(process.env.PORT) || 4011;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  console.log(`[Analytics Service] Running on http://${host}:${port} (Fastify)`);
}
bootstrap();
