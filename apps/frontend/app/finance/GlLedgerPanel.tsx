"use client";

import React, { useState } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { useGlAccounts, useJournalEntries, usePostJournalEntry } from '../../hooks/useFinance';

const fmt = (v: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(v);

export default function GlLedgerPanel() {
  const { data: accounts = [], isLoading: loadingAccounts } = useGlAccounts();
  const { data: entries = [], isLoading: loadingJournal } = useJournalEntries();
  const postEntry = usePostJournalEntry();

  const [form, setForm] = useState({
    accountCode: '401-MAT',
    amount: '1000',
    type: 'DEBIT' as 'DEBIT' | 'CREDIT',
    description: '',
  });

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    await postEntry.mutateAsync({
      accountCode: form.accountCode,
      amount: parseFloat(form.amount),
      type: form.type,
      description: form.description || undefined,
    });
    setForm((f) => ({ ...f, description: '' }));
  };

  return (
    <div className="p-6 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Plan kont (GL)
          </h3>
          {loadingAccounts ? (
            <p className="text-slate-500 text-sm">Ładowanie...</p>
          ) : (
            <div className="space-y-2">
              {accounts.map((a) => (
                <div
                  key={a.id}
                  className="flex justify-between items-center px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-lg"
                >
                  <div>
                    <span className="font-mono text-xs text-cyan-400">{a.code}</span>
                    <p className="text-sm text-slate-200">{a.name}</p>
                    <span className="text-[10px] text-slate-500 uppercase">{a.type}</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-300">{fmt(a.balance)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handlePost} className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" /> Nowy zapis księgowy
          </h3>
          <div>
            <label className="text-[10px] uppercase text-slate-500 font-bold">Konto</label>
            <select
              value={form.accountCode}
              onChange={(e) => setForm((f) => ({ ...f, accountCode: e.target.value }))}
              className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            >
              {accounts.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase text-slate-500 font-bold">Kwota</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-500 font-bold">Strona</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'DEBIT' | 'CREDIT' }))}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="DEBIT">Winien (DEBIT)</option>
                <option value="CREDIT">Ma (CREDIT)</option>
              </select>
            </div>
          </div>
          <input
            type="text"
            placeholder="Opis operacji"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
          />
          <button
            type="submit"
            disabled={postEntry.isPending}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg text-sm"
          >
            {postEntry.isPending ? 'Księgowanie...' : 'Zaksięguj'}
          </button>
        </form>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Dziennik (ostatnie 100)</h3>
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-900/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Konto</th>
                <th className="px-4 py-3">Strona</th>
                <th className="px-4 py-3 text-right">Kwota</th>
                <th className="px-4 py-3">Opis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loadingJournal && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Ładowanie...</td></tr>
              )}
              {!loadingJournal && entries.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Brak zapisów — dodaj pierwszy wpis.</td></tr>
              )}
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3 text-slate-400">{new Date(e.createdAt).toLocaleString('pl-PL')}</td>
                  <td className="px-4 py-3 font-mono text-cyan-400">{e.account.code}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${e.type === 'DEBIT' ? 'bg-rose-900/40 text-rose-300' : 'bg-emerald-900/40 text-emerald-300'}`}>
                      {e.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(e.amount)}</td>
                  <td className="px-4 py-3 text-slate-400">{e.description || e.source || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
