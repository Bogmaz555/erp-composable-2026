import { Injectable } from '@nestjs/common';

export interface JpkKrValidationResult {
  valid: boolean;
  schema: 'JPK_KR';
  errors: string[];
  warnings: string[];
  checkedAt: string;
}

@Injectable()
export class JpkKrValidatorService {
  /** Walidacja strukturalna JPK_KR wg wymagań MF (schemat 1-0). */
  validate(payload: Record<string, unknown>): JpkKrValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (payload.schema !== 'JPK_KR') {
      errors.push('schema musi być JPK_KR');
    }

    const header = payload.header as Record<string, unknown> | undefined;
    if (!header) {
      errors.push('brak sekcji header');
    } else {
      if (header.kodFormularza !== 'JPK_KR') errors.push('kodFormularza !== JPK_KR');
      const nip = String(header.nip ?? '').replace(/\D/g, '');
      if (nip.length !== 10) errors.push(`NIP musi mieć 10 cyfr (jest: ${nip.length})`);
      if (!header.pelnaNazwa) errors.push('brak pelnaNazwa');
      if (!header.dataOd || !header.dataDo) errors.push('brak dataOd/dataDo');
      if (header.dataOd && header.dataDo && String(header.dataOd) > String(header.dataDo)) {
        errors.push('dataOd nie może być późniejsza niż dataDo');
      }
    }

    const dziennik = payload.dziennik as Record<string, unknown> | undefined;
    if (!dziennik) {
      errors.push('brak sekcji dziennik');
    } else {
      const sumW = Number(dziennik.sumaWinien ?? 0);
      const sumM = Number(dziennik.sumaMa ?? 0);
      if (Math.abs(sumW - sumM) > 0.01) {
        errors.push(`suma Winien (${sumW}) ≠ suma Ma (${sumM}) — księga niezbalansowana`);
      }
      const wiersze = (dziennik.wiersze as Array<Record<string, unknown>>) ?? [];
      if (wiersze.length === 0) warnings.push('dziennik bez zapisów (pusty okres)');
      wiersze.forEach((w, i) => {
        const kw = Number(w.kwotaWinien ?? 0);
        const km = Number(w.kwotaMa ?? 0);
        if (kw < 0 || km < 0) errors.push(`wiersz ${i + 1}: ujemne kwoty`);
        if (w.kontoWinien === '—' && w.kontoMa === '—') {
          errors.push(`wiersz ${i + 1}: brak kont Winien/Ma`);
        }
        if (!w.dataZapisu) warnings.push(`wiersz ${i + 1}: brak dataZapisu`);
      });
      const liczba = Number(dziennik.liczbaWierszy ?? 0);
      if (liczba !== wiersze.length) {
        warnings.push(`liczbaWierszy (${liczba}) ≠ faktyczna liczba wierszy (${wiersze.length})`);
      }
    }

    return {
      valid: errors.length === 0,
      schema: 'JPK_KR',
      errors,
      warnings,
      checkedAt: new Date().toISOString(),
    };
  }
}
