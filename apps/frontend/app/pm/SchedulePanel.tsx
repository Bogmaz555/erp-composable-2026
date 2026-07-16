"use client";

import React from 'react';
import { GanttChart, AlertTriangle } from 'lucide-react';
import { usePMSchedule } from '../../hooks/usePM';

export default function SchedulePanel({ projectId }: { projectId: string }) {
  const { data: schedule, isLoading } = usePMSchedule(projectId);

  if (isLoading) return <p className="text-slate-500 text-sm p-4">Ładowanie harmonogramu...</p>;
  if (!schedule?.nodes?.length) return null;

  const maxEnd = schedule.nodes.reduce((m, n) => {
    const e = n.endDate ? new Date(n.endDate).getTime() : 0;
    return Math.max(m, e);
  }, 0);
  const minStart = schedule.nodes.reduce((m, n) => {
    const s = n.startDate ? new Date(n.startDate).getTime() : Date.now();
    return Math.min(m, s);
  }, Date.now());
  const span = Math.max(maxEnd - minStart, 86400000);

  return (
    <div className="bg-slate-900/60 border border-indigo-800/40 rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
        <GanttChart className="w-5 h-5 text-indigo-400" />
        Ścieżka krytyczna
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        Czas łańcucha: {schedule.totalDurationDays} dni · węzłów krytycznych: {schedule.criticalPath.length}
      </p>
      <div className="space-y-2">
        {schedule.nodes.map((n) => {
          const left = n.startDate
            ? ((new Date(n.startDate).getTime() - minStart) / span) * 100
            : 0;
          const width = n.endDate && n.startDate
            ? ((new Date(n.endDate).getTime() - new Date(n.startDate).getTime()) / span) * 100
            : 5;
          return (
            <div key={n.id} className="flex items-center gap-3 text-sm">
              <div className="w-40 truncate text-slate-300 flex items-center gap-1">
                {n.isCritical && <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />}
                {n.name}
              </div>
              <div className="flex-1 h-6 bg-slate-950 rounded relative overflow-hidden border border-slate-800">
                <div
                  className={`absolute top-0.5 bottom-0.5 rounded ${
                    n.isCritical
                      ? 'bg-gradient-to-r from-rose-600 to-orange-500'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 opacity-60'
                  }`}
                  style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
                  title={`${n.durationDays}d · float ${n.floatDays}d`}
                />
              </div>
              <span className="text-xs font-mono text-slate-500 w-12">{n.durationDays}d</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
