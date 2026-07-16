"use client";

import React, { useEffect, useState } from 'react';
import { useQuality } from '../../hooks/useQuality';
import { Activity, ShieldAlert, PlusCircle, Target } from 'lucide-react';
import ControlPlansPanel from './ControlPlansPanel';
import SpcPanel from './SpcPanel';
import IsoDocumentsPanel from './IsoDocumentsPanel';

export default function QualityDashboard() {
  const { inspections, ncrs, capa, isLoading, fetchInspections, fetchNcrs, fetchCapa, createInspection, createNcr, closeNcr, createCapa, updateCapaStatus } = useQuality();

  useEffect(() => {
    fetchInspections();
    fetchNcrs();
    fetchCapa();
  }, [fetchInspections, fetchNcrs, fetchCapa]);

  const handleCreateInspection = async () => {
    await createInspection({
      referenceId: `WO-${Math.floor(Math.random() * 1000)}`,
      type: 'IN_PROCESS',
      status: Math.random() > 0.5 ? 'PASSED' : 'FAILED',
      notes: 'Initial inspection',
    });
  };

  const handleCreateNcr = async () => {
    await createNcr({
      inspectionId: inspections[0]?.id || `INSP-${Math.floor(Math.random() * 10000)}`,
      defectDescription: 'Surface scratches exceeding tolerance limit.',
      severity: 'HIGH',
    });
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Target className="w-8 h-8 text-blue-500" />
            Quality Assurance
          </h1>
          <p className="text-slate-400 mt-2">Manage Inspections and Non-Conformance Reports</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleCreateInspection}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors border border-slate-700"
            disabled={isLoading}
          >
            <PlusCircle className="w-4 h-4" /> New Inspection
          </button>
          <button
            onClick={handleCreateNcr}
            className="flex items-center gap-2 bg-red-900/50 hover:bg-red-900 text-red-200 px-4 py-2 rounded-lg transition-colors border border-red-800"
            disabled={isLoading}
          >
            <ShieldAlert className="w-4 h-4" /> New NCR
          </button>
        </div>
      </div>

      <ControlPlansPanel />

      <div className="mt-8">
        <SpcPanel />
      </div>

      <IsoDocumentsPanel />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Recent Inspections
          </h2>
          <div className="space-y-4">
            {inspections.length === 0 ? (
              <p className="text-slate-500">No inspections found.</p>
            ) : (
              inspections.map((insp) => (
                <div key={insp.id} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-white">{insp.type}</h3>
                    <p className="text-sm text-slate-400">Ref: {insp.referenceId}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    insp.status === 'PASSED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    insp.status === 'FAILED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}>
                    {insp.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            Non-Conformance Reports (NCR)
          </h2>
          <div className="space-y-4">
            {ncrs.length === 0 ? (
              <p className="text-slate-500">No NCRs found.</p>
            ) : (
              ncrs.map((ncr) => (
                <div key={ncr.id} className="bg-slate-950 border border-slate-800 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-white">{ncr.inspectionId ? `Insp: ${ncr.inspectionId.substring(0, 8)}` : 'ANDON (MES)'}</h3>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        ncr.status === 'CLOSED' ? 'bg-slate-700 text-slate-300 border border-slate-600' :
                        'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {ncr.status || 'OPEN'}
                      </span>
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        ncr.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        ncr.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {ncr.severity}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400">{ncr.defectDescription}</p>
                  {ncr.bomComponentId && (
                    <p className="text-xs font-mono text-slate-500 mt-1">BOM: {ncr.bomComponentId.slice(0, 12)}…</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ncr.status !== 'CLOSED' && (
                      <button
                        type="button"
                        onClick={() => closeNcr(ncr.id, 'REWORK_APPROVED')}
                        disabled={isLoading}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 hover:bg-emerald-800/50"
                      >
                        Zamknij NCR
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        createCapa(ncr.id, {
                          description: `Root-cause analysis for NCR ${ncr.id.slice(0, 8)}`,
                          type: 'CORRECTIVE',
                          assignee: 'quality.lead',
                          dueDate: new Date(Date.now() + 7 * 864e5).toISOString(),
                        })
                      }
                      disabled={isLoading}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-900/40 border border-blue-700/50 text-blue-300 hover:bg-blue-800/50"
                    >
                      + CAPA
                    </button>
                  </div>
                  {capa.filter((c) => c.ncrId === ncr.id).length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                      {capa
                        .filter((c) => c.ncrId === ncr.id)
                        .map((c) => (
                          <div key={c.id} className="flex items-center justify-between text-xs">
                            <span className="text-slate-300">
                              <span className="font-mono text-blue-300">{c.type}</span>
                              {c.assignee ? ` · ${c.assignee}` : ''}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded ${
                                  c.status === 'VERIFIED'
                                    ? 'bg-green-500/20 text-green-300'
                                    : c.status === 'DONE'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : c.status === 'IN_PROGRESS'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                {c.status}
                              </span>
                              {c.status !== 'VERIFIED' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateCapaStatus(
                                      c.id,
                                      c.status === 'OPEN'
                                        ? 'IN_PROGRESS'
                                        : c.status === 'IN_PROGRESS'
                                        ? 'DONE'
                                        : 'VERIFIED',
                                    )
                                  }
                                  disabled={isLoading}
                                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
                                >
                                  →
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
