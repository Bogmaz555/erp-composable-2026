import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '.prisma/client-tax-legal';

const URL =
  process.env.TAX_LEGAL_DATABASE_URL ||
  'postgresql://erp_user:erp_password@localhost:5442/tax_legal_db?schema=public';

if (!process.env.TAX_LEGAL_DATABASE_URL) {
  process.env.TAX_LEGAL_DATABASE_URL = URL;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect().catch(() => {});
  }
}
