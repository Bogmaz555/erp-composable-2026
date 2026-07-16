"use client";

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { GanttChart, Upload, Download } from 'lucide-react';
import { usePMSchedule, useUpdateWBSElement } from '../../hooks/usePM';
import { ViewMode, type Task } from 'gantt-task-react';
// @ts-ignore
import 'gantt-task-react/dist/index.css';

const Gantt = dynamic(
  () => import('gantt-task-react').then((m) => m.Gantt),
  { ssr: false, loading: () => <p className="text-slate-500 text-sm p-4">Ładowanie Gantta…</p> },
);

export default function InteractiveGanttPanel({ projectId }: { projectId: string }) {
  const { data: schedule, isLoading, refetch } = usePMSchedule(projectId);
  const updateWbs = useUpdateWBSElement();
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);

  const tasks: Task[] = useMemo(() => {
    if (!schedule?.nodes?.length) return [];
    const base = schedule.nodes[0]?.startDate
      ? new Date(schedule.nodes[0].startDate)
      : new Date();
    return schedule.nodes.map((n, i) => {
      const start = n.startDate ? new Date(n.startDate) : new Date(base.getTime() + i * 86400000);
      const end = n.endDate ? new Date(n.endDate) : new Date(start.getTime() + (n.durationDays || 1) * 86400000);
      return {
        id: n.id,
        name: n.name,
        start,
        end,
        progress: n.status === 'DONE' || n.status === 'COMPLETED' ? 100 : 30,
        type: 'task',
        styles: {
          backgroundColor: n.isCritical ? '#e11d48' : '#4f46e5',
          progressColor: n.isCritical ? '#fb923c' : '#818cf8',
        },
      } as Task;
    });
  }, [schedule]);

  const handleDateChange = (task: Task) => {
    updateWbs.mutate(
      {
        id: task.id,
        startDate: task.start.toISOString(),
        endDate: task.end.toISOString(),
      },
      { onSuccess: () => refetch() },
    );
  };

  const handleExportXml = async () => {
    const res = await fetch(`/api/pm/projects/${projectId}/schedule/export-xml`);
    if (!res.ok) throw new Error('Export XML failed');
    const data = await res.json();
    const blob = new Blob([data.xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.filename || `project-${projectId}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportXml = async (file: File) => {
    const xml = await file.text();
    const res = await fetch(`/api/pm/projects/${projectId}/schedule/import-xml`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xml }),
    });
    if (!res.ok) throw new Error('Import XML failed');
    refetch();
  };

  const handleImportCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length < 2) return;
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const idIdx = header.findIndex((h) => h.includes('id'));
    const startIdx = header.findIndex((h) => h.includes('start'));
    const endIdx = header.findIndex((h) => h.includes('end'));
    for (const line of lines.slice(1)) {
      const cols = line.split(',').map((c) => c.trim());
      const id = idIdx >= 0 ? cols[idIdx] : cols[0];
      const start = startIdx >= 0 ? cols[startIdx] : cols[1];
      const end = endIdx >= 0 ? cols[endIdx] : cols[2];
      if (!id || !start) continue;
      await updateWbs.mutateAsync({
        id,
        startDate: new Date(start).toISOString(),
        endDate: end ? new Date(end).toISOString() : undefined,
      });
    }
    refetch();
  };

  if (isLoading || !schedule?.nodes?.length) return null;

  return (
    <div className="bg-slate-900/60 border border-violet-800/40 rounded-2xl p-6 mb-6 overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <GanttChart className="w-5 h-5 text-violet-400" />
          Gantt interaktywny
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === ViewMode.Day ? ViewMode.Week : ViewMode.Day)}
            className="px-3 py-1 text-xs rounded-lg border border-slate-700 text-slate-400 hover:text-white"
          >
            {viewMode === ViewMode.Day ? 'Tydzień' : 'Dzień'}
          </button>
          <label className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg border border-violet-700/50 text-violet-300 cursor-pointer hover:bg-violet-900/30">
            <Upload className="w-3.5 h-3.5" />
            CSV
            <input type="file" accept=".csv" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImportCsv(e.target.files[0])} />
          </label>
          <button
            type="button"
            onClick={() => handleExportXml()}
            className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg border border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/30"
          >
            <Download className="w-3.5 h-3.5" />
            Eksport XML
          </button>
          <label className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg border border-indigo-700/50 text-indigo-300 cursor-pointer hover:bg-indigo-900/30">
            <Upload className="w-3.5 h-3.5" />
            MS Project XML
            <input type="file" accept=".xml" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImportXml(e.target.files[0])} />
          </label>
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-3">Przeciągnij pasek zadania aby zmienić daty · CSV: id,start,end</p>
      <div className="min-w-[600px]">
        <Gantt
          tasks={tasks}
          viewMode={viewMode}
          onDateChange={handleDateChange}
          onProgressChange={() => {}}
          listCellWidth="155px"
          columnWidth={viewMode === ViewMode.Day ? 55 : 120}
          barCornerRadius={4}
          fontSize="12px"
          rowHeight={36}
          headerHeight={40}
          locale="pl-PL"
        />
      </div>
    </div>
  );
}
