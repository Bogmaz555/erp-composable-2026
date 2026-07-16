"use client";

import React, { useState } from 'react';
import { ClipboardCheck, Check, X, ChevronDown } from 'lucide-react';
import { useApprovals, useApproveRequest, useRejectRequest } from '../hooks/useApprovals';

export default function ApprovalInbox() {
  const { data } = useApprovals('PENDING');
  const approve = useApproveRequest();
  const reject = useRejectRequest();
  const [open, setOpen] = useState(false);

  const pending = data?.pending ?? 0;
  const items = data?.items ?? [];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/80 text-xs font-semibold text-slate-300 hover:bg-slate-800"
      >
        <ClipboardCheck className="w-4 h-4 text-blue-400" />
        Zatwierdzenia
        {pending > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
            {pending}
          </span>
        )}
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 text-sm font-bold text-white">
              Oczekujące ({pending})
            </div>
            <div className="max-h-72 overflow-y-auto">
              {items.length === 0 ? (
                <p className="p-4 text-xs text-slate-500">Brak wniosków do zatwierdzenia</p>
              ) : items.map((item) => (
                <div key={item.id} className="p-3 border-b border-slate-800/50 hover:bg-slate-800/50">
                  <div className="text-xs font-semibold text-white">{item.title}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{item.module} · {item.requiredRole}</div>
                  <div className="flex gap-1 mt-2">
                    <button
                      type="button"
                      onClick={() => { approve.mutate(item.id); setOpen(false); }}
                      className="flex-1 flex items-center justify-center gap-1 py-1 bg-emerald-800/50 hover:bg-emerald-700/50 rounded text-[10px] text-emerald-300"
                    >
                      <Check className="w-3 h-3" /> Zatwierdź
                    </button>
                    <button
                      type="button"
                      onClick={() => { reject.mutate(item.id); setOpen(false); }}
                      className="flex-1 flex items-center justify-center gap-1 py-1 bg-rose-900/40 hover:bg-rose-800/50 rounded text-[10px] text-rose-300"
                    >
                      <X className="w-3 h-3" /> Odrzuć
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
