import { Injectable, Logger } from '@nestjs/common';

export interface JpkKrEntry {
  lp: number;
  dataZapisu: string;
  opis: string;
  kontoWinien: string;
  kwotaWinien: number;
  kontoMa: string;
  kwotaMa: number;
  zrodlo: string;
}

@Injectable()
export class JpkKrService {
  private readonly logger = new Logger(JpkKrService.name);
  private readonly finUrl = process.env.FINANCE_SERVICE_URL || 'http://127.0.0.1:4010';

  /** JPK_KR — księga rachunkowa z GL (parowanie D/K po referenceId). */
  async generateLedgerBook(year: number, month: number) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0);
    const end = endDate.toISOString().slice(0, 10);

    let journal: Array<{
      id: string;
      amount: number;
      type: string;
      description?: string;
      source?: string;
      referenceId?: string;
      createdAt: string;
      account?: { code: string; name: string };
    }> = [];

    try {
      const res = await fetch(`${this.finUrl}/fin/journal`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) journal = await res.json();
    } catch (e) {
      this.logger.warn(`Finance journal fetch: ${(e as Error).message}`);
    }

    const filtered = journal.filter((j) => {
      const d = j.createdAt?.slice(0, 10);
      return d && d >= start && d <= end;
    });

    const byRef = new Map<string, typeof filtered>();
    for (const entry of filtered) {
      const ref = entry.referenceId || entry.id;
      const list = byRef.get(ref) ?? [];
      list.push(entry);
      byRef.set(ref, list);
    }

    const wiersze: JpkKrEntry[] = [];
    let lp = 0;

    for (const [, entries] of byRef) {
      const debits = entries.filter((e) => e.type === 'DEBIT');
      const credits = entries.filter((e) => e.type === 'CREDIT');
      const debit = debits[0];
      const credit = credits[0];
      if (!debit && !credit) continue;

      lp++;
      wiersze.push({
        lp,
        dataZapisu: (debit ?? credit).createdAt.slice(0, 10),
        opis: debit?.description || credit?.description || 'Zapis księgowy',
        kontoWinien: debit?.account?.code ?? '—',
        kwotaWinien: debit?.amount ?? 0,
        kontoMa: credit?.account?.code ?? '—',
        kwotaMa: credit?.amount ?? 0,
        zrodlo: debit?.source || credit?.source || 'GL',
      });
    }

    const sumWinien = wiersze.reduce((s, w) => s + w.kwotaWinien, 0);
    const sumMa = wiersze.reduce((s, w) => s + w.kwotaMa, 0);

    return {
      schema: 'JPK_KR',
      version: '1-0',
      period: `${year}-${String(month).padStart(2, '0')}`,
      generatedAt: new Date().toISOString(),
      header: {
        kodFormularza: 'JPK_KR',
        wariantFormularza: 1,
        dataOd: start,
        dataDo: end,
        nip: process.env.COMPANY_NIP || '1234567890',
        pelnaNazwa: process.env.COMPANY_NAME || 'ERP Demo Sp. z o.o.',
      },
      dziennik: {
        liczbaWierszy: wiersze.length,
        sumaWinien: Math.round(sumWinien * 100) / 100,
        sumaMa: Math.round(sumMa * 100) / 100,
        wiersze,
      },
    };
  }
}
