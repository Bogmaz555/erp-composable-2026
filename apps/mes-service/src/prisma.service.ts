import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client-mes';

const MES_URL = "postgresql://erp_user:erp_password@localhost:5435/mfg_db?schema=public";

if (!process.env.MES_DATABASE_URL) {
  process.env.MES_DATABASE_URL = MES_URL;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.MES_DATABASE_URL || MES_URL
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
