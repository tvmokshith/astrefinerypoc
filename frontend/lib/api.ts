import {
    KPI,
    Alert,
    Advisory,
    Building,
    WorkflowResult,
    SensorLive,
    UnitSensorSummary,
    SensorHistoryPoint,
    MachineStatusSummary,
    RefinerySummary,
    Machine,
    WorkOrder,
    EventStreamItem,
} from './types';

const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!PUBLIC_API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is not set (see .env.local / .env.production)');
}

const API_BASE = PUBLIC_API_URL + '/api';

// Server components resolve the API over loopback; the browser uses the public URL.
export const SERVER_API_BASE =
    (process.env.BACKEND_INTERNAL_URL || PUBLIC_API_URL) + '/api';

export const api = {
    getKPIs: async (subsystem?: string): Promise<Record<string, Record<string, KPI>> | Record<string, KPI>> => {
        const url = subsystem ? `${API_BASE}/kpis/${subsystem}` : `${API_BASE}/kpis`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch KPIs');
        return res.json();
    },

    getEnterpriseKPIs: async (module: string): Promise<Record<string, KPI>> => {
        const res = await fetch(`${API_BASE}/enterprise/${module}`);
        if (!res.ok) throw new Error('Failed to fetch enterprise KPIs');
        return res.json();
    },

    getAlerts: async (): Promise<Alert[]> => {
        const res = await fetch(`${API_BASE}/alerts`);
        if (!res.ok) throw new Error('Failed to fetch alerts');
        return res.json();
    },

    getEvents: async (): Promise<EventStreamItem[]> => {
        const res = await fetch(`${API_BASE}/events`);
        if (!res.ok) throw new Error('Failed to fetch events');
        return res.json();
    },

    listWorkOrders: async (params?: { approvalStatus?: string; status?: string }): Promise<WorkOrder[]> => {
        const query = new URLSearchParams();
        if (params?.approvalStatus) query.set('approvalStatus', params.approvalStatus);
        if (params?.status) query.set('status', params.status);
        const res = await fetch(`${API_BASE}/work-orders${query.toString() ? `?${query.toString()}` : ''}`);
        if (!res.ok) throw new Error('Failed to fetch work orders');
        return res.json();
    },

    createWorkOrder: async (payload: Partial<WorkOrder>): Promise<WorkOrder> => {
        const res = await fetch(`${API_BASE}/work-orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create work order');
        return res.json();
    },

    approveWorkOrder: async (id: string): Promise<WorkOrder> => {
        const res = await fetch(`${API_BASE}/work-orders/${encodeURIComponent(id)}/approve`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to approve work order');
        return res.json();
    },

    rejectWorkOrder: async (id: string): Promise<WorkOrder> => {
        const res = await fetch(`${API_BASE}/work-orders/${encodeURIComponent(id)}/reject`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to reject work order');
        return res.json();
    },

    patchWorkOrder: async (id: string, patch: Partial<WorkOrder>): Promise<WorkOrder> => {
        const res = await fetch(`${API_BASE}/work-orders/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error('Failed to update work order');
        return res.json();
    },

    getAdvisory: async (subsystem?: string): Promise<Advisory[]> => {
        const url = subsystem ? `${API_BASE}/advisory/${subsystem}` : `${API_BASE}/advisory`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch advisory');
        return res.json();
    },

    getBuildings: async (): Promise<Building[]> => {
        const res = await fetch(`${API_BASE}/digital-twin/buildings`);
        if (!res.ok) throw new Error('Failed to fetch buildings');
        return res.json();
    },

    getMachines: async (): Promise<Record<string, Machine[]>> => {
        const res = await fetch(`${API_BASE}/digital-twin/machines`);
        if (!res.ok) throw new Error('Failed to fetch machines');
        return res.json();
    },

    getBuildingDetail: async (id: string): Promise<Building> => {
        const res = await fetch(`${API_BASE}/digital-twin/buildings/${id}`);
        if (!res.ok) throw new Error('Failed to fetch building details');
        return res.json();
    },

    // Synthetic sensor APIs
    getLiveSensors: async (params?: { unit?: string; machineId?: string }): Promise<SensorLive[]> => {
        const query = new URLSearchParams();
        if (params?.unit) query.set('unit', params.unit);
        if (params?.machineId) query.set('machineId', params.machineId);
        const res = await fetch(`${API_BASE}/sensors/live${query.toString() ? `?${query.toString()}` : ''}`);
        if (!res.ok) throw new Error('Failed to fetch live sensors');
        return res.json();
    },

    getUnitSensorSummary: async (): Promise<UnitSensorSummary[]> => {
        const res = await fetch(`${API_BASE}/sensors/live/units`);
        if (!res.ok) throw new Error('Failed to fetch unit sensor summary');
        return res.json();
    },

    getSensorHistory: async (sensorId: string, options?: { days?: number; intervalSeconds?: number }): Promise<SensorHistoryPoint[]> => {
        const query = new URLSearchParams({ sensorId });
        if (options?.days) query.set('days', String(options.days));
        if (options?.intervalSeconds) query.set('intervalSeconds', String(options.intervalSeconds));
        const res = await fetch(`${API_BASE}/sensors/history?${query.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch sensor history');
        return res.json();
    },

    getMachineStatusSummary: async (): Promise<MachineStatusSummary[]> => {
        const res = await fetch(`${API_BASE}/machines/status`);
        if (!res.ok) throw new Error('Failed to fetch machine status');
        return res.json();
    },

    getRefinerySummary: async (): Promise<RefinerySummary> => {
        const res = await fetch(`${API_BASE}/refinery/summary`);
        if (!res.ok) throw new Error('Failed to fetch refinery summary');
        return res.json();
    },

    simulateWorkflow: async (workflowType: string): Promise<WorkflowResult> => {
        const res = await fetch(`${API_BASE}/workflow/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workflowType }),
        });
        if (!res.ok) throw new Error('Failed to simulate workflow');
        return res.json();
    },
};
