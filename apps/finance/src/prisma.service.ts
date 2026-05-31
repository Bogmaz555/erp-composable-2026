import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client-finance';

// Finance PrismaService – enables real ProjectCost / WipAccount writes for ETO WIP
const FINANCE_URL = process.env.FINANCE_DATABASE_URL || 'postgresql://erp_user:erp_password@localhost:5438/finance_db?schema=public';

if (!process.env.FINANCE_DATABASE_URL) {
  process.env.FINANCE_DATABASE_URL = FINANCE_URL;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.FINANCE_DATABASE_URL || FINANCE_URL,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await this.$disconnect();
      await app.close();
    });
  }
}
