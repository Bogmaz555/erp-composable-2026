"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Clock, Loader2, Plus } from 'lucide-react';
import { Field, TextInput, Select } from '../../components/ui/Field';

export default function HRPage() {
  const qc = useQueryClient();
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['hr-employees'],
    queryFn: async () => {
      const res = await fetch('/api/hr/employees');
      if (!res.ok) throw new Error('Błąd pobierania kadry');
      return res.json();
    },
  });

  const recordTime = useMutation({
    mutationFn: async (body: { employeeId: string; projectId: string; hours: number }) => {
      const res = await fetch('/api/hr/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Błąd zapisu RCP');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr-employees'] }),
  });

  const [employeeId, setEmployeeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [hours, setHours] = useState('8');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col gap-6">
      <header className="flex items-center gap-4 bg-slate-900/60 border border-slate-700/50 p-6 rounded-2xl">
        <div className="p-3 bg-violet-500/10 rounded-xl border border-violet-500/30">
          <Users className="w-8 h-8 text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">HR — Kadry i RCP</h1>
          <p className="text-sm text-slate-400">Rejestracja czasu pracy → koszty projektów (Finance)</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900/60 border border-slate-700/50 p-6 rounded-2xl">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-400" /> Rejestracja czasu
          </h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            await recordTime.mutateAsync({ employeeId, projectId, hours: parseFloat(hours) || 0 });
            setHours('8');
          }} className="space-y-3">
            <Field label="Pracownik">
              <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
                <option value="">— wybierz —</option>
                {employees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.badgeId})</option>
                ))}
              </Select>
            </Field>
            <Field label="ID projektu">
              <TextInput value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="uuid projektu PM" required />
            </Field>
            <Field label="Godziny">
              <TextInput type="number" step="0.5" min="0.5" value={hours} onChange={(e) => setHours(e.target.value)} />
            </Field>
            <button type="submit" disabled={recordTime.isPending}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white p-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              {recordTime.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Zapisz wpis RCP
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
          <table className="w-full text-sm text-slate-300">
            <thead className="text-[10px] uppercase text-slate-500 bg-slate-950/30 border-b border-slate-800">
              <tr>
                <th className="p-4 text-left">Badge</th>
                <th className="p-4 text-left">Imię i nazwisko</th>
                <th className="p-4 text-left">Rola</th>
                <th className="p-4 text-right">Stawka/h</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin inline" /></td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Brak pracowników w bazie.</td></tr>
              ) : employees.map((emp: any) => (
                <tr key={emp.id} className="border-b border-slate-800/40 hover:bg-slate-800/40">
                  <td className="p-4 font-mono text-xs">{emp.badgeId}</td>
                  <td className="p-4 font-medium text-white">{emp.firstName} {emp.lastName}</td>
                  <td className="p-4 text-slate-400">{emp.role}</td>
                  <td className="p-4 text-right font-mono">{emp.hourlyRate?.toFixed(2)} PLN</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
