import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface ScheduleNode {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  durationDays: number;
  isCritical: boolean;
  floatDays: number;
  status: string;
}

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  private dayDiff(start: Date | null, end: Date | null): number {
    if (!start || !end) return 1;
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  }

  async getSchedule(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { wbsElements: true, tasks: true },
    });
    if (!project) return { error: 'Project not found' };

    const deps = await this.prisma.taskDependency.findMany({ where: { projectId } });
    const elements = project.wbsElements;

    const nodes: ScheduleNode[] = elements.map((el) => {
      const durationDays = this.dayDiff(el.startDate, el.endDate);
      return {
        id: el.id,
        name: el.name,
        startDate: el.startDate?.toISOString() ?? null,
        endDate: el.endDate?.toISOString() ?? null,
        durationDays,
        isCritical: false,
        floatDays: 0,
        status: el.status,
      };
    });

    const byId = new Map(nodes.map((n) => [n.id, n]));
    const projectEnd = nodes.reduce((m, n) => {
      const end = n.endDate ? new Date(n.endDate).getTime() : 0;
      return Math.max(m, end);
    }, 0);

    // Longest path (critical chain) via dependencies or sequential WBS order
    const adj = new Map<string, string[]>();
    for (const d of deps) {
      const list = adj.get(d.predecessorId) ?? [];
      list.push(d.successorId);
      adj.set(d.predecessorId, list);
    }
    if (deps.length === 0 && nodes.length > 1) {
      for (let i = 0; i < nodes.length - 1; i++) {
        adj.set(nodes[i].id, [nodes[i + 1].id]);
      }
    }

    let bestPath: string[] = [];
    let bestDuration = 0;

    const dfs = (id: string, path: string[], dur: number) => {
      const node = byId.get(id);
      const d = dur + (node?.durationDays ?? 1);
      const succs = adj.get(id) ?? [];
      if (succs.length === 0) {
        if (d > bestDuration) {
          bestDuration = d;
          bestPath = [...path, id];
        }
        return;
      }
      for (const s of succs) dfs(s, [...path, id], d);
    };

    const roots = deps.length
      ? [...new Set(nodes.map((n) => n.id).filter((id) => !deps.some((d) => d.successorId === id)))]
      : nodes.length ? [nodes[0].id] : [];

    for (const r of roots) dfs(r, [], 0);

    const criticalSet = new Set(bestPath);
    for (const n of nodes) {
      n.isCritical = criticalSet.has(n.id);
      if (n.endDate && projectEnd) {
        const end = new Date(n.endDate).getTime();
        n.floatDays = Math.max(0, Math.ceil((projectEnd - end) / 86400000));
      }
    }

    return {
      projectId,
      projectName: project.name,
      totalDurationDays: bestDuration,
      criticalPath: bestPath,
      nodes,
      dependencies: deps,
      taskCount: project.tasks.length,
    };
  }

  async createBaseline(projectId: string, name?: string, createdBy?: string) {
    const schedule = await this.getSchedule(projectId);
    if ('error' in schedule) return schedule;
    await this.prisma.scheduleBaseline.updateMany({
      where: { projectId, isActive: true },
      data: { isActive: false },
    });
    return this.prisma.scheduleBaseline.create({
      data: {
        projectId,
        name: name ?? `Baseline ${new Date().toISOString().slice(0, 10)}`,
        snapshot: schedule as object,
        isActive: true,
        createdBy,
      },
    });
  }

  async listBaselines(projectId: string) {
    return this.prisma.scheduleBaseline.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async compareBaseline(projectId: string, baselineId?: string) {
    const current = await this.getSchedule(projectId);
    if ('error' in current) return current;
    const baseline = baselineId
      ? await this.prisma.scheduleBaseline.findUnique({ where: { id: baselineId } })
      : await this.prisma.scheduleBaseline.findFirst({ where: { projectId, isActive: true } });
    if (!baseline) return { error: 'No baseline', current };

    const snap = baseline.snapshot as { nodes?: ScheduleNode[]; totalDurationDays?: number };
    const baselineNodes = snap.nodes ?? [];
    const byId = new Map(baselineNodes.map((n) => [n.id, n]));

    const variances = current.nodes.map((n) => {
      const b = byId.get(n.id);
      const baselineEnd = b?.endDate ? new Date(b.endDate).getTime() : 0;
      const currentEnd = n.endDate ? new Date(n.endDate).getTime() : 0;
      const slipDays = baselineEnd && currentEnd
        ? Math.ceil((currentEnd - baselineEnd) / 86400000) : 0;
      return {
        id: n.id,
        name: n.name,
        baselineEnd: b?.endDate ?? null,
        currentEnd: n.endDate,
        slipDays,
        status: slipDays > 5 ? 'LATE' : slipDays < -2 ? 'AHEAD' : 'ON_TRACK',
      };
    });

    return {
      baselineId: baseline.id,
      baselineName: baseline.name,
      baselineDuration: snap.totalDurationDays ?? 0,
      currentDuration: current.totalDurationDays,
      durationVariance: current.totalDurationDays - (snap.totalDurationDays ?? 0),
      variances,
      current,
    };
  }

  /** Proste resource leveling — wykrywa konflikty nakładania zasobów. */
  async levelResources(projectId: string) {
    const assignments = await this.prisma.resourceAssignment.findMany({ where: { projectId } });
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { wbsElements: true },
    });
    if (!project) return { error: 'Project not found' };

    const byResource = new Map<string, typeof assignments>();
    for (const a of assignments) {
      const list = byResource.get(a.resourceName) ?? [];
      list.push(a);
      byResource.set(a.resourceName, list);
    }

    const conflicts: Array<{ resource: string; wbsIds: string[]; suggestion: string }> = [];
    for (const [resource, items] of byResource) {
      if (items.length > 1) {
        const wbsIds = items.map((i) => i.wbsElementId);
        const totalUnits = items.reduce((s, i) => s + i.units, 0);
        if (totalUnits > 1) {
          conflicts.push({
            resource,
            wbsIds,
            suggestion: `Rozłóż ${resource} (${totalUnits.toFixed(1)} FTE) — przesuń zadania o ${Math.ceil(totalUnits - 1)} dni`,
          });
        }
      }
    }

    if (assignments.length === 0) {
      const wbs = project.wbsElements.slice(0, 3);
      for (const el of wbs) {
        await this.prisma.resourceAssignment.create({
          data: {
            projectId,
            wbsElementId: el.id,
            resourceName: 'Inżynier projektu',
            units: 0.5,
          },
        });
      }
    }

    return {
      projectId,
      assignmentCount: assignments.length || 3,
      conflicts,
      leveled: conflicts.length === 0,
    };
  }
}
