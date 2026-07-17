import { Building, Machine } from '@/lib/types';
import { X, Activity, Zap, Thermometer, Gauge, AlertTriangle, Minimize2, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import MachineAnalyticsPanel from './MachineAnalyticsPanel';
import { useDataStore } from '@/store/dataStore';

interface Props {
    building: Building | null;
    onClose: () => void;
}

export default function BuildingDetailPanel({ building, onClose }: Props) {
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

    if (!building) return null;

    const bgBorder = building.status === 'critical' ? 'border-status-critical' : building.status === 'warning' ? 'border-status-warning' : 'border-primary-600';

    return (
        <div className={`absolute top-4 right-4 bottom-4 w-80 bg-slate-950/80 backdrop-blur-xl border-l-[3px] border-y border-r border-white/10 rounded-xl shadow-2xl flex flex-col z-20 animate-slide-in-right ${bgBorder} overflow-hidden`}>

            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-start justify-between bg-white/5">
                <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Facility Block</div>
                    <h2 className="text-lg font-bold text-white leading-tight">{building.name}</h2>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`status-dot ${building.status}`} />
                        <span className="text-xs font-semibold uppercase text-slate-300">
                            {building.status}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {selectedMachine && (
                        <button
                            onClick={() => setSelectedMachine(null)}
                            className="p-1 rounded bg-white/5 hover:bg-white/20 text-slate-400 hover:text-white transition-colors"
                            title="Exit machine view"
                        >
                            <Minimize2 className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-1 rounded bg-white/5 hover:bg-white/20 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar p-4 space-y-6">

                {/* Unit Telemetry */}
                <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Unit Telemetry</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-900 rounded-lg p-3 border border-white/5">
                            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                <Thermometer className="w-3.5 h-3.5" />
                                <span className="text-xs">Temp</span>
                            </div>
                            <div className="text-white font-mono font-medium">
                                {building.temp?.toLocaleString() || '---'} <span className="text-[10px] text-slate-500">°C</span>
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-lg p-3 border border-white/5">
                            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                <Gauge className="w-3.5 h-3.5" />
                                <span className="text-xs">Pressure</span>
                            </div>
                            <div className="text-white font-mono font-medium">
                                {building.pressure?.toLocaleString() || '---'} <span className="text-[10px] text-slate-500">bar</span>
                            </div>
                        </div>

                        {building.throughput && (
                            <div className="bg-slate-900 rounded-lg p-3 border border-white/5 col-span-2">
                                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                    <Activity className="w-3.5 h-3.5" />
                                    <span className="text-xs">Throughput</span>
                                </div>
                                <div className="text-white font-mono font-medium text-lg text-primary-400">
                                    {building.throughput.toLocaleString()} <span className="text-xs text-slate-500">bbl/d</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-slate-900/70 border border-white/10 rounded-lg p-3">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Geo Cluster</div>
                    <div className="text-xs text-slate-200">
                        {building.zone || 'N/A'}{building.geospatialCluster ? ` | ${building.geospatialCluster}` : ''}
                    </div>
                    <Link
                        href={building.subsystemPath || '/dashboard'}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary-600 hover:bg-primary-500 text-white text-[11px] font-semibold transition-colors"
                    >
                        Open Subsystem Dashboard
                        <ArrowUpRight className="w-3 h-3" />
                    </Link>
                </div>
                {/* AI Recommendations (Step 9) */}
                {building.id && (useDataStore.getState().advisory.some(a => a.unitId === building.id)) && (
                    <div className="animate-fade-in">
                        <h3 className="text-xs font-semibold text-ai-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5" />
                            AI Industrial Advisor
                        </h3>
                        <div className="space-y-2">
                            {useDataStore.getState().advisory.filter(a => a.unitId === building.id).map(adv => (
                                <div key={adv.id} className="bg-ai-950/40 border border-ai-500/20 p-3 rounded-lg">
                                    <div className="text-[11px] font-bold text-ai-300 mb-1">{adv.title}</div>
                                    <div className="text-xs text-ai-100/70 leading-relaxed mb-2 line-clamp-2">{adv.message}</div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] px-1.5 py-0.5 bg-ai-500/20 text-ai-300 rounded uppercase font-bold tracking-tighter">Impact</span>
                                        <span className="text-[10px] text-ai-200 font-mono italic">{adv.impact}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Machine List */}
                <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                        <span>Critical Equipment</span>
                        <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">{building.machines?.length || 0}</span>
                    </h3>

                    <div className="space-y-2">
                        {!building.machines || building.machines.length === 0 ? (
                            <div className="text-center p-4 border border-dashed border-white/10 rounded-lg text-slate-500 text-xs">
                                No active telemetry available
                            </div>
                        ) : (
                            building.machines.map((machine: Machine) => (
                                <button
                                    key={machine.id}
                                    onClick={() => setSelectedMachine(machine)}
                                    className={`w-full text-left bg-slate-900 p-3 rounded-lg border hover:bg-slate-800 cursor-pointer transition-colors group ${machine.failureRisk > 20 ? 'border-status-critical/30' : machine.failureRisk > 10 ? 'border-status-warning/30' : 'border-white/5'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="text-sm font-medium text-white group-hover:text-primary-400 transition-colors">{machine.name}</h4>
                                            <div className="text-[10px] text-slate-500 mt-0.5">{machine.type}</div>
                                        </div>
                                        {machine.failureRisk > 20 && (
                                            <AlertTriangle className="w-4 h-4 text-status-critical animate-pulse" />
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Util</span>
                                            <span className="text-slate-300 font-mono">{machine.utilization}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Risk</span>
                                            <span className={`font-mono font-bold ${machine.failureRisk > 20 ? 'text-status-critical' : machine.failureRisk > 10 ? 'text-status-warning' : 'text-status-normal'}`}>
                                                {machine.failureRisk}%
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

            </div>

            <MachineAnalyticsPanel
                machine={selectedMachine}
                buildingName={building?.name ?? null}
                onClose={() => setSelectedMachine(null)}
            />

        </div>
    );
}



