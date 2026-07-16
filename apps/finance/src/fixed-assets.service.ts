import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ensureAccount } from './finance-accounts';
import { EntryType } from '@prisma/client-finance';
import { randomUUID } from 'crypto';

@Injectable()
export class FixedAssetsService {
  private readonly logger = new Logger(FixedAssetsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private monthlyDepreciation(cost: number, salvage: number, months: number) {
    return Math.round(((cost - salvage) / Math.max(months, 1)) * 100) / 100;
  }

  /** Księgowanie amortyzacji: D 402-DEP / C 071-FA-ACC */
  private async postDepreciationToGl(assetCode: string, amount: number, period: string, depId: string) {
    const expense = await ensureAccount(this.prisma, '402-DEP', 'Amortyzacja środków trwałych', 'EXPENSE');
    const contra = await ensureAccount(this.prisma, '071-FA-ACC', 'Umorzenie środków trwałych', 'ASSET');

    await this.prisma.journalEntry.create({
      data: {
        accountId: expense.id,
        amount,
        type: EntryType.DEBIT,
        referenceId: depId,
        source: 'FIXED_ASSETS',
        description: `Amortyzacja ${assetCode} — ${period}`,
      },
    });
    await this.prisma.journalEntry.create({
      data: {
        accountId: contra.id,
        amount,
        type: EntryType.CREDIT,
        referenceId: depId,
        source: 'FIXED_ASSETS',
        description: `Umorzenie ${assetCode} — ${period}`,
      },
    });
    await this.prisma.account.update({ where: { id: expense.id }, data: { balance: { increment: amount } } });
    await this.prisma.account.update({ where: { id: contra.id }, data: { balance: { increment: -amount } } });
    this.logger.log(`GL posted depreciation ${assetCode} ${amount} PLN (${period})`);
  }

  async seedDefaults() {
    const count = await this.prisma.fixedAsset.count();
    if (count > 0) return;
    const defaults = [
      { code: 'FA-CNC-01', name: 'Centrum obróbcze CNC 5-osiowe', category: 'MACHINERY', acquisitionCost: 850000, usefulLifeMonths: 120 },
      { code: 'FA-TR-02', name: 'Wózek widłowy Toyota 3t', category: 'VEHICLE', acquisitionCost: 120000, usefulLifeMonths: 84 },
      { code: 'FA-IT-03', name: 'Serwer ERP + storage', category: 'IT', acquisitionCost: 45000, usefulLifeMonths: 36 },
    ];
    for (const d of defaults) {
      await this.prisma.fixedAsset.create({
        data: { id: randomUUID(), ...d, netBookValue: d.acquisitionCost },
      });
    }
  }

  async list(tenantId = 'default') {
    await this.seedDefaults();
    return this.prisma.fixedAsset.findMany({
      where: { tenantId: { in: [tenantId, 'default'] } },
      orderBy: { code: 'asc' },
      include: { depreciations: { take: 3, orderBy: { postedAt: 'desc' } } },
    });
  }

  async create(body: {
    code: string; name: string; category?: string;
    acquisitionCost: number; salvageValue?: number; usefulLifeMonths?: number;
  }) {
    return this.prisma.fixedAsset.create({
      data: {
        id: randomUUID(),
        code: body.code,
        name: body.name,
        category: body.category ?? 'MACHINERY',
        acquisitionCost: body.acquisitionCost,
        salvageValue: body.salvageValue ?? 0,
        usefulLifeMonths: body.usefulLifeMonths ?? 60,
        netBookValue: body.acquisitionCost,
      },
    });
  }

  async runDepreciation(period?: string) {
    const now = new Date();
    const p = period ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const assets = await this.prisma.fixedAsset.findMany({ where: { status: 'ACTIVE' } });
    const results: Array<{ assetId: string; code: string; period: string; amount: number; netBookValue: number; glPosted: boolean }> = [];

    for (const asset of assets) {
      const monthly = this.monthlyDepreciation(asset.acquisitionCost, asset.salvageValue, asset.usefulLifeMonths);
      if (asset.netBookValue <= asset.salvageValue) {
        await this.prisma.fixedAsset.update({ where: { id: asset.id }, data: { status: 'FULLY_DEPRECIATED' } });
        continue;
      }
      const depAmount = Math.min(monthly, asset.netBookValue - asset.salvageValue);
      const newNbv = Math.round((asset.netBookValue - depAmount) * 100) / 100;
      const newAcc = Math.round((asset.accumulatedDepreciation + depAmount) * 100) / 100;

      const existing = await this.prisma.fixedAssetDepreciation.findFirst({
        where: { assetId: asset.id, period: p },
      });
      if (existing) continue;

      const depId = randomUUID();
      await this.prisma.fixedAssetDepreciation.create({
        data: { id: depId, assetId: asset.id, period: p, amount: depAmount, netBookAfter: newNbv },
      });
      await this.prisma.fixedAsset.update({
        where: { id: asset.id },
        data: {
          accumulatedDepreciation: newAcc,
          netBookValue: newNbv,
          lastDepreciationAt: now,
          status: newNbv <= asset.salvageValue ? 'FULLY_DEPRECIATED' : 'ACTIVE',
        },
      });

      let glPosted = false;
      try {
        await this.postDepreciationToGl(asset.code, depAmount, p, depId);
        glPosted = true;
      } catch (e) {
        this.logger.warn(`GL post failed for ${asset.code}: ${(e as Error).message}`);
      }

      results.push({ assetId: asset.id, code: asset.code, period: p, amount: depAmount, netBookValue: newNbv, glPosted });
    }
    return { period: p, processed: results.length, glPosted: results.filter((r) => r.glPosted).length, entries: results };
  }
}
