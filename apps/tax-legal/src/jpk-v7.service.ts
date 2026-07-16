import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface JpkV7Entry {
  lp: number;
  nipKontrahenta: string;
  nazwaKontrahenta: string;
  numerFaktury: string;
  dataWystawienia: string;
  kwotaNetto: number;
  kwotaVat: number;
  kwotaBrutto: number;
  statusKsef: string;
}

@Injectable()
export class JpkV7Service {
  constructor(private readonly prisma: PrismaService) {}

  /** JPK_V7M — rejestr sprzedaży (uproszczony, zgodny ze strukturą MF). */
  async generateSalesRegister(year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const invoices = await this.prisma.taxInvoice.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'asc' },
    });

    const vatRate = 0.23;
    const entries: JpkV7Entry[] = invoices.map((inv, i) => {
      const netto = inv.amount;
      const vat = Math.round(netto * vatRate * 100) / 100;
      return {
        lp: i + 1,
        nipKontrahenta: inv.buyerNip || '0000000000',
        nazwaKontrahenta: `Projekt ${inv.projectId}`,
        numerFaktury: `FV/${year}/${String(month).padStart(2, '0')}/${i + 1}`,
        dataWystawienia: inv.createdAt.toISOString().slice(0, 10),
        kwotaNetto: netto,
        kwotaVat: vat,
        kwotaBrutto: Math.round((netto + vat) * 100) / 100,
        statusKsef: inv.status,
      };
    });

    const sumNetto = entries.reduce((s, e) => s + e.kwotaNetto, 0);
    const sumVat = entries.reduce((s, e) => s + e.kwotaVat, 0);

    return {
      schema: 'JPK_V7M',
      version: '1-0',
      period: `${year}-${String(month).padStart(2, '0')}`,
      generatedAt: new Date().toISOString(),
      header: {
        kodFormularza: 'JPK_V7M',
        wariantFormularza: 1,
        celZlozenia: 1,
        dataOd: start.toISOString().slice(0, 10),
        dataDo: end.toISOString().slice(0, 10),
        nip: process.env.COMPANY_NIP || '1234567890',
        pelnaNazwa: process.env.COMPANY_NAME || 'ERP Demo Sp. z o.o.',
      },
      ewidencjaSprzedazy: {
        liczbaWierszy: entries.length,
        podatekNalezny: sumVat,
        sumaNetto: sumNetto,
        wiersze: entries,
      },
    };
  }
}
