"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Lock } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import RoleBadge from '../../../components/RoleBadge';

interface RoleDef {
  id: string;
  label: string;
  permissions: { module: string; resource: string; actions: string[] }[];
}

export default function RolesSettingsPage() {
  const { activeRole, authEnforced, can } = useAuth();

  const { data } = useQuery<{ roles: RoleDef[] }>({
    queryKey: ['auth-roles'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/auth/roles');
      if (!res.ok) throw new Error('Błąd pobierania ról');
      return res.json();
    },
  });

  const roles = data?.roles ?? [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col gap-6">
      <header className="flex items-center justify-between bg-slate-900/60 border border-slate-700/50 p-6 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-violet-500/10 rounded-xl border border-violet-500/30">
            <Shield className="w-8 h-8 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Role i uprawnienia</h1>
            <p className="text-sm text-slate-400">
              {authEnforced ? 'AUTH_ENFORCE=true — Keycloak RBAC' : 'Tryb dev — przełącznik ról w pasku górnym'}
            </p>
          </div>
        </div>
        <RoleBadge />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="font-bold text-white mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-violet-400" /> Aktywna rola
          </h2>
          <p className="text-3xl font-extrabold text-violet-300">{activeRole}</p>
          <p className="text-sm text-slate-500 mt-2">
            Przykład: can(&apos;write&apos;, &apos;orders&apos;) → {can('write', 'orders') ? '✓ TAK' : '✗ NIE'}
          </p>
        </div>
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase text-slate-500 bg-slate-950/30">
              <tr>
                <th className="p-4 text-left">Rola</th>
                <th className="p-4 text-left">Moduł</th>
                <th className="p-4 text-left">Zasób</th>
                <th className="p-4 text-left">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {roles.flatMap((role) =>
                role.permissions.map((p, i) => (
                  <tr
                    key={`${role.id}-${i}`}
                    className={`border-t border-slate-800/50 ${role.id === activeRole ? 'bg-violet-500/5' : ''}`}
                  >
                    {i === 0 && (
                      <td className="p-4 font-bold text-white align-top" rowSpan={role.permissions.length}>
                        {role.label}
                        <div className="text-[10px] text-slate-500 font-normal">{role.id}</div>
                      </td>
                    )}
                    <td className="p-4 text-slate-300">{p.module}</td>
                    <td className="p-4 text-slate-400 font-mono text-xs">{p.resource}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {p.actions.map((a) => (
                          <span key={a} className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">{a}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
