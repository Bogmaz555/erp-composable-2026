"use client"

import React, { useState, useEffect } from 'react'
import ModuleKpiGrid from '../components/ModuleKpiGrid'
import CommandCenterPanel from '../components/CommandCenterPanel'
import TenantIsolationPanel from '../components/TenantIsolationPanel'
import TraceabilitySpinePanel from '../components/TraceabilitySpinePanel'
import EtoChainPanel from '../components/EtoChainPanel'
import ProductionReadinessPanel from '../components/ProductionReadinessPanel'
import {
  Activity,
  BarChart3,
  Boxes,
  Cpu,
  Factory,
  Gauge,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Zap
} from 'lucide-react'

export default function PremiumDashboard() {
  const [activeTab, setActiveTab] = useState('Overview')
  
  const [mps, setMps] = useState(0)
  const [activeServices, setActiveServices] = useState(0)
  const [chartData, setChartData] = useState<number[]>(Array(20).fill(5))
  const [totalEvents, setTotalEvents] = useState(0)
  const [topEvents, setTopEvents] = useState<{ eventType: string; count: number }[]>([])

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:4005/api/analytics/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'TELEMETRY_STATS') {
          setMps(data.mps);
          setActiveServices(data.activeServices);
          
          // Update chart bars with a random-looking but MPS-driven value, or just use MPS
          // If MPS is low, we can visually boost it for effect or just show exact value
          setChartData(prev => {
            const newBars = [...prev.slice(1), data.mps > 0 ? Math.min(100, Math.max(10, data.mps * 2)) : 5];
            return newBars;
          });
        } else if (data.type === 'NATS_EVENT') {
          // You could show a live feed of events here if you wanted
        }
      } catch (err) {
        console.error("Failed to parse SSE data", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadCounters = async () => {
      try {
        const res = await fetch('http://localhost:4005/api/analytics/counters');
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setTotalEvents(data.totalEvents ?? 0);
        setTopEvents((data.byEvent ?? []).slice(0, 6));
      } catch {
        /* analytics offline — non-fatal */
      }
    };
    loadCounters();
    const id = setInterval(loadCounters, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const metrics = [
    { id: 1, label: 'KSeF Gateway Status', val: 'Online', icon: ShieldCheck, color: 'text-green-400' },
    { id: 2, label: 'NATS Messages/s', val: mps.toString(), icon: Zap, color: 'text-yellow-400' },
    { id: 3, label: 'Total Events', val: totalEvents.toLocaleString(), icon: Gauge, color: 'text-purple-400' },
    { id: 4, label: 'Active Microservices', val: `${activeServices}/11`, icon: Cpu, color: 'text-cyan-400' },
  ];

  return (
    <div className="flex h-screen w-full relative z-10 p-4 gap-6 text-foreground">
      
      {/* SIDEBAR */}
      <aside className="w-64 glass-panel flex flex-col justify-between py-6 px-4 animate-fade-in z-20">
        <div>
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.5)]">
              <Factory className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">ERP MAX SPEED</h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Ultimate Edition</p>
            </div>
          </div>
          
          <nav className="space-y-2">
            {[
              { icon: LayoutDashboard, label: 'Overview' },
              { icon: Activity, label: 'Live Telemetry' },
              { icon: Boxes, label: 'PBC Modules' },
              { icon: BarChart3, label: 'APS Gantt' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => setActiveTab(item.label)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium
                  ${activeTab === item.label 
                    ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-white shadow-[inset_0_1px_rgba(255,255,255,0.1)] border border-indigo-500/30' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}
                `}
              >
                <item.icon className="w-5 h-5 opacity-80" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="mt-8 px-4">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent">
            <Settings className="w-5 h-5 opacity-80" />
            <span className="text-sm font-medium">System Core</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col gap-6 overflow-hidden pr-2 z-20 animate-fade-in" style={{ animationDelay: '100ms' }}>
        
        {/* TOP NAVBAR / HEADER */}
        <header className="glass-panel h-20 flex items-center justify-between px-8">
          <div>
            <h2 className="text-xl font-semibold text-white tracking-wide">
              {activeTab} Workspace
            </h2>
            <p className="text-sm text-gray-400">Next.js 15 Native + Zero Trust Mesh Running</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">All Systems Operational</span>
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-fuchsia-500 p-[2px]">
              <div className="h-full w-full rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/10">
                <span className="text-xs font-bold">OP</span>
              </div>
            </div>
          </div>
        </header>

        <CommandCenterPanel />

        <ProductionReadinessPanel />

        <TenantIsolationPanel />

        <TraceabilitySpinePanel />

        <EtoChainPanel />

        <ModuleKpiGrid />

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
          {metrics.map((m, idx) => (
             <div key={m.id} className="glass-panel glass-hover p-6 flex items-center justify-between group cursor-pointer" style={{ animationDelay: `${250 + idx * 50}ms` }}>
               <div>
                  <p className="text-sm text-gray-400 mb-1 font-medium">{m.label}</p>
                  <h3 className="text-3xl font-bold tracking-tight text-white group-hover:bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all">{m.val}</h3>
               </div>
               <div className={`p-4 rounded-xl bg-white/5 border border-white/5 ${m.color}`}>
                 <m.icon className="w-6 h-6" />
               </div>
             </div>
          ))}
        </div>

        {/* LARGE CHART / MAIN PANEL */}
        <div className="flex-1 glass-panel glass-hover p-6 flex flex-col relative overflow-hidden animate-slide-up" style={{ animationDelay: '400ms' }}>
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
           
           <div className="flex items-center justify-between mb-8 z-10">
             <div>
               <h3 className="text-lg font-semibold text-white">Event Sourcing Telemetry</h3>
               <p className="text-sm text-gray-400">Real-time command & event flow from NATS JetStream</p>
             </div>
             <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors glass-active">
               Export Trace
             </button>
           </div>
           
           {/* Mockup Chart Area */}
           <div className="flex-1 rounded-xl border border-white/5 bg-black/20 flex items-end justify-between p-8 gap-2 z-10 relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
              
              {/* Live chart bars */}
              {chartData.map((height, i) => (
                <div key={i} className="w-full bg-gradient-to-t from-indigo-600/50 to-purple-400/80 rounded-t-sm group relative transition-all duration-300 ease-in-out" style={{ height: `${height}%`, opacity: 0.8 }}>
                   <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
           </div>

           {/* Top event types (aggregated counters) */}
           {topEvents.length > 0 && (
             <div className="mt-4 z-10 flex flex-wrap gap-2">
               {topEvents.map((e) => (
                 <span key={e.eventType} className="px-3 py-1 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-gray-300">
                   <span className="font-mono text-indigo-300">{e.eventType}</span>
                   <span className="ml-2 text-white font-bold">{e.count}</span>
                 </span>
               ))}
             </div>
           )}
        </div>

      </main>
    </div>
  )
}
