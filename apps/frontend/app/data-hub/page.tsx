'use client';
import { useState, useRef } from 'react';
import { Database, UploadCloud, RefreshCw, FileSpreadsheet, CheckCircle2, AlertCircle, FileText, Download, Shield } from 'lucide-react';
import { useAuditLog, useAuditReadiness } from '../../hooks/usePlatform';

type AuditFilter = 'all' | 'compliance' | 'operational' | 'system';

export default function DataIntegrationHub() {
  const [syncing, setSyncing] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [optimaStatus, setOptimaStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [auditFilter, setAuditFilter] = useState<AuditFilter>('all');
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: auditData } = useAuditLog({
    complianceOnly: auditFilter === 'compliance',
    category: auditFilter === 'all' || auditFilter === 'compliance' ? '' : auditFilter,
  });
  const { data: auditReady } = useAuditReadiness();
  const auditEntries = auditData?.entries ?? [];

  const handleExport = async (entity: 'products' | 'inventory') => {
    const res = await fetch(`/api/analytics/export/${entity}`);
    const data = await res.json();
    const blob = new Blob([data.csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus('Importowanie...');
    const csv = await file.text();
    const res = await fetch('/api/analytics/import/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv }),
    });
    const result = await res.json();
    setImportStatus(`Zaimportowano ${result.imported} pozycji${result.errors?.length ? `, błędy: ${result.errors.length}` : ''}`);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleOptimaSync = () => {
    setOptimaStatus('syncing');
    setSyncing(true);
    setTimeout(() => {
      setOptimaStatus('success');
      setSyncing(false);
      setTimeout(() => setOptimaStatus('idle'), 5000);
    }, 2500);
  };

  const downloadTemplate = () => {
    const csv = 'partNumber,name,type,category,standardCost,currency,lifecycleStatus\n"M-NEW-001","Przykładowy komponent","COMPONENT","Mechanika",100,"PLN","ACTIVE"';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'szablon-produkty.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="flex-1 overflow-y-auto p-8 text-slate-300">
      <header className="mb-8 flex justify-between items-end border-b border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-fuchsia-500/10 rounded-xl border border-fuchsia-500/20">
            <Database className="w-8 h-8 text-fuchsia-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Centrum Integracji Danych</h1>
            <p className="text-slate-400 mt-1">Import/eksport CSV, audyt zdarzeń NATS, konektory zewnętrzne</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <section className="bg-[#0A1428]/80 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-2xl flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Import / Eksport CSV</h2>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl p-8 relative mb-4">
            <UploadCloud className="w-16 h-16 text-slate-500 mb-4" />
            <h3 className="text-lg font-bold text-slate-200 mb-2">Import produktów (PLM)</h3>
            <p className="text-slate-500 text-sm text-center mb-2">CSV z kolumnami: partNumber, name, type...</p>
            <input ref={fileRef} type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".csv" onChange={handleFileUpload} />
          </div>
          {importStatus && <p className="text-sm text-emerald-400 mb-4">{importStatus}</p>}

          <div className="flex gap-3 flex-wrap">
            <button type="button" onClick={downloadTemplate} className="flex-1 min-w-[140px] bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-lg border border-slate-700 text-sm flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Szablon CSV
            </button>
            <button type="button" onClick={() => handleExport('products')} className="flex-1 min-w-[140px] bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-300 py-2.5 rounded-lg border border-emerald-800 text-sm flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Eksport Produktów
            </button>
            <button type="button" onClick={() => handleExport('inventory')} className="flex-1 min-w-[140px] bg-blue-900/40 hover:bg-blue-800/50 text-blue-300 py-2.5 rounded-lg border border-blue-800 text-sm flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Eksport INV
            </button>
          </div>
        </section>

        <section className="bg-[#0A1428]/80 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-2xl flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <RefreshCw className="w-6 h-6 text-fuchsia-400" />
            <h2 className="text-xl font-bold text-white">Konektor Comarch Optima</h2>
          </div>
          <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-5 mb-6 flex-1">
            <p className="text-sm text-slate-400 mb-4">Symulacja synchronizacji z systemem księgowym (demo).</p>
            <button type="button" onClick={handleOptimaSync} disabled={syncing}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
                optimaStatus === 'success' ? 'bg-emerald-600 text-white' : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white'
              }`}>
              {syncing ? <><RefreshCw className="w-5 h-5 animate-spin" /> Synchronizacja...</> : <><RefreshCw className="w-5 h-5" /> Synchronizuj z Optima</>}
            </button>
          </div>
        </section>

        <section className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-400" />
              <h2 className="text-lg font-bold text-white">Audyt zdarzeń (NATS — live)</h2>
              {auditReady?.td013 === 'yellow-minimum' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> TD-013
                </span>
              )}
            </div>
            <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {(['all', 'compliance', 'operational', 'system'] as AuditFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setAuditFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold capitalize ${
                    auditFilter === f ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'Wszystkie' : f === 'compliance' ? 'Compliance' : f}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl font-mono text-sm border border-slate-800 h-56 overflow-y-auto space-y-2">
            {auditEntries.length === 0 && <div className="text-slate-500">Oczekiwanie na zdarzenia NATS...</div>}
            {auditEntries.map((e: {
              timestamp: string; service: string; subject: string; summary: string;
              category?: string; severity?: string; actorId?: string; entityType?: string; entityId?: string;
            }, i: number) => (
              <div key={i} className="text-slate-400 border-b border-slate-900/80 pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-emerald-400">[{new Date(e.timestamp).toLocaleTimeString('pl-PL')}]</span>
                  <span className="text-blue-400">[{e.service}]</span>
                  {e.category && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${
                      e.category === 'compliance' ? 'bg-amber-500/20 text-amber-300' :
                      e.category === 'system' ? 'bg-violet-500/20 text-violet-300' : 'bg-slate-700 text-slate-300'
                    }`}>{e.category}</span>
                  )}
                  {e.severity === 'critical' && <span className="text-[10px] text-red-400">CRIT</span>}
                </div>
                <div className="mt-1">
                  <span className="text-white">{e.subject}</span>
                  {e.actorId && <span className="text-cyan-400 ml-2">@{e.actorId}</span>}
                  {e.entityType && e.entityId && (
                    <span className="text-slate-500 ml-2">{e.entityType}:{e.entityId}</span>
                  )}
                </div>
                <div className="text-slate-600 truncate text-xs mt-0.5">{e.summary}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
