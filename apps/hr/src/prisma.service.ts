import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client-hr';

const URL =
  process.env.HR_DATABASE_URL ||
  'postgresql://erp_user:erp_password@localhost:5443/hr_db?schema=public';

if (!process.env.HR_DATABASE_URL) {
  process.env.HR_DATABASE_URL = URL;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect().catch(() => {});
  }
}
