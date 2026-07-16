import { useState, useEffect } from 'react';

export interface Equipment {
  id: string;
  name: string;
  model: string | null;
  serialNumber: string | null;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'BROKEN' | 'DECOMMISSIONED';
  location: string | null;
}

export interface MaintenanceTask {
  id: string;
  equipmentId: string;
  type: 'PREVENTIVE' | 'CORRECTIVE' | 'CALIBRATION';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  description: string;
  scheduledDate: string;
  completedDate: string | null;
  equipment?: Equipment;
}

export interface IotStatus {
  source: string;
  equipmentTotal: number;
  brokenCount: number;
  breakdownsLast7d: number;
  iotEnabled: boolean;
}

export interface BreakdownEvent {
  id: string;
  equipmentId: string;
  reason: string;
  severity: string;
  source: string;
  detectedAt: string;
  equipment?: { name: string; serialNumber: string | null; location: string | null };
}

export function useEam() {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [iotStatus, setIotStatus] = useState<IotStatus | null>(null);
  const [recentBreakdowns, setRecentBreakdowns] = useState<BreakdownEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEquipment = async () => {
    try {
      const res = await fetch('/api/eam/equipment');
      if (res.ok) setEquipmentList(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/eam/maintenance');
      if (res.ok) setTasks(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const createEquipment = async (data: Partial<Equipment>) => {
    await fetch('/api/eam/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    fetchEquipment();
  };

  const createMaintenanceTask = async (data: Partial<MaintenanceTask>) => {
    await fetch('/api/eam/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    fetchTasks();
  };

  const fetchIotStatus = async () => {
    try {
      const res = await fetch('/api/eam/iot/status');
      if (res.ok) setIotStatus(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecentBreakdowns = async () => {
    try {
      const res = await fetch('/api/eam/breakdowns/recent?take=5');
      if (res.ok) {
        const data = await res.json();
        setRecentBreakdowns(data.items || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    Promise.all([fetchEquipment(), fetchTasks(), fetchIotStatus(), fetchRecentBreakdowns()]).finally(() =>
      setLoading(false),
    );
  }, []);

  const reportBreakdown = async (equipmentId: string, reason: string, projectId?: string) => {
    await fetch('/api/eam/breakdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipmentId, reason, severity: 'HIGH', projectId }),
    });
    await fetchEquipment();
    await fetchIotStatus();
    await fetchRecentBreakdowns();
  };

  return {
    equipmentList,
    tasks,
    iotStatus,
    recentBreakdowns,
    loading,
    createEquipment,
    createMaintenanceTask,
    reportBreakdown,
    fetchEquipment,
    fetchTasks,
  };
}
