"use client";

import { useAuth, type ErpRole } from '../context/AuthContext';
import { Shield, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const ROLE_COLORS: Record<ErpRole, string> = {
  ADMIN: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
  ENGINEER: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  INSPECTOR: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  ACCOUNTANT: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  PROCUREMENT: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  WAREHOUSE: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  VIEWER: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
};

const ALL_ROLES: ErpRole[] = ['ADMIN', 'ENGINEER', 'INSPECTOR', 'ACCOUNTANT', 'PROCUREMENT', 'WAREHOUSE', 'VIEWER'];

export default function RoleBadge() {
  const { activeRole, setActiveRole, authEnforced } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${ROLE_COLORS[activeRole]}`}
        title={authEnforced ? 'Keycloak RBAC aktywny' : 'Dev role switcher'}
      >
        <Shield className="w-3.5 h-3.5" />
        {activeRole}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[160px]">
            {ALL_ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => { setActiveRole(r); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-800 ${r === activeRole ? 'text-white font-bold' : 'text-slate-400'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
