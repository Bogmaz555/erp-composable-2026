import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '.prisma/client-inv';

// HARDWIRE KRYTYCZNE ZABEZPIECZENIE: Fail-safe na poziomie procesu
const INVENTORY_URL = "postgresql://erp_user:erp_password@localhost:5436/inv_db?schema=public";

if (!process.env.INVENTORY_DATABASE_URL) {
  process.env.INVENTORY_DATABASE_URL = INVENTORY_URL;
}
if (!process.env.INV_DATABASE_URL) {
  process.env.INV_DATABASE_URL = INVENTORY_URL;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.INVENTORY_DATABASE_URL || INVENTORY_URL
        }
      }
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
