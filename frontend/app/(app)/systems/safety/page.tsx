"use client";

import { useState, useMemo } from 'react';
import KPICard from '@/components/kpi/KPICard';
import KPIModal from '@/components/kpi/KPIModal';
import { useDataStore } from '@/store/dataStore';
import { KPIDefinition } from '@/lib/types';
import { ShieldAlert, AlertTriangle, ShieldCheck, GitCompare, Info, Radio } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import ChartDescriptionModal, { ChartDescription } from '@/components/charts/ChartDescriptionModal';

const DEFINITIONS: Record<string, KPIDefinition> = {
    pressureSafetyIndex: { key: 'pressureSafetyIndex', label: 'Pressure Safety Index', description: 'Composite health score of pressure relief valves and burst discs.', formula: 'Weighted score of PRV tests, alarms, and operating margins', operationalExplanation: 'Higher PSI indicates safer operating margins. Drops suggest relief system risk and require immediate review.', unit: '%', greenMin: 95, amberMin: 88, higherIsBetter: true },
    leakDetectionEvents: { key: 'leakDetectionEvents', label: 'Leak Detection', description: 'Confirmed hydrocarbon or H2S leak events detected by sensors.', formula: 'Count(Confirmed Leak Events)', operationalExplanation: 'Each leak event is a safety-critical incident. Spikes should trigger investigation and maintenance actions.', unit: 'events', greenMax: 2, amberMax: 5, higherIsBetter: false },
    emergencyShutdownEvents: { key: 'emergencyShutdownEvents', label: 'Emergency Shutdowns', description: 'Unplanned automated unit trip events.', formula: 'Count(ESD Trips)', operationalExplanation: 'Unplanned trips increase risk and cost. Repeated ESDs indicate control/system issues or unsafe operating windows.', unit: 'events', greenMax: 1, amberMax: 3, higherIsBetter: false },
    hazardRiskIndex: { key: 'hazardRiskIndex', label: 'Hazard Risk Index', description: 'AI-calculated operational risk score based on real-time telemetry.', formula: 'ML score from pressure/temp deviations + alarms + near misses', operationalExplanation: 'Rolls up multiple leading indicators into a single risk score. Rising risk should proactively create work orders.', unit: 'score', greenMax: 25, amberMax: 40, higherIsBetter: false },
};

export default function SafetyMonitoringPage() {
    const kpis = useDataStore(s => s.kpis?.safety);
    const [selectedKpi, setSelectedKpi] = useState<string | null>(null);
    const [activeChart, setActiveChart] = useState<ChartDescription | null>(null);

    // Radar data: all 4 safety KPIs converted to 0-100 safety scores (higher=safer)
    const radarData = useMemo(() => {
        if (!kpis) return [];
        const psi = kpis.pressureSafetyIndex?.value ?? 95;
        const leaks = kpis.leakDetectionEvents?.value ?? 0;
        const esds = kpis.emergencyShutdownEvents?.value ?? 0;
        const hazard = kpis.hazardRiskIndex?.value ?? 20;
        return [
            { subject: 'Pressure\nSafety', score: Math.round(psi), raw: `${psi.toFixed(1)}%`, fullMark: 100 },
            { subject: 'Leak\nEvents', score: Math.max(0, Math.round(100 - (leaks / 5) * 100)), raw: `${leaks} events`, fullMark: 100 },
            { subject: 'ESD\nEvents', score: Math.max(0, Math.round(100 - (esds / 3) * 100)), raw: `${esds} events`, fullMark: 100 },
            { subject: 'Hazard\nRisk', score: Math.max(0, Math.round(100 - (hazard / 40) * 100)), raw: `${hazard.toFixed(1)}`, fullMark: 100 },
        ];
    }, [kpis?.pressureSafetyIndex?.value, kpis?.leakDetectionEvents?.value, kpis?.emergencyShutdownEvents?.value, kpis?.hazardRiskIndex?.value]);

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

    const chartData = kpis.hazardRiskIndex?.history?.map((h, i) => ({
        time: safeFormatTime(h),
        fullDate: safeFormatFullDate(h),
        risk: h.value
    })) || [];

    const corrPVals = (kpis.pressureSafetyIndex?.history || []).map((h: any) => h.value);
    const corrHVals = (kpis.hazardRiskIndex?.history || []).map((h: any) => h.value);
    const corrLen = Math.min(corrPVals.length, corrHVals.length);
    const pMin = corrLen ? Math.min(...corrPVals) : 0, pMax = corrLen ? Math.max(...corrPVals) : 100;
    const hMin = corrLen ? Math.min(...corrHVals) : 0, hMax = corrLen ? Math.max(...corrHVals) : 100;

    const correlationData = (kpis.pressureSafetyIndex?.history || []).slice(-corrLen).map((h: any, i: number) => {
        const d = new Date(h.timestamp || h.time);
        return {
            time: isNaN(d.getTime()) ? String(i) : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fullDate: isNaN(d.getTime()) ? String(i) : d.toLocaleString(),
            psi: pMax === pMin ? 50 : ((corrPVals[i] - pMin) / (pMax - pMin)) * 100,
            risk: hMax === hMin ? 50 : ((corrHVals[i] - hMin) / (hMax - hMin)) * 100,
            psi_raw: corrPVals[i],
            risk_raw: corrHVals[i],
        };
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                        <ShieldAlert className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        Safety Monitoring
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Process safety and hazard risk management</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            Dynamic Hazard Risk Trend
                        </h3>
                        <button onClick={() => setActiveChart({ title: 'Dynamic Hazard Risk Trend', chartType: 'Area Chart', description: 'Plots the AI-calculated Hazard Risk Index over time, which is a composite score derived from real-time pressure/temperature deviations, alarm counts, and near-miss events. Lower is safer. A rising trend is an early warning indicator — it should prompt proactive investigation before an actual safety event occurs.', metrics: [{ name: 'Hazard Risk Score', color: '#f59e0b', meaning: 'Composite ML-generated operational risk score (0–100). Green threshold <25, amber <40, red above 40. Driven by multiple concurrent stress indicators from field instruments.' }], howToRead: 'Flat low valleys represent safe steady-state operation. Rising slopes indicate escalating risk. Sudden spikes usually correspond to alarms, process upsets, or equipment trips. Use alongside the Safety Interlock Status panel to determine root cause.', keyInsight: 'Gradual, persistent upward drift of the risk score (even without spike events) is a stronger predictor of imminent incidents than sudden spikes, which often reflect brief transients.' })} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"><Info className="w-4 h-4" /></button>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
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
                                    label={{ value: 'Risk Score', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}
                                    labelStyle={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}
                                    labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                                />
                                <Area type="monotone" dataKey="risk" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorRisk)" dot={{ r: 1 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6">
                        <AlertTriangle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        Safety Interlock Status
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Hydrogen Plant Shutdown System</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">SIS Logic Solver Node 4</div>
                            </div>
                            <div className="px-3 py-1 rounded bg-status-normal/10 text-status-normal text-[10px] font-bold uppercase border border-status-normal/20 leading-none">Healthy</div>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">FCC Regenerator Over-temp Protection</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">SIL-3 loop integrity</div>
                            </div>
                            <div className="px-3 py-1 rounded bg-status-normal/10 text-status-normal text-[10px] font-bold uppercase border border-status-normal/20 leading-none">Healthy</div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">CDU Charge Pump Low Flow Trip</div>
                                <div className="text-xs text-status-warning mt-0.5 font-medium">Transmitter FT-101 A/B deviation</div>
                            </div>
                            <div className="px-3 py-1 rounded bg-status-warning/10 text-status-warning text-[10px] font-bold uppercase border border-status-warning/20 leading-none">Bypassed</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Safety KPI Radar + Correlation side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Radio className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            Safety KPI Radar Profile
                        </h3>
                        <button onClick={() => setActiveChart({ title: 'Safety KPI Radar Profile', chartType: 'Radar Chart', description: 'A spider/radar chart mapping all four safety KPIs onto a single radial view. Each axis represents a different safety dimension, all converted to a 0–100 safety score where 100 is perfect (zero risk). The polygon shape shows the overall safety posture — a large filled area close to the outer ring indicates strong safety performance across all dimensions.', metrics: [{ name: 'Pressure Safety', color: '#f59e0b', meaning: 'Pressure Safety Index directly mapped as-is (higher %). Score of 100 = 100% PSI.' }, { name: 'Leak Events', color: '#f59e0b', meaning: 'Inverted: 0 events = 100 score, 5 events = 0 score. Any confirmed hydrocarbon leak degrades this axis.' }, { name: 'ESD Events', color: '#f59e0b', meaning: 'Inverted: 0 unplanned trips = 100, 3+ trips = 0. Reflects process control stability.' }, { name: 'Hazard Risk', color: '#f59e0b', meaning: 'Inverted: Risk score 0 = 100 safety score, risk score 40+ = 0. Reflects composite leading indicator.' }], howToRead: 'A wide, symmetric polygon is ideal. Inward dips on any axis indicate a specific safety concern for that KPI. Hover over each vertex to see the actual raw values. Compare the polygon shape across shifts to track safety trajectory.', keyInsight: 'An asymmetric shape where only one or two axes dip inward is more actionable than a uniformly contracted polygon — it pinpoints the specific safety driver to address.' })} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"><Info className="w-4 h-4" /></button>
                    </div>
                    <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="#334155" opacity={0.3} />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748b' }} tickCount={4} />
                                <Radar name="Safety Score" dataKey="score" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} strokeWidth={2} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b' }}
                                    itemStyle={{ fontSize: '11px', color: '#f8fafc' }}
                                    formatter={(value: any, name: any, props: any) => [`${value}/100 (${props.payload?.raw})`, 'Safety Score']}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-3 glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                        <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <GitCompare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            KPI Correlation — Pressure Safety Index vs Hazard Risk Index (normalized 0–100)
                        </h3>
                        <button onClick={() => setActiveChart({ title: 'PSI vs Hazard Risk Correlation', chartType: 'Multi-Line Chart', description: 'Plots Pressure Safety Index and Hazard Risk Index on the same normalized scale for direct comparison. These two metrics often move inversely: as PSI drops (fewer PRVs healthy), the Hazard Risk score rises. This inverse correlation confirms that relief system degradation directly drives operational risk.', metrics: [{ name: 'Pressure Safety Index', color: '#10b981', meaning: 'Composite PRV/burst disc health score. Higher is better. Normalized so 100 = maximum observed performance.' }, { name: 'Hazard Risk Score', color: '#f59e0b', meaning: 'AI composite risk indicator. Higher is worse. Normalized so 100 = highest risk observed in window.' }], howToRead: 'When the two lines diverge — PSI dropping while risk rises — it is a high-confidence signal of equipment-driven risk escalation. Parallel movement suggests external drivers (feed composition, throughput). Hover to see actual raw values.', keyInsight: 'A PSI drop of even 3–5 points with simultaneous risk index rise of 5+ points justifies an immediate suspension of routine operations for PRV inspection in the affected area.' })} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"><Info className="w-4 h-4" /></button>
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
                                    if (name === 'psi') return [`${raw.psi_raw?.toFixed(1)}%`, 'Pressure Safety Index'];
                                    if (name === 'risk') return [`${raw.risk_raw?.toFixed(1)}`, 'Hazard Risk Score'];
                                    return [value, name];
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} formatter={(v) => v === 'psi' ? 'Pressure Safety Index' : 'Hazard Risk Score'} />
                            <Line type="monotone" dataKey="psi" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <Line type="monotone" dataKey="risk" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
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
