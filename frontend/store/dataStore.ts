"use client";

import { create } from 'zustand';
import { KPI, Alert, Advisory, Building, Machine } from '@/lib/types';
import { api } from '@/lib/api';

interface DataState {
    kpis: Record<string, Record<string, KPI>> | null;
    alerts: Alert[];
    advisory: Advisory[];
    buildings: Building[];
    machines: Record<string, Machine[]>;
    lastUpdated: string | null;
    isPolling: boolean;
    error: string | null;

    startPolling: () => void;
    stopPolling: () => void;
    fetchData: () => Promise<void>;
    clearAlerts: () => void;
}

export const useDataStore = create<DataState>((set, get) => {
    let kpiInterval: NodeJS.Timeout | null = null;
    let alertsInterval: NodeJS.Timeout | null = null;
    let advisoryInterval: NodeJS.Timeout | null = null;
    let twinInterval: NodeJS.Timeout | null = null;

    return {
        kpis: null,
        alerts: [],
        advisory: [],
        buildings: [],
        machines: {},
        lastUpdated: null,
        isPolling: false,
        error: null,

        clearAlerts: () => set({ alerts: [] }),

        fetchData: async () => {
            try {
                const [alerts, buildings, machines] = await Promise.all([
                    api.getAlerts(),
                    api.getBuildings(),
                    api.getMachines(),
                ]);

                set({
                    alerts,
                    buildings,
                    machines,
                    error: null,
                });
            } catch (err: any) {
                set({ error: err.message });
            }
        },

        startPolling: () => {
            if (get().isPolling) return;
            // Initial fetch: fast-moving telemetry + alerts.
            get().fetchData();
            // Initial fetch: KPIs and advisory.
            api.getKPIs().then((kpis) => set({ kpis: kpis as Record<string, Record<string, KPI>>, lastUpdated: new Date().toISOString() })).catch(() => {});
            api.getAdvisory().then((advisory) => set({ advisory })).catch(() => {});

            set({ isPolling: true });

            // Alerts + digital twin assets: refresh every 30s to keep the event stream active but stable.
            alertsInterval = setInterval(() => {
                api.getAlerts().then((alerts) => set({ alerts })).catch(() => {});
            }, 30000);

            // Advisory: refresh every 10 minutes.
            advisoryInterval = setInterval(() => {
                api.getAdvisory().then((advisory) => set({ advisory })).catch(() => {});
            }, 10 * 60 * 1000);

            // Digital twin buildings/machines: refresh faster than KPIs.
            twinInterval = setInterval(() => {
                Promise.all([api.getBuildings(), api.getMachines()])
                    .then(([buildings, machines]) => set({ buildings, machines }))
                    .catch(() => {});
            }, 10000);

            // KPIs: refresh once every 24 hours (backend also enforces caching + throughput 30d rule).
            kpiInterval = setInterval(() => {
                api.getKPIs()
                    .then((kpis) => set({ kpis: kpis as Record<string, Record<string, KPI>>, lastUpdated: new Date().toISOString() }))
                    .catch(() => {});
            }, 24 * 60 * 60 * 1000);
        },

        stopPolling: () => {
            if (kpiInterval) clearInterval(kpiInterval);
            if (alertsInterval) clearInterval(alertsInterval);
            if (advisoryInterval) clearInterval(advisoryInterval);
            if (twinInterval) clearInterval(twinInterval);
            set({ isPolling: false });
        }
    };
});
