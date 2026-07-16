"use client";

import React, { useState } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Landmark, 
  CreditCard,
  Search,
  Filter,
  Download
} from 'lucide-react';
import { usePayables, useReceivables, useWipAccounts } from '../../hooks/useFinance';
import MilestoneBillingPanel from './MilestoneBillingPanel';
import GlLedgerPanel from './GlLedgerPanel';
import BudgetVariancePanel from './BudgetVariancePanel';
import FixedAssetsPanel from './FixedAssetsPanel';
import { Flag, BookOpen, BarChart3, Building2 } from 'lucide-react';

const formatCurrency = (value: number, currency: string = 'PLN') => {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(value);
};

const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat('pl-PL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(dateString));
};

export default function FinanceDashboard() {
  const { data: payables = [], isLoading: loadingPayables } = usePayables();
  const { data: receivables = [], isLoading: loadingReceivables } = useReceivables();
  const { data: wipAccounts = [] } = useWipAccounts();
  const totalWip = wipAccounts.reduce((s, w) => s + w.wipBalance, 0);
  
  const [activeTab, setActiveTab] = useState<'payables' | 'receivables' | 'milestones' | 'ledger' | 'budget' | 'assets'>('milestones');

  const totalPayables = payables.reduce((sum, item) => sum + item.amount, 0);
  const totalReceivables = receivables.reduce((sum, item) => sum + item.amount, 0);
  const netPosition = totalReceivables - totalPayables;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-900/30 text-amber-400 border-amber-800/30';
      case 'OVERDUE': return 'bg-rose-900/30 text-rose-400 border-rose-800/30';
      case 'PAID': return 'bg-emerald-900/30 text-emerald-400 border-emerald-800/30';
      default: return 'bg-slate-800/50 text-slate-400 border-slate-700/50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'OCZEKUJĄCE';
      case 'OVERDUE': return 'ZALEGŁE';
      case 'PAID': return 'OPŁACONE';
      default: return status;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2 drop-shadow-sm flex items-center">
            <Wallet className="w-10 h-10 mr-4 text-emerald-400" />
            Finanse i Księgowość
          </h1>
          <p className="text-slate-400 text-lg">Zarządzanie należnościami, zobowiązaniami i płynnością</p>
        </div>
        
        <div className="flex gap-3">
          <button className="flex items-center px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg text-slate-300 transition-colors backdrop-blur-md">
            <Filter className="w-4 h-4 mr-2" />
            Filtruj
          </button>
          <button className="flex items-center px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg text-slate-300 transition-colors backdrop-blur-md">
            <Download className="w-4 h-4 mr-2" />
            Eksportuj
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ArrowUpRight className="w-24 h-24 text-emerald-400" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">Należności (Receivables)</h3>
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <ArrowUpRight className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-100">{formatCurrency(totalReceivables)}</p>
          <p className="text-sm text-emerald-400 mt-2 flex items-center">
            +12.5% od ostatniego miesiąca
          </p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden group hover:border-rose-500/30 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ArrowDownRight className="w-24 h-24 text-rose-400" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">Zobowiązania (Payables)</h3>
            <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
              <ArrowDownRight className="w-5 h-5 text-rose-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-100">{formatCurrency(totalPayables)}</p>
          <p className="text-sm text-rose-400 mt-2 flex items-center">
            -4.2% od ostatniego miesiąca
          </p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden group hover:border-violet-500/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">WIP Projekty (ETO)</h3>
            <div className="p-2 bg-violet-500/10 rounded-lg border border-violet-500/20">
              <Flag className="w-5 h-5 text-violet-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-violet-300">{formatCurrency(totalWip)}</p>
          <p className="text-sm text-slate-500 mt-2">{wipAccounts.length} aktywnych projektów</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Landmark className="w-24 h-24 text-cyan-400" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">Pozycja Netto</h3>
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <Landmark className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <p className={`text-3xl font-bold ${netPosition >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(netPosition)}
          </p>
          <p className="text-sm text-slate-400 mt-2 flex items-center">
            Szacowana płynność
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-[#0f172a]/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-slate-800/80 px-6 pt-4 gap-6">
          <button
            onClick={() => setActiveTab('payables')}
            className={`pb-4 text-sm font-semibold transition-all relative ${
              activeTab === 'payables'
                ? 'text-rose-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Zobowiązania (PROC)
            </div>
            {activeTab === 'payables' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-400 rounded-t-full shadow-[0_-2px_10px_rgba(251,113,133,0.5)]" />
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('receivables')}
            className={`pb-4 text-sm font-semibold transition-all relative ${
              activeTab === 'receivables'
                ? 'text-emerald-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Należności (Klienci)
            </div>
            {activeTab === 'receivables' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-t-full shadow-[0_-2px_10px_rgba(52,211,153,0.5)]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('milestones')}
            className={`pb-4 text-sm font-semibold transition-all relative ${
              activeTab === 'milestones'
                ? 'text-cyan-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4" />
              Milestone ETO (FAT/SAT)
            </div>
            {activeTab === 'milestones' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-t-full shadow-[0_-2px_10px_rgba(34,211,238,0.5)]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('budget')}
            className={`pb-4 text-sm font-semibold transition-all relative ${
              activeTab === 'budget'
                ? 'text-violet-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Budżet vs Wykonanie
            </div>
            {activeTab === 'budget' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-400 rounded-t-full shadow-[0_-2px_10px_rgba(167,139,250,0.5)]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`pb-4 text-sm font-semibold transition-all relative ${
              activeTab === 'ledger'
                ? 'text-amber-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Księga Główna (GL)
            </div>
            {activeTab === 'ledger' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-t-full shadow-[0_-2px_10px_rgba(251,191,36,0.5)]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('assets')}
            className={`pb-4 text-sm font-semibold transition-all relative ${
              activeTab === 'assets'
                ? 'text-violet-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Środki trwałe
            </div>
            {activeTab === 'assets' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-400 rounded-t-full" />
            )}
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-800/50 flex justify-between items-center bg-slate-900/30">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Szukaj..." 
              className="w-full bg-slate-950/50 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {activeTab === 'milestones' && <MilestoneBillingPanel />}
        {activeTab === 'ledger' && <GlLedgerPanel />}
        {activeTab === 'budget' && <BudgetVariancePanel />}
        {activeTab === 'assets' && <FixedAssetsPanel />}

        {/* Data Table */}
        {activeTab !== 'milestones' && activeTab !== 'ledger' && activeTab !== 'budget' && activeTab !== 'assets' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-900/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">ID</th>
                <th className="px-6 py-4 font-semibold">
                  {activeTab === 'payables' ? 'Dostawca' : 'Klient'}
                </th>
                <th className="px-6 py-4 font-semibold">Referencja</th>
                <th className="px-6 py-4 font-semibold text-right">Kwota</th>
                <th className="px-6 py-4 font-semibold text-center">Termin</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {activeTab === 'payables' && loadingPayables && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Ładowanie zobowiązań...</td></tr>
              )}
              {activeTab === 'receivables' && loadingReceivables && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Ładowanie należności...</td></tr>
              )}
              
              {activeTab === 'payables' && !loadingPayables && payables.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <CreditCard className="w-12 h-12 mb-4 opacity-50" />
                      <p className="text-lg font-medium">Brak zobowiązań</p>
                      <p className="text-sm">Wszystkie faktury kosztowe zostały opłacone.</p>
                    </div>
                  </td>
                </tr>
              )}

              {activeTab === 'receivables' && !loadingReceivables && receivables.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <Wallet className="w-12 h-12 mb-4 opacity-50" />
                      <p className="text-lg font-medium">Brak należności</p>
                      <p className="text-sm">Klienci opłacili wszystkie faktury.</p>
                    </div>
                  </td>
                </tr>
              )}

              {activeTab === 'payables' && payables.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 font-medium text-slate-200">{item.id}</td>
                  <td className="px-6 py-4">{item.vendor}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs border border-slate-700">
                      {item.orderRef}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-medium text-slate-200">
                    {formatCurrency(item.amount, item.currency)}
                  </td>
                  <td className="px-6 py-4 text-center">{formatDate(item.dueDate)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </td>
                </tr>
              ))}

              {activeTab === 'receivables' && receivables.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 font-medium text-slate-200">{item.id}</td>
                  <td className="px-6 py-4">{item.client}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs border border-slate-700">
                      {item.invoiceRef}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-medium text-slate-200">
                    {formatCurrency(item.amount, item.currency)}
                  </td>
                  <td className="px-6 py-4 text-center">{formatDate(item.dueDate)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
        
        {/* Footer info */}
        <div className="p-4 border-t border-slate-800/50 bg-slate-900/30 text-xs text-slate-500 flex justify-between items-center">
          <span>
            {activeTab === 'milestones'
              ? 'Kamienie milowe — integracja PM → Finance → KSeF'
              : activeTab === 'ledger'
              ? 'Księga główna — plan kont i dziennik dekretów'
              : activeTab === 'budget'
              ? 'Budżet vs wykonanie — odchylenia kosztów projektów ETO'
              : `Pokazywanie ${activeTab === 'payables' ? payables.length : receivables.length} rekordów`}
          </span>
          <span>Zaktualizowano: dzisiaj, {new Date().toLocaleTimeString('pl-PL', {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
      </div>
    </div>
  );
}
