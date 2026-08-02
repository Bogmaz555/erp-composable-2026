import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { DmsController } from './dms.controller';

@Module({ controllers: [DmsController] })
class DmsModule {}

async function bootstrap() {
  const app = await NestFactory.create(DmsModule);
  const port = Number(process.env.DMS_PORT || 4013);
  await app.listen(port, process.env.HOST || '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[DMS] listening on ${port}`);
}
bootstrap();
