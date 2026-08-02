"use client";

import React, { useState } from 'react';
import { Send, Bot, FileText, Settings, Zap, History, Bell, CheckCircle, XCircle } from 'lucide-react';
import { useNotifications } from '../hooks/usePlatform';

export default function CommandCenterAI() {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'agent', content: 'Witaj Dowódco! Jestem głównym Agentem Systemowym. Mam wgląd w architekturę Meilisearch, logi NATS i stan workflowów Temporal. W czym mogę pomóc?' }
  ]);

  const { data } = useNotifications();
  const approvals = data?.items?.filter((n: any) => n.title.includes('Oczekuje na zatwierdzenie')) || [
    { id: '1', title: 'Margines Poniżej Progu', body: 'Projekt ETO: 2d21d569 wymaga akceptacji marży 12%', level: 'critical' },
    { id: '2', title: 'Brak Zasobów', body: 'Spawanie TIG (Zlecenie #WO-99) nałożone na niedobór kadrowy', level: 'warning' }
  ];

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setQuery('');
    setIsProcessing(true);

    // Simulate Agent calling MCP tools
    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: 'system',
      content: '[Agent] Uruchamiam MCP Tool: search_rag_context ("Czy mamy wąskie gardła w projekcie Ruukki?")',
      timestamp: new Date()
    }]);
    
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        role: 'system',
        content: '[Agent] Uruchamiam MCP Tool: query_pm_status (Projekt: 2d21d569)',
        timestamp: new Date()
      }]);
    }, 1000);

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 3).toString(),
        role: 'system',
        content: '[Agent] Uruchamiam MCP Tool: check_hr_availability (Umiejętność: WELDING_TIG)',
        timestamp: new Date()
      }]);
    }, 2000);

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 4).toString(),
        role: 'ai',
        content: 'MELDUNEK OPERACYJNY:\n\n1. **Zgodność (RAG):** Norma 9001 wymaga uprawnień TIG dla ram nośnych.\n2. **Status (PM):** Projekt ETO (Ruukki) posiada zablokowany Work Order #WO-99 z powodu braku personelu na nocnej zmianie.\n3. **Kadry (HR):** Spawacz Jan Kowalski (WELDING_TIG) jest dostępny.\n\n**Rekomendacja:** Alokować Jana Kowalskiego do #WO-99 na nocną zmianę. Czy mam wysłać sygnał do Temporal.io o odblokowaniu zadania?',
        timestamp: new Date()
      }]);
      setIsProcessing(false);
    }, 3500);
  };

  return (
    <div className="flex h-full w-full gap-6">
      {/* LEFT PANEL: Temporal Approvals & Context */}
      <div className="w-1/3 flex flex-col gap-6">
        <div className="glass-panel p-6 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-semibold text-white">Temporal Approvals</h3>
            </div>
            <span className="bg-rose-500/20 text-rose-400 text-xs font-bold px-2 py-1 rounded-full">{approvals.length} Oczekujące</span>
          </div>
          
          <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1">
            {approvals.map((a: any) => (
              <div key={a.id} className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 transition-all hover:border-indigo-500/30 group">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-200">{a.title}</h4>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-green-400 hover:text-green-300"><CheckCircle className="w-4 h-4" /></button>
                    <button className="text-rose-400 hover:text-rose-300"><XCircle className="w-4 h-4" /></button>
                  </div>
                </div>
                <p className="text-xs text-slate-400">{a.body}</p>
              </div>
            ))}
            {approvals.length === 0 && <p className="text-sm text-slate-500 italic">Brak zablokowanych procesów. Wszystkie workflowy w toku.</p>}
          </div>
        </div>

        <div className="glass-panel p-6 h-1/3">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Aktywne Wektory Wiedzy
          </h3>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-slate-300">Normy_ISO_9001.pdf</span>
            <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-slate-300">Certyfikaty_Spawalnicze_DB</span>
            <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-slate-300">Historia_Zdarzen_NATS</span>
            <span className="px-2 py-1 bg-white/5 border border-indigo-500/30 rounded text-xs text-indigo-300">+ Dodaj Źródło (MCP)</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: RAG Agent Interface */}
      <div className="flex-1 glass-panel flex flex-col relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-slate-800/50 flex items-center justify-between z-10 bg-slate-900/40 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center p-[2px]">
              <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Google Antigravity Agent</h2>
              <p className="text-xs text-indigo-400 font-mono">Wspomagany przez Meilisearch RAG</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="p-2 text-slate-400 hover:text-white transition-colors rounded hover:bg-white/5"><History className="w-4 h-4" /></button>
            <button className="p-2 text-slate-400 hover:text-white transition-colors rounded hover:bg-white/5"><Settings className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 z-10 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl p-4 ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-sm'
                  : msg.role === 'system' 
                  ? 'bg-slate-900 border border-slate-800 text-slate-400 font-mono text-xs rounded-tl-sm w-full'
                  : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm'
              }`}>
                {msg.role === 'system' ? (
                  <div className="flex items-center gap-2">
                    <Settings className="w-3 h-3 text-indigo-500 animate-spin" />
                    <span>{msg.content}</span>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex w-full justify-start">
              <div className="bg-slate-800 border border-slate-700 text-slate-200 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-xs text-slate-400 ml-2">Wektoryzacja i odpytywanie wiedzy...</span>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-6 pt-0 z-10">
          <form onSubmit={handleAsk} className="relative flex items-center">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Zapytaj Agenta o stan produkcji, zablokowane projekty lub certyfikaty..."
              className="w-full bg-slate-900 border border-slate-700 rounded-full py-4 pl-6 pr-14 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
            />
            <button 
              type="submit" 
              disabled={!query.trim() || isProcessing}
              className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-full transition-colors flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="mt-2 text-center flex justify-center items-center gap-1">
             <span className="text-[10px] text-slate-500">Naciśnij <kbd className="bg-slate-800 border border-slate-700 px-1 rounded">Enter</kbd> aby wysłać. </span>
             <span className="text-[10px] text-slate-500">Skrót <kbd className="bg-slate-800 border border-slate-700 px-1 rounded">⌘K</kbd> wywołuje szybki kontekst na całej platformie.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
