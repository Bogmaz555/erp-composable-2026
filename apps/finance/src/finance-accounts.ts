import type { PrismaService } from './prisma.service';
import { AccountType } from '@prisma/client-finance';

export async function ensureAccount(
  prisma: PrismaService,
  code: string,
  name: string,
  type: AccountType,
) {
  return prisma.account.upsert({
    where: { code },
    update: {},
    create: { code, name, type, balance: 0, currency: 'PLN' },
  });
}
