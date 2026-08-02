"use client"

import React from 'react'
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Briefcase,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CheckCircle2
} from 'lucide-react'

export default function CeoDashboard() {
  const kpis = [
    { 
      label: 'Miesięczne Przychody (MRR)', 
      value: '$2.4M', 
      trend: '+12.5%', 
      isPositive: true, 
      icon: DollarSign, 
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20'
    },
    { 
      label: 'Marża Operacyjna Netto', 
      value: '24.8%', 
      trend: '+2.1%', 
      isPositive: true, 
      icon: TrendingUp, 
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20'
    },
    { 
      label: 'Wolne Przepływy Pieniężne', 
      value: '$850K', 
      trend: '-4.2%', 
      isPositive: false, 
      icon: Activity, 
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20'
    },
    { 
      label: 'Aktywny Portfel Zamówień', 
      value: '$18.2M', 
      trend: '+5.0%', 
      isPositive: true, 
      icon: Briefcase, 
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20'
    },
  ]

  const alerts = [
    { id: 1, type: 'critical', message: 'Wymagana akceptacja CapEx dla maszyny CNC #4 ($450K)', time: '2 godziny temu' },
    { id: 2, type: 'warning', message: 'Przewidywane opóźnienie dostaw surowego aluminium (Tier 1)', time: '5 godzin temu' },
    { id: 3, type: 'info', message: 'Audyt finansowy za Q3 zakończony bez krytycznych uwag', time: '1 dzień temu' },
  ]

  const topClients = [
    { name: 'AeroDynamics Corp', volume: '$1.2M', health: 'Doskonały', status: 'Zgodnie z planem' },
    { name: 'Global Tech Industries', volume: '$850K', health: 'Dobry', status: 'Wymaga przeglądu' },
    { name: 'Nexon Automotive', volume: '$620K', health: 'Doskonały', status: 'Zgodnie z planem' },
  ]

  // Mock data for a simple CSS bar chart (12 months)
  const chartData = [40, 55, 45, 70, 65, 80, 75, 90, 85, 100, 95, 110]
  const maxVal = Math.max(...chartData)

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="glass-panel glass-hover p-6 rounded-2xl relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-32 h-32 blur-[50px] rounded-full pointer-events-none ${kpi.color.replace('text-', 'bg-')}/10`} />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className={`p-3 rounded-xl border ${kpi.bg}`}>
                <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
              </div>
              <div className={`flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-full ${kpi.isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {kpi.isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {kpi.trend}
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-sm text-gray-400 mb-1 font-medium uppercase tracking-wider">{kpi.label}</p>
              <h3 className="text-3xl font-bold tracking-tight text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="flex items-center justify-between mb-8 z-10 relative">
            <div>
              <h3 className="text-lg font-semibold text-white">Przychody vs Koszty Operacyjne (YTD)</h3>
              <p className="text-sm text-gray-400">Miesięczne zestawienie wyników finansowych</p>
            </div>
            <div className="flex gap-4 items-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                <span className="text-gray-300">Przychody</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-600" />
                <span className="text-gray-300">Koszty</span>
              </div>
            </div>
          </div>

          <div className="h-64 flex items-end gap-3 z-10 relative mt-4">
             {chartData.map((val, i) => {
               // Deterministic "randomish" multiplier based on index to avoid hydration error
               const deterministicMultiplier = 0.6 + ((i * 13) % 15) / 100;
               const costVal = val * deterministicMultiplier;
               return (
                 <div key={i} className="flex-1 flex justify-center items-end group h-full relative">
                   {/* Revenue Bar */}
                   <div 
                     className="w-full max-w-[32px] bg-gradient-to-t from-indigo-900/50 to-indigo-500 rounded-t-md relative transition-all duration-500 hover:brightness-125"
                     style={{ height: `${(val / maxVal) * 100}%` }}
                   >
                     {/* Cost Bar (Overlayed or beside, here overlayed for stacked look or simple comparison) */}
                     <div 
                       className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-800 to-slate-600 rounded-t-md opacity-80"
                       style={{ height: `${(costVal / val) * 100}%` }}
                     />
                   </div>
                   
                   {/* Tooltip on hover */}
                   <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-xs px-3 py-2 rounded border border-white/10 whitespace-nowrap z-20 pointer-events-none">
                     Przychody: {val}M | Koszty: {costVal.toFixed(1)}M
                   </div>
                 </div>
               )
             })}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-4 border-t border-white/5 pt-4 z-10 relative">
            <span>Sty</span><span>Lut</span><span>Mar</span><span>Kwi</span><span>Maj</span><span>Cze</span>
            <span>Lip</span><span>Sie</span><span>Wrz</span><span>Paź</span><span>Lis</span><span>Gru</span>
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-2xl flex-1">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Wymagają Uwagi
            </h3>
            <div className="space-y-4">
              {alerts.map(alert => (
                <div key={alert.id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group relative overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    alert.type === 'critical' ? 'bg-rose-500' : alert.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                  }`} />
                  <p className="text-sm text-gray-200 group-hover:text-white transition-colors">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-2">{alert.time}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl flex-1">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-emerald-400" />
              Kluczowi Klienci
            </h3>
            <div className="space-y-4">
              {topClients.map((client, idx) => (
                <div key={idx} className="flex items-center justify-between pb-3 border-b border-white/5 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-gray-200">{client.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{client.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{client.volume}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400 uppercase tracking-wider">{client.health}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
