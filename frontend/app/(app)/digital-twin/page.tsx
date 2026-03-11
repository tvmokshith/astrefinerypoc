"use client";

import { useEffect, useState } from 'react';
import RefineryScene from '@/components/digital-twin/RefineryScene';
import BuildingDetailPanel from '@/components/digital-twin/BuildingDetailPanel';
import { Building } from '@/lib/types';
import { Layers, Minimize2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function DigitalTwinPage() {
    const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
    const [buildingDetail, setBuildingDetail] = useState<Building | null>(null);

    useEffect(() => {
        if (!selectedBuilding) {
            setBuildingDetail(null);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const detail = await api.getBuildingDetail(selectedBuilding.id);
                if (!cancelled) {
                    setBuildingDetail(detail);
                }
            } catch {
                if (!cancelled) {
                    setBuildingDetail(selectedBuilding);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [selectedBuilding]);

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] relative">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                        <Layers className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        3D Digital Twin
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Interactive facility model with real-time telemetry</p>
                </div>
                <Link href="/dashboard" className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
                    <Minimize2 className="w-4 h-4" />
                    Exit Full Screen
                </Link>
            </div>

            <div className="flex-1 relative glass bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-800">
                <RefineryScene onSelectBuilding={setSelectedBuilding} selectedId={selectedBuilding?.id} />

                <div className="absolute top-4 left-4 pointer-events-none">
                    <div className="bg-black/50 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 text-white text-xs font-mono">
                        cam_mode: ORBIT | ctrl: MOUSE_L/R | sel: {selectedBuilding ? selectedBuilding.id : 'NONE'}
                    </div>
                </div>
            </div>

            <BuildingDetailPanel
                building={buildingDetail || selectedBuilding}
                onClose={() => setSelectedBuilding(null)}
            />
        </div>
    );
}
