"use client";
import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  UserPlus,
  Building2,
  Mail,
  FileText,
  CircleDollarSign,
  Hash,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

type CurrencyCode = 'PLN' | 'EUR' | 'USD';

interface NewLeadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Wysuwana szuflada (slide-over) do rejestracji nowych Leadów.
 * Uzasadnienie architektoniczne: Oddzielny komponent zamiast modala pozwala użytkownikowi
 * zachować kontekst Kanbana w tle, co zwiększa konwersję operatorów B2B.
 * Waluta jest przypisywana per-Lead (per-Opportunity), a nie globalnie.
 */
export default function NewLeadDrawer({ isOpen, onClose, onSuccess }: NewLeadDrawerProps) {
  const [companyName, setCompanyName] = useState('');
  const [nip, setNip] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('PLN');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const firstInputRef = useRef<HTMLInputElement>(null);

  const currencyOptions: { code: CurrencyCode; flag: string }[] = [
    { code: 'PLN', flag: '🇵🇱' },
    { code: 'EUR', flag: '🇪🇺' },
    { code: 'USD', flag: '🇺🇸' },
  ];

  useEffect(() => {
    if (isOpen) {
      setCompanyName('');
      setNip('');
      setEmail('');
      setTitle('');
      setEstimatedValue('');
      setCurrency('PLN');
      setError(null);
      setSuccess(false);
      setTimeout(() => firstInputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/crm/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, nip, email, title, estimatedValue, currency }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg h-full bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl shadow-black/50 flex flex-col animate-in slide-in-from-right duration-300 overflow-y-auto">

        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/20 border border-indigo-500/30 p-2.5 rounded-xl">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Nowy Lead</h2>
              <p className="text-xs text-slate-500 mt-0.5">Rejestracja zapytania ofertowego</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success State */}
        {success && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10">
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-2xl animate-in zoom-in duration-300">
              <CheckCircle2 className="w-16 h-16 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-white">Lead Utworzony!</p>
            <p className="text-sm text-slate-400 text-center">
              Nowe zapytanie trafiło do kolumny &quot;Zapytanie (New)&quot; na tablicy Kanban.
            </p>
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={handleSubmit} className="p-6 flex-1 flex flex-col gap-5">

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Company Name */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" />
                Nazwa Firmy *
              </label>
              <input
                ref={firstInputRef}
                type="text"
                required
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="np. Automatyka Polska Sp. z o.o."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              />
            </div>

            {/* NIP */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Hash className="w-3.5 h-3.5" />
                NIP
              </label>
              <input
                type="text"
                value={nip}
                onChange={e => setNip(e.target.value)}
                placeholder="np. 1234567890"
                maxLength={10}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" />
                Adres Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="kontakt@firma.pl"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                Tytuł Zapytania *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="np. Linia pakująca z robotem Delta"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              />
            </div>

            {/* Estimated Value + Currency Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <CircleDollarSign className="w-3.5 h-3.5" />
                Wstępny Budżet
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={estimatedValue}
                    onChange={e => setEstimatedValue(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-mono"
                  />
                </div>
                <div className="relative">
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value as CurrencyCode)}
                    className="h-full appearance-none bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 pr-9 text-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all cursor-pointer"
                  >
                    {currencyOptions.map(opt => (
                      <option key={opt.code} value={opt.code} className="bg-slate-900 text-slate-200">
                        {opt.flag} {opt.code}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Divider */}
            <div className="border-t border-slate-800" />

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white rounded-xl font-bold uppercase tracking-wider text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Tworzenie leada...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Utwórz Lead
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
