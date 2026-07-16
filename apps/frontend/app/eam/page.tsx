"use client";

import { useEam } from "../../hooks/useEam";
import { useState } from "react";
import { Plus, HardHat, Wrench, Settings, Radio } from "lucide-react";

export default function EAMPage() {
  const { equipmentList, tasks, iotStatus, recentBreakdowns, loading, createEquipment, createMaintenanceTask, reportBreakdown } = useEam();
  const [showEqModal, setShowEqModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  
  const [newEq, setNewEq] = useState({ name: '', model: '', serialNumber: '', location: '' });
  const [newTask, setNewTask] = useState({ equipmentId: '', type: 'PREVENTIVE' as 'PREVENTIVE' | 'CORRECTIVE' | 'CALIBRATION', description: '', scheduledDate: '' });

  if (loading) return <div className="text-white p-8">Ładowanie EAM...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <HardHat className="text-yellow-500 w-8 h-8" /> 
            Enterprise Asset Management
          </h1>
          <p className="text-slate-400 mt-2">Zarządzanie parkiem maszynowym i predykcyjne utrzymanie ruchu.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setShowEqModal(true)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Dodaj Maszynę
          </button>
          <button onClick={() => setShowTaskModal(true)} className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
            <Wrench className="w-4 h-4" /> Zaplanuj Przegląd
          </button>
        </div>
      </div>

      {iotStatus && (
        <div className="bg-slate-900/80 border border-yellow-500/30 rounded-xl p-5 flex flex-wrap gap-6 items-center">
          <div className="flex items-center gap-2 text-yellow-400 font-bold">
            <Radio className="w-5 h-5" /> IoT Lite — predykcyjne utrzymanie
          </div>
          <div className="text-sm text-slate-300">
            Maszyny: <span className="text-white font-bold">{iotStatus.equipmentTotal}</span>
            {' · '}Awaria: <span className="text-red-400 font-bold">{iotStatus.brokenCount}</span>
            {' · '}Zdarzenia 7d: <span className="text-white font-bold">{iotStatus.breakdownsLast7d}</span>
          </div>
          {recentBreakdowns.length > 0 && (
            <div className="w-full mt-2 border-t border-slate-800 pt-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Ostatnie awarie IoT</p>
              <div className="flex flex-wrap gap-2">
                {recentBreakdowns.map((b) => (
                  <span key={b.id} className="text-xs px-2 py-1 rounded bg-red-950/50 border border-red-800 text-red-200">
                    {b.equipment?.name || b.equipmentId}: {b.reason.slice(0, 40)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings className="w-5 h-5 text-slate-400"/> Park Maszynowy</h2>
          {equipmentList.map(eq => (
            <div key={eq.id} className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg hover:border-yellow-500/50 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white text-lg">{eq.name}</h3>
                  <p className="text-slate-400 text-sm mt-1">Model: {eq.model || 'Brak'} | SN: {eq.serialNumber || 'Brak'}</p>
                  <p className="text-slate-500 text-xs mt-1">Lokalizacja: {eq.location || 'Nieznana'}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    eq.status === 'OPERATIONAL' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    eq.status === 'MAINTENANCE' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                    'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {eq.status}
                  </span>
                  {eq.status !== 'BROKEN' && (
                    <button
                      type="button"
                      onClick={() => reportBreakdown(eq.id, 'IoT anomaly — vibration threshold')}
                      className="text-xs px-2 py-1 rounded bg-red-900/50 border border-red-700 text-red-200 hover:bg-red-800/60"
                    >
                      Zgłoś awarię (IoT)
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {equipmentList.length === 0 && <p className="text-slate-500 italic">Brak zarejestrowanych maszyn.</p>}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Wrench className="w-5 h-5 text-slate-400"/> Harmonogram Prac (Work Orders EAM)</h2>
          {tasks.map(task => (
            <div key={task.id} className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg border-l-4 border-l-yellow-600">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white">{task.type} - {task.equipment?.name}</h3>
                  <p className="text-slate-300 text-sm mt-2">{task.description}</p>
                  <p className="text-slate-500 text-xs mt-2">Zaplanowano: {new Date(task.scheduledDate).toLocaleDateString()}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-bold rounded ${
                  task.status === 'COMPLETED' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}>
                  {task.status}
                </span>
              </div>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-slate-500 italic">Brak zaplanowanych prac serwisowych.</p>}
        </div>
      </div>

      {showEqModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Rejestracja Maszyny</h3>
            <input placeholder="Nazwa" className="w-full bg-slate-950 border border-slate-800 rounded p-2 mb-3 text-white" 
              value={newEq.name} onChange={e => setNewEq({...newEq, name: e.target.value})} />
            <input placeholder="Model" className="w-full bg-slate-950 border border-slate-800 rounded p-2 mb-3 text-white" 
              value={newEq.model} onChange={e => setNewEq({...newEq, model: e.target.value})} />
            <input placeholder="Serial Number" className="w-full bg-slate-950 border border-slate-800 rounded p-2 mb-3 text-white" 
              value={newEq.serialNumber} onChange={e => setNewEq({...newEq, serialNumber: e.target.value})} />
            <input placeholder="Lokalizacja (Hala/Gniazdo)" className="w-full bg-slate-950 border border-slate-800 rounded p-2 mb-4 text-white" 
              value={newEq.location} onChange={e => setNewEq({...newEq, location: e.target.value})} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowEqModal(false)} className="px-4 py-2 text-slate-400 hover:text-white">Anuluj</button>
              <button onClick={() => { createEquipment(newEq); setShowEqModal(false); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold">Zapisz</button>
            </div>
          </div>
        </div>
      )}

      {showTaskModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Planowanie Przeglądu</h3>
            <select className="w-full bg-slate-950 border border-slate-800 rounded p-2 mb-3 text-white" 
              value={newTask.equipmentId} onChange={e => setNewTask({...newTask, equipmentId: e.target.value})}>
              <option value="">Wybierz maszynę...</option>
              {equipmentList.map(eq => <option key={eq.id} value={eq.id}>{eq.name} ({eq.serialNumber})</option>)}
            </select>
            <select className="w-full bg-slate-950 border border-slate-800 rounded p-2 mb-3 text-white" 
              value={newTask.type} onChange={e => setNewTask({...newTask, type: e.target.value as any})}>
              <option value="PREVENTIVE">Prewencyjny (Preventive)</option>
              <option value="CORRECTIVE">Naprawczy (Corrective)</option>
              <option value="CALIBRATION">Kalibracja</option>
            </select>
            <textarea placeholder="Opis zadania" className="w-full bg-slate-950 border border-slate-800 rounded p-2 mb-3 text-white" 
              value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
            <input type="date" className="w-full bg-slate-950 border border-slate-800 rounded p-2 mb-4 text-white" 
              value={newTask.scheduledDate} onChange={e => setNewTask({...newTask, scheduledDate: e.target.value})} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-slate-400 hover:text-white">Anuluj</button>
              <button onClick={() => { createMaintenanceTask(newTask); setShowTaskModal(false); }} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded font-bold">Zaplanuj</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
