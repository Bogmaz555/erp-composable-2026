import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

// JetStream binary/non-JSON traffic can throw NatsError BAD_JSON through Nest's JSON
// deserializer and take down the process. Keep HTTP up; log and continue (pilot).
function isNatsBadJson(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  return e?.code === 'BAD_JSON' || /Bad JSON/i.test(String(e?.message || err));
}
process.on('uncaughtException', (err) => {
  if (isNatsBadJson(err)) {
    console.warn('[Analytics] Ignoring NATS Bad JSON (JetStream/core mix):', (err as Error).message);
    return;
  }
  console.error(err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  if (isNatsBadJson(reason)) {
    console.warn('[Analytics] Ignoring NATS Bad JSON rejection:', reason);
    return;
  }
  console.error('unhandledRejection', reason);
});

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.enableCors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' });

  if (process.env.ANALYTICS_NATS_DISABLE !== 'true') {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.NATS,
      options: {
        servers: [process.env.NATS_URL || 'nats://localhost:4222'],
      },
    });
    await app.startAllMicroservices();
  }

  const port = Number(process.env.PORT) || 4011;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  console.log(`[Analytics Service] Running on http://${host}:${port} (Fastify)`);
}
bootstrap();
