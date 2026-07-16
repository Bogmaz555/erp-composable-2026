import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client-proc';

const PROC_URL = 'postgresql://erp_user:erp_password@localhost:5437/proc_db?schema=public';
if (!process.env.PROC_DATABASE_URL) {
  process.env.PROC_DATABASE_URL = PROC_URL;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.PROC_DATABASE_URL || PROC_URL,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
