"use client";

import { useState, useMemo } from 'react';
import KPICard from '@/components/kpi/KPICard';
import KPIModal from '@/components/kpi/KPIModal';
import { useDataStore } from '@/store/dataStore';
import { useWorkOrderStore } from '@/store/workOrderStore';
import { KPI, KPIDefinition } from '@/lib/types';
import { Activity, Wrench, AlertTriangle, ShieldCheck, GitCompare, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, ScatterChart, Scatter, ZAxis } from 'recharts';
import ChartDescriptionModal, { ChartDescription } from '@/components/charts/ChartDescriptionModal';

type TimeRange = '6h' | '12h' | '30h';

const DEFINITIONS: Record<string, KPIDefinition> = {
    equipmentUptime: { key: 'equipmentUptime', label: 'Equipment Uptime', description: 'Percentage of time critical equipment is operational.', formula: '(Operating Time / Total Time) × 100', operationalExplanation: 'Measures availability. Low uptime drives throughput loss and increases safety risk from repeated startups/shutdowns.', unit: '%', greenMin: 95, amberMin: 90, higherIsBetter: true },
    mtbf: { key: 'mtbf', label: 'Mean Time Between Failures', description: 'Average operating time between system failures.', formula: 'Total Operating Hours / # Failures', operationalExplanation: 'Reliability metric. Declining MTBF suggests systemic degradation or poor preventive maintenance effectiveness.', unit: 'hrs', greenMin: 1500, amberMin: 1000, higherIsBetter: true },
    mttr: { key: 'mttr', label: 'Mean Time To Repair', description: 'Average time required to repair failed equipment.', formula: 'Total Repair Time / # Repairs', operationalExplanation: 'Maintainability metric. Higher MTTR increases downtime impact; often improved by spares, procedures, and planning.', unit: 'hrs', greenMax: 6, amberMax: 12, higherIsBetter: false },
    vibrationIndex: { key: 'vibrationIndex', label: 'Vibration Index', description: 'Aggregate measure of rotating equipment vibration severity.', formula: 'Aggregate vibration RMS across critical rotating equipment', operationalExplanation: 'Early indicator for bearing wear, imbalance, or misalignment. Critical excursions should trigger inspection and work orders.', unit: 'mm/s', greenMax: 3.5, amberMax: 7, higherIsBetter: false },
    maintenanceBacklog: { key: 'maintenanceBacklog', label: 'Maintenance Backlog', description: 'Number of pending corrective maintenance tasks.', formula: 'Count(Open Corrective Tasks)', operationalExplanation: 'Backlog reflects maintenance capacity and risk accumulation. High backlog increases probability of unplanned failures.', unit: 'tasks', greenMax: 20, amberMax: 35, higherIsBetter: false },
};

export default function EquipmentHealthPage() {
    const kpis = useDataStore(s => s.kpis?.equipmentHealth);
    const { openCreateModal } = useWorkOrderStore();
    const [selectedKpi, setSelectedKpi] = useState<string | null>(null);
    const [vibTimeRange, setVibTimeRange] = useState<TimeRange>('30h');
    const [activeChart, setActiveChart] = useState<ChartDescription | null>(null);

    if (!kpis) return <div className="p-8 text-center text-slate-500">Loading telemetry...</div>;

    const safeFormatTime = (h: any) => {
        if (!h) return '';
        const d = new Date(h.timestamp || h.time);
        if (isNaN(d.getTime())) return h.time || 'N/A';
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const safeFormatFullDate = (h: any) => {
        if (!h) return '';
        const d = new Date(h.timestamp || h.time);
        if (isNaN(d.getTime())) return h.time || 'N/A';
        return d.toLocaleString();
    };

    const pointsForRange: Record<TimeRange, number> = { '6h': 6, '12h': 12, '30h': 30 };
    const vibHistory = kpis.vibrationIndex?.history || [];
    const slicedVib = vibHistory.slice(-pointsForRange[vibTimeRange]);

    const chartData = slicedVib.map((h, i) => ({
        time: safeFormatTime(h),
        fullDate: safeFormatFullDate(h),
        vibration: h.value
    }));

    // Correlation chart: Vibration vs MTBF (normalized)
    const correlationData = useMemo(() => {
        const vH = kpis.vibrationIndex?.history || [];
        const mH = kpis.mtbf?.history || [];
        const uH = kpis.equipmentUptime?.history || [];
        const len = Math.min(vH.length, mH.length, uH.length, pointsForRange[vibTimeRange]);
        if (len === 0) return [];

        const vSlice = vH.slice(-len);
        const mSlice = mH.slice(-len);
        const uSlice = uH.slice(-len);

        const norm = (arr: { value: number }[], v: number) => {
            const min = Math.min(...arr.map(h => h.value));
            const max = Math.max(...arr.map(h => h.value));
            return max === min ? 50 : Math.round(((v - min) / (max - min)) * 100);
        };

        return vSlice.map((h, i) => ({
            time: safeFormatTime(h),
            fullDate: safeFormatFullDate(h),
            vibration: norm(vSlice, h.value),
            mtbf: norm(mSlice, mSlice[i].value),
            uptime: norm(uSlice, uSlice[i].value),
            vibration_raw: h.value,
            mtbf_raw: mSlice[i].value,
            uptime_raw: uSlice[i].value,
        }));
    }, [kpis.vibrationIndex?.history, kpis.mtbf?.history, kpis.equipmentUptime?.history, vibTimeRange]);

    // Scatter data: Vibration (x) vs MTBF (y)
    const scatterData = useMemo(() => {
        const vH = kpis.vibrationIndex?.history || [];
        const mH = kpis.mtbf?.history || [];
        const len = Math.min(vH.length, mH.length);
        return vH.slice(-len).map((h, i) => ({
            vibration: +h.value.toFixed(2),
            mtbf: +mH[i].value.toFixed(0),
        }));
    }, [kpis.vibrationIndex?.history, kpis.mtbf?.history]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                        <Activity className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        Equipment Health
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Predictive maintenance and reliability metrics</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {Object.entries(DEFINITIONS).map(([key, def]) => (
                    <KPICard
                        key={key}
                        title={def.label}
                        kpi={kpis[key]}
                        onClick={() => setSelectedKpi(key)}
                        inverseTrend={!def.higherIsBetter}
                    />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            Fleet Vibration Trend (mm/s)
                        </h3>
                        <button onClick={() => setActiveChart({
                            title: 'Fleet Vibration Trend',
                            chartType: 'Area Chart',
                            description: 'Tracks the aggregate vibration index (RMS mm/s) across all critical rotating equipment over the selected timeframe. Vibration is one of the most reliable early indicators of mechanical degradation.',
                            metrics: [{ name: 'Vibration Index', color: '#f59e0b', meaning: 'Root mean square vibration in mm/s averaged across critical pumps, compressors, and drivers. ISO 10816 defines thresholds: < 2.8 mm/s = Good, 2.8–7.1 = Alarm, > 7.1 = Danger.' }],
                            howToRead: 'A flat or slowly rising line indicates normal wear. A sudden spike suggests a mechanical fault, coupling failure, or process upset. Use the time range buttons to zoom into recent hours for root cause investigation.',
                            keyInsight: 'Vibration above 3.5 mm/s should trigger an inspection work order. Sustained vibration above 7 mm/s risks catastrophic bearing failure within hours.',
                        })} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                            <Info className="w-4 h-4" />
                        </button>
                        </div>
                        <div className="flex gap-2">
                            {(['6h', '12h', '30h'] as TimeRange[]).map(range => (
                                <button
                                    key={range}
                                    onClick={() => setVibTimeRange(range)}
                                    className={`px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors ${
                                        vibTimeRange === range
                                            ? 'bg-primary-600 text-white border-primary-500'
                                            : 'bg-slate-900/5 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-900/10'
                                    }`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorVib" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                                <XAxis
                                    dataKey="time"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    dy={10}
                                    label={{ value: 'Time (HH:mm)', position: 'insideBottomRight', offset: -10, fontSize: 10, fill: '#94a3b8' }}
                                />
                                <YAxis
                                    domain={['auto', 'auto']}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    dx={-10}
                                    label={{ value: 'mm/s', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}
                                    labelStyle={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}
                                    labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                                />
                                <Area type="monotone" dataKey="vibration" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorVib)" dot={{ r: 1 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6">
                        <AlertTriangle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        Top Critical Equipment
                    </h3>
                    <div className="space-y-3">
                        <div className="p-3 rounded-lg border border-status-critical/30 bg-status-critical/5 dark:bg-status-critical/10 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Pump P-101 (CDU)</div>
                                <div className="text-xs text-status-critical mt-0.5 font-medium">Vibration high • 72h to failure</div>
                            </div>
                            <button
                                onClick={() => openCreateModal({
                                    Subsystem: 'Equipment Health',
                                    Equipment: 'Pump P-101 (CDU)',
                                    Description: 'Vibration high on Pump P-101 (CDU). Spectrum indicates bearing wear and cavitation. Failure predicted within 72 hours.',
                                    Priority: 'Critical',
                                    Source: 'equipment-health',
                                    LinkedKPI: 'equipmentHealth.vibrationIndex',
                                })}
                                className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                            >
                                Schedule Maintenance
                            </button>
                        </div>
                        <div className="p-3 rounded-lg border border-status-warning/30 bg-status-warning/5 dark:bg-status-warning/10 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Compressor C-301 (FCC)</div>
                                <div className="text-xs text-status-warning mt-0.5 font-medium">Bearing temp elevated • 15 days to failure</div>
                            </div>
                            <button
                                onClick={() => openCreateModal({
                                    Subsystem: 'Equipment Health',
                                    Equipment: 'Compressor C-301 (FCC)',
                                    Description: 'Bearing temperature elevated on C-301. Requires inspection within 15 days to prevent failure.',
                                    Priority: 'High',
                                    Source: 'equipment-health',
                                    LinkedKPI: 'equipmentHealth.mtbf',
                                })}
                                className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                            >
                                Inspect
                            </button>
                        </div>
                        <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Furnace F-101 (CDU)</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Efficiency degraded • Routine cleaning due</div>
                            </div>
                            <button
                                onClick={() => openCreateModal({
                                    Subsystem: 'Crude Processing',
                                    Equipment: 'Furnace F-101 (CDU)',
                                    Description: 'Furnace F-101 efficiency degraded. Routine cleaning is due. Log event and schedule cleaning during next available window.',
                                    Priority: 'Medium',
                                    Source: 'equipment-health',
                                    LinkedKPI: 'crudeProcessing.furnaceEfficiency',
                                })}
                                className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                            >
                                Log Event
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scatter: Vibration vs MTBF + Correlation row */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Scatter chart */}
            <div className="lg:col-span-2 glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            Vibration vs MTBF
                        </h3>
                        <button onClick={() => setActiveChart({
                            title: 'Vibration vs MTBF Scatter',
                            chartType: 'Scatter Plot',
                            description: 'Each point represents a historical reading pairing vibration index (x-axis) with mean time between failures in hours (y-axis). Reveals the statistical relationship between vibration severity and equipment reliability.',
                            metrics: [
                                { name: 'X axis — Vibration Index (mm/s)', color: '#f59e0b', meaning: 'Higher x = more severe vibration. Points should cluster on the left side of the plot.' },
                                { name: 'Y axis — MTBF (hrs)', color: '#3b82f6', meaning: 'Higher y = longer time between failures = better reliability. Points should cluster at the top of the plot.' },
                            ],
                            howToRead: 'A healthy equipment fleet shows points concentrated in the top-left quadrant (low vibration, high MTBF). Points drifting to the bottom-right (high vibration, low MTBF) indicate a strong negative correlation and predict near-term failure. Use this to justify predictive maintenance decisions.',
                            keyInsight: 'A clear downward trend from left to right in this scatter confirms that vibration is a leading indicator for MTBF degradation in this fleet. If points are scattered randomly, other failure modes (e.g., corrosion, process upsets) may dominate.',
                        })} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                            <Info className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                            <XAxis dataKey="vibration" type="number" name="Vibration" unit=" mm/s" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} label={{ value: 'Vibration (mm/s)', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#94a3b8' }} />
                            <YAxis dataKey="mtbf" type="number" name="MTBF" unit=" h" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} label={{ value: 'MTBF (h)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }} />
                            <ZAxis range={[25, 25]} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b' }}
                                itemStyle={{ fontSize: '11px', color: '#f8fafc' }}
                                cursor={{ strokeDasharray: '3 3' }}
                            />
                            <Scatter data={scatterData} fill="#f59e0b" fillOpacity={0.7} />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Correlation Chart: Vibration vs MTBF vs Uptime */}
            <div className="lg:col-span-3 glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <GitCompare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        KPI Correlation — Vibration vs MTBF vs Uptime
                    </h3>
                    <button onClick={() => setActiveChart({
                        title: 'Reliability KPI Correlation',
                        chartType: 'Normalised Multi-Line Chart',
                        description: 'Overlays three related equipment health KPIs on a shared 0–100 normalized scale to reveal how they interact over time.',
                        metrics: [
                            { name: 'Vibration Index', color: '#f59e0b', meaning: 'Aggregate vibration RMS. Rising trend is a leading warning indicator.' },
                            { name: 'MTBF', color: '#3b82f6', meaning: 'Mean time between failures. Declining trend = reduced reliability.' },
                            { name: 'Equipment Uptime', color: '#10b981', meaning: 'Operational availability. Drops confirm that failures are actually causing downtime, not just theoretical risk.' },
                        ],
                        howToRead: 'Watch for the amber vibration line rising at the same time the blue MTBF and green uptime lines fall. This three-way divergence is the strongest predictive signal for an imminent fleet health event. Hover over any point to see the actual values.',
                        keyInsight: 'MTBF leading indicators typically show degradation 5–15 data points before a confirmed uptime drop. Early intervention in this window prevents up to 80% of unplanned shutdowns.',
                    })} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                        <Info className="w-4 h-4" />
                    </button>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Normalized for trend comparison. Hover for actuals.</p>
                </div>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={correlationData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                            <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dx={-5} unit="%" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b' }}
                                itemStyle={{ fontSize: '11px', color: '#f8fafc' }}
                                labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
                                labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                                formatter={(value: any, name: any, props: any) => {
                                    const raw = props.payload;
                                    if (name === 'vibration') return [`${raw.vibration_raw?.toFixed(2)} mm/s`, 'Vibration Index'];
                                    if (name === 'mtbf') return [`${raw.mtbf_raw?.toFixed(0)} hrs`, 'MTBF'];
                                    if (name === 'uptime') return [`${raw.uptime_raw?.toFixed(1)}%`, 'Equipment Uptime'];
                                    return [value, name];
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} formatter={(v) => v === 'vibration' ? 'Vibration Index' : v === 'mtbf' ? 'MTBF' : 'Equipment Uptime'} />
                            <Line type="monotone" dataKey="vibration" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <Line type="monotone" dataKey="mtbf" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <Line type="monotone" dataKey="uptime" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
            </div>

            {selectedKpi && (
                <KPIModal
                    title={DEFINITIONS[selectedKpi].label}
                    definition={DEFINITIONS[selectedKpi].description}
                    formula={DEFINITIONS[selectedKpi].formula}
                    operationalExplanation={DEFINITIONS[selectedKpi].operationalExplanation}
                    kpiKey={selectedKpi}
                    kpi={kpis[selectedKpi]}
                    thresholds={{
                        green: DEFINITIONS[selectedKpi].higherIsBetter ? `> ${DEFINITIONS[selectedKpi].greenMin}` : `< ${DEFINITIONS[selectedKpi].greenMax}`,
                        amber: DEFINITIONS[selectedKpi].higherIsBetter ? `${DEFINITIONS[selectedKpi].amberMin} - ${DEFINITIONS[selectedKpi].greenMin}` : `${DEFINITIONS[selectedKpi].greenMax} - ${DEFINITIONS[selectedKpi].amberMax}`,
                        red: DEFINITIONS[selectedKpi].higherIsBetter ? `< ${DEFINITIONS[selectedKpi].amberMin}` : `> ${DEFINITIONS[selectedKpi].amberMax}`
                    }}
                    onClose={() => setSelectedKpi(null)}
                />
            )}
            {activeChart && <ChartDescriptionModal chart={activeChart} onClose={() => setActiveChart(null)} />}
        </div>
    );
}
