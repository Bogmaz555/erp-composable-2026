"use client";

import React, { useState } from 'react';
import { Bell, AlertTriangle, Info } from 'lucide-react';
import { useNotifications } from '../hooks/usePlatform';
import Link from 'next/link';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data } = useNotifications();
  const items = data?.items ?? [];
  const critical = items.filter((n: { level: string }) => n.level === 'critical').length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-blue-500/50 transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-300" />
        {critical > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[10px] font-bold flex items-center justify-center">{critical}</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
            <div className="px-4 py-3 border-b border-slate-800 font-bold text-sm text-white">Powiadomienia</div>
            {items.length === 0 && <p className="p-4 text-slate-500 text-sm">Brak alertów — nasłuch NATS aktywny</p>}
            {items.map((n: { id: string; level: string; title: string; body: string; link?: string; timestamp: string }) => (
              <div key={n.id} className="px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/50">
                <div className="flex items-start gap-2">
                  {n.level === 'critical' ? <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" /> : <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-200 truncate">{n.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">{n.body}</p>
                    {n.link && (
                      <Link href={n.link} onClick={() => setOpen(false)} className="text-[10px] text-blue-400 hover:underline">Otwórz →</Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
