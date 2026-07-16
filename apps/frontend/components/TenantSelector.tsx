"use client";

import { useTenant } from '../context/TenantContext';
import { Building2, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function TenantSelector() {
  const { tenantId, tenants, setTenantId, tenant } = useTenant();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/80 text-xs font-semibold text-slate-300 hover:bg-slate-800 max-w-[180px]"
      >
        <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className="truncate">{tenant?.name ?? tenantId}</span>
        <ChevronDown className="w-3 h-3 opacity-50 shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[220px]">
            {tenants.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTenantId(t.id); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-800 ${t.id === tenantId ? 'text-cyan-300 font-bold' : 'text-slate-400'}`}
              >
                <div>{t.name}</div>
                <div className="text-[10px] text-slate-600">{t.id} · {t.currency}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
