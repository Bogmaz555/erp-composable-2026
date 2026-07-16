"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useGlobalSearch } from '../hooks/usePlatform';

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const router = useRouter();
  const { data } = useGlobalSearch(q);

  const onKey = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen((o) => !o);
    }
    if (e.key === 'Escape') setOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-400 text-sm hover:border-blue-500/50 transition-colors"
      >
        <Search className="w-4 h-4" />
        <span>Szukaj...</span>
        <kbd className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-600">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
          <Search className="w-5 h-5 text-blue-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Produkty, projekty, SKU, PO..."
            className="flex-1 bg-transparent text-white outline-none text-sm"
          />
          <button type="button" onClick={() => setOpen(false)}><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {q.length < 2 && <p className="p-4 text-slate-500 text-sm">Wpisz min. 2 znaki</p>}
          {data?.results?.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              type="button"
              onClick={() => { router.push(r.link); setOpen(false); setQ(''); }}
              className="w-full text-left px-4 py-3 hover:bg-slate-800 border-b border-slate-800/50 flex justify-between items-center"
            >
              <div>
                <p className="text-sm text-white font-medium">{r.title}</p>
                {r.subtitle && <p className="text-xs text-slate-500">{r.subtitle}</p>}
              </div>
              <span className="text-[10px] font-bold uppercase text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">{r.type}</span>
            </button>
          ))}
          {q.length >= 2 && data?.results?.length === 0 && (
            <p className="p-4 text-slate-500 text-sm">Brak wyników dla „{q}"</p>
          )}
        </div>
      </div>
    </div>
  );
}
