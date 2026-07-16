import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface WBSElement {
  id: string;
  name: string;
  type: string;
  plannedCost: number;
  actualCost: number;
  isMilestone: boolean;
  startDate: string | null;
  endDate: string | null;
  status: string;
  children: WBSElement[];
}

export interface Project {
  id: string;
  name: string;
  totalBudget: number;
  status: string;
  budget?: number;
  ccpmBufferPct?: number;
  feverZone?: string;
  totalChainDays?: number;
  totalBufferDays?: number;
  usedBufferDays?: number;
  children: WBSElement[];
}

export function usePMProjects() {
  return useQuery<Project[]>({
    queryKey: ['pm-projects'],
    queryFn: async () => {
      const res = await fetch('/api/pm');
      if (!res.ok) throw new Error('Failed to fetch PM projects');
      return res.json();
    },
  });
}

// Function to recursively update a WBS node in the tree
const updateNodeInTree = (nodes: WBSElement[], nodeId: string, updateFn: (node: WBSElement) => WBSElement): WBSElement[] => {
  return nodes.map(node => {
    if (node.id === nodeId) {
      return updateFn(node);
    }
    if (node.children && node.children.length > 0) {
      return { ...node, children: updateNodeInTree(node.children, nodeId, updateFn) };
    }
    return node;
  });
};

export function useUpdateWBSElement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      startDate?: string | null;
      endDate?: string | null;
      actualCost?: number;
      isMilestone?: boolean;
    }) => {
      const { id, ...fields } = payload;
      const res = await fetch('/api/pm/wbs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates: fields }),
      });
      if (!res.ok) throw new Error('Failed to update WBS element');
      return res.json();
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['pm-projects'] });
      const previousProjects = queryClient.getQueryData<Project[]>(['pm-projects']);

      if (previousProjects) {
        queryClient.setQueryData<Project[]>(
          ['pm-projects'],
          previousProjects.map(project => ({
            ...project,
            children: updateNodeInTree(project.children, payload.id, (node) => ({
              ...node,
              startDate: payload.startDate !== undefined ? payload.startDate : node.startDate,
              endDate: payload.endDate !== undefined ? payload.endDate : node.endDate,
              actualCost: payload.actualCost !== undefined ? payload.actualCost : node.actualCost,
              isMilestone: payload.isMilestone !== undefined ? payload.isMilestone : node.isMilestone,
            }))
          }))
        );
      }
      return { previousProjects };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(['pm-projects'], context.previousProjects);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-projects'] });
    },
  });
}

export function useAddWBSElement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      projectId: string;
      parentId: string;
      name: string;
      type: string;
      plannedCost: number;
    }) => {
      const res = await fetch('/api/pm/wbs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to add WBS element');
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-projects'] });
    }
  });
}

export interface Task {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
  projectId: string;
  assigneeId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useProjectTasks(projectId: string) {
  return useQuery<Task[]>({
    queryKey: ['pm-tasks', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/pm/projects/${projectId}/tasks`);
      if (!res.ok) throw new Error('Failed to fetch project tasks');
      return res.json();
    },
    enabled: !!projectId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { projectId: string; title: string }) => {
      const res = await fetch(`/api/pm/projects/${payload.projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: payload.title }),
      });
      if (!res.ok) throw new Error('Failed to create task');
      return res.json();
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pm-tasks', variables.projectId] });
    },
  });
}

export function useRequestMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { projectId: string; taskId: string; sku: string; quantity: number }) => {
      const res = await fetch(`/api/pm/projects/${payload.projectId}/tasks/${payload.taskId}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: payload.sku, quantity: payload.quantity }),
      });
      if (!res.ok) throw new Error('Nie udało się zgłosić rezerwacji materiałowej');
      return res.json();
    },
    // We can invalidate pm-tasks or inventory later if needed
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inv-inventory'] }); // Or anywhere
    }
  });
}

export function useReleaseProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      const res = await fetch(`/api/pm/projects/${projectId}/release`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to release project');
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-projects'] });
    }
  });
}

export type MilestoneCode = 'FAT' | 'SAT' | 'SHIPMENT' | 'FINAL' | 'PREPAYMENT';

export interface ProjectEvm {
  projectId: string;
  plannedValue: number;
  earnedValue: number;
  actualCost: number;
  percentComplete: number;
  cpi: number;
  spi: number;
  cpiStatus: 'GREEN' | 'AMBER' | 'RED';
  spiStatus: 'GREEN' | 'AMBER' | 'RED';
}

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

export interface ProjectSchedule {
  projectId: string;
  projectName: string;
  totalDurationDays: number;
  criticalPath: string[];
  nodes: ScheduleNode[];
}

export function usePMSchedule(projectId: string) {
  return useQuery<ProjectSchedule>({
    queryKey: ['pm-schedule', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/pm/projects/${projectId}/schedule`);
      if (!res.ok) throw new Error('Błąd harmonogramu');
      return res.json();
    },
    enabled: !!projectId,
    refetchInterval: 20000,
  });
}

export function usePMEvm(projectId: string) {
  return useQuery<ProjectEvm>({
    queryKey: ['pm-evm', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/pm/projects/${projectId}/evm`);
      if (!res.ok) throw new Error('Błąd pobierania EVM');
      return res.json();
    },
    enabled: !!projectId,
    refetchInterval: 12000,
  });
}

export interface BaselineCompare {
  baselineId?: string;
  baselineName?: string;
  baselineDuration: number;
  currentDuration: number;
  durationVariance: number;
  variances: Array<{ id: string; name: string; slipDays: number; status: string }>;
  error?: string;
}

export function usePMBaselineCompare(projectId: string) {
  return useQuery<BaselineCompare>({
    queryKey: ['pm-baseline-compare', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/pm/projects/${projectId}/baseline/compare`);
      if (!res.ok) throw new Error('Błąd baseline');
      return res.json();
    },
    enabled: !!projectId,
    refetchInterval: 30000,
  });
}

export function useCreatePMBaseline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { projectId: string; name?: string }) => {
      const res = await fetch(`/api/pm/projects/${payload.projectId}/baseline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: payload.name, createdBy: 'pm-ui' }),
      });
      if (!res.ok) throw new Error('Błąd zapisu baseline');
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pm-baseline-compare', vars.projectId] });
      qc.invalidateQueries({ queryKey: ['pm-schedule', vars.projectId] });
    },
  });
}

export function usePMResourceLevel() {
  return useMutation({
    mutationFn: async (projectId: string) => {
      const res = await fetch(`/api/pm/projects/${projectId}/resources/level`, { method: 'POST' });
      if (!res.ok) throw new Error('Błąd resource leveling');
      return res.json();
    },
  });
}

export function useReachMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      projectId: string;
      milestone: MilestoneCode;
      amount: number;
      percent?: number;
    }) => {
      const res = await fetch(
        `http://localhost:4005/api/pm/projects/${payload.projectId}/milestones/${payload.milestone}/reach`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: payload.amount, percent: payload.percent }),
        },
      );
      if (!res.ok) throw new Error('Nie udało się zarejestrować kamienia milowego');
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['fin-milestones'] });
      queryClient.invalidateQueries({ queryKey: ['pm-projects'] });
    },
  });
}
