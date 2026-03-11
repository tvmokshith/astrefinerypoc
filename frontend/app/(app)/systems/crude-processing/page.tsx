"use client";

import { useState } from 'react';
import KPICard from '@/components/kpi/KPICard';
import KPIModal from '@/components/kpi/KPIModal';
import { useDataStore } from '@/store/dataStore';
import { KPI, KPIDefinition } from '@/lib/types';
import { Droplets, Activity, Settings, BarChart2, GitCompare, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import ChartDescriptionModal, { ChartDescription } from '@/components/charts/ChartDescriptionModal';

const DEFINITIONS: Record<string, KPIDefinition> = {
    crudeThroughput: { key: 'crudeThroughput', label: 'Crude Throughput', description: 'Total volume of crude oil processed daily by the distillation units.', formula: 'Σ Feed Flow to CDU/VDU', operationalExplanation: 'Primary production driver. Used for planning, energy normalization, and margin optimization. (Special rule: updates monthly.)', unit: 'bbl/day', greenMin: 95000, amberMin: 80000, higherIsBetter: true },
    distillationEfficiency: { key: 'distillationEfficiency', label: 'Distillation Efficiency', description: 'Percentage of valuable distillates extracted from raw crude input.', formula: '(Distillate Output) / (Crude Feed) × 100', operationalExplanation: 'Indicates separation performance. Drops can suggest fouling, tray damage, poor reflux control, or off-spec crude assay.', unit: '%', greenMin: 90, amberMin: 85, higherIsBetter: true },
    furnaceEfficiency: { key: 'furnaceEfficiency', label: 'Furnace Efficiency', description: 'Thermal efficiency of the atmospheric and vacuum furnaces.', formula: '(Heat Absorbed by Process) / (Fuel Heat Input)', operationalExplanation: 'Tracks firing efficiency. Lower efficiency increases fuel usage and CO₂; often driven by excess air or tube fouling.', unit: '%', greenMin: 85, amberMin: 78, higherIsBetter: true },
    hydrogenConsumption: { key: 'hydrogenConsumption', label: 'Hydrogen Consumption', description: 'Rate of hydrogen utilized in the hydrotreating process.', formula: 'Hydrogen Flow to Treaters (Nm³/h)', operationalExplanation: 'Higher consumption can indicate catalyst aging, high sulfur feed, leaks, or recycle compression issues.', unit: 'Nm³/h', greenMax: 1500, amberMax: 1800, higherIsBetter: false },
    columnPressureStability: { key: 'columnPressureStability', label: 'Column Pressure Stability', description: 'Index measuring the variance in distillation column pressure.', formula: '100 − (σ(Pressure) × scale)', operationalExplanation: 'Stability is a proxy for steady separation. Instability can precede off-spec products and flooding/foaming events.', unit: '%', greenMin: 95, amberMin: 90, higherIsBetter: true },
    productYieldRatio: { key: 'productYieldRatio', label: 'Product Yield Ratio', description: 'Ratio of finished commercial products to total crude input.', formula: '(Total Saleable Products) / (Crude Feed) × 100', operationalExplanation: 'Overall conversion effectiveness. Degradation suggests losses to fuel, flare, slops, or suboptimal cutpoints.', unit: '%', greenMin: 82, amberMin: 78, higherIsBetter: true },
};

export default function CrudeProcessingPage() {
    const kpis = useDataStore(s => s.kpis?.crudeProcessing);
    const advisories = useDataStore(s => s.advisory); // would technically filter by subsystem in a full app
    const [selectedKpi, setSelectedKpi] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState<'6h' | '12h' | '30h'>('30h');
    const [activeChart, setActiveChart] = useState<ChartDescription | null>(null);

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

    if (!kpis) return <div className="p-8 text-center text-slate-500">Loading telemetry...</div>;

    const pointsForRange = { '6h': 12, '12h': 24, '30h': 60 } as const;
    const pts = pointsForRange[timeRange];

    const chartData = kpis.crudeThroughput?.history?.slice(-pts).map((h, i) => ({
        time: safeFormatTime(h),
        fullDate: safeFormatFullDate(h),
        throughput: h.value,
        efficiency: kpis.distillationEfficiency?.history?.slice(-pts)[i]?.value || 0
    })) || [];

    const corrTVals = (kpis.crudeThroughput?.history || []).map((h: any) => h.value);
    const corrDVals = (kpis.distillationEfficiency?.history || []).map((h: any) => h.value);
    const corrFVals = (kpis.furnaceEfficiency?.history || []).map((h: any) => h.value);
    const corrLen = Math.min(corrTVals.length, corrDVals.length, corrFVals.length);
    const tMin = corrLen ? Math.min(...corrTVals) : 0, tMax = corrLen ? Math.max(...corrTVals) : 100;
    const dMin = corrLen ? Math.min(...corrDVals) : 0, dMax = corrLen ? Math.max(...corrDVals) : 100;
    const fMin = corrLen ? Math.min(...corrFVals) : 0, fMax = corrLen ? Math.max(...corrFVals) : 100;

    const correlationData = (kpis.crudeThroughput?.history || []).slice(-corrLen).map((h: any, i: number) => {
        const d = new Date(h.timestamp || h.time);
        return {
            time: isNaN(d.getTime()) ? String(i) : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fullDate: isNaN(d.getTime()) ? String(i) : d.toLocaleString(),
            throughput: tMax === tMin ? 50 : ((corrTVals[i] - tMin) / (tMax - tMin)) * 100,
            distEff: dMax === dMin ? 50 : ((corrDVals[i] - dMin) / (dMax - dMin)) * 100,
            furnace: fMax === fMin ? 50 : ((corrFVals[i] - fMin) / (fMax - fMin)) * 100,
            throughput_raw: corrTVals[i],
            distEff_raw: corrDVals[i],
            furnace_raw: corrFVals[i],
        };
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                        <Droplets className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        Crude Processing
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Atmospheric and Vacuum Distillation telemetry — Live Performance Index</p>
                </div>
                <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Telemetry Stream Active</p>
                    <p className="text-xs font-bold text-primary-500">{new Date().toLocaleTimeString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            Process Correlation: Throughput vs Distillation Efficiency
                        </h3>
                        <div className="flex items-center gap-3 flex-wrap">
                            <button onClick={() => setActiveChart({ title: 'Throughput vs Distillation Efficiency', chartType: 'Dual-Axis Area Chart', description: 'Overlays two process metrics on the same time axis using independent Y-scales: Crude Throughput (bbl/day, left axis) and Distillation Efficiency (%, right axis). A dual-axis chart is used here because the two metrics have incompatible units and scales, but their directional relationship provides critical operational insight. When throughput rises, efficiency should hold or rise; a declining efficiency with rising throughput reveals column strain or feed quality degradation.', metrics: [{ name: 'Crude Throughput (bbl/day)', color: '#3b82f6', meaning: 'Total crude oil feed rate to the atmospheric distillation unit. Primary production driver. Green zone: >95,000 bbl/day.' }, { name: 'Distillation Efficiency (%)', color: '#8b5cf6', meaning: 'Percentage of valuable distillates extracted from raw feed. Should remain above 90% in healthy operation. Drops indicate tray damage, fouling, or reflux control issues.' }], howToRead: 'Watch for divergence: when the blue area (throughput) rises while the purple area (efficiency) falls, it indicates the column is being pushed beyond its optimal operating envelope. Parallel movement in the same direction is the desired state. Time range toggle controls how many historical data points are shown.', keyInsight: 'A 1% drop in distillation efficiency at 100,000 bbl/day throughput represents roughly $30,000-$50,000 in lost product value per day at typical refinery margins.' })} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"><Info className="w-4 h-4" /></button>
                            <div className="flex gap-1">
                                {(['6h', '12h', '30h'] as const).map(r => (
                                    <button key={r} onClick={() => setTimeRange(r)} className={`px-2.5 py-1 rounded text-[10px] font-semibold border transition-colors ${
                                        timeRange === r ? 'bg-primary-600 text-white border-primary-600' : 'bg-transparent text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-primary-400'
                                    }`}>{r}</button>
                                ))}
                            </div>
                            <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                <span className="w-2.5 h-2.5 rounded bg-primary-500"></span> Throughput (bbl/d)
                            </span>
                            <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                <span className="w-2.5 h-2.5 rounded bg-purple-500"></span> Efficiency (%)
                            </span>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="colorTput" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
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
                                    yAxisId="left"
                                    domain={['dataMin - 1000', 'dataMax + 1000']}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    dx={-10}
                                    label={{ value: 'bbl/day', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    domain={[80, 100]}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    dx={10}
                                    label={{ value: 'Efficiency %', angle: 90, position: 'insideRight', fontSize: 10, fill: '#94a3b8' }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}
                                    labelStyle={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}
                                    labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                                />
                                <Area yAxisId="left" type="monotone" dataKey="throughput" name="Throughput" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTput)" dot={{ r: 1 }} />
                                <Area yAxisId="right" type="monotone" dataKey="efficiency" name="Efficiency" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorEff)" dot={{ r: 1 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 flex flex-col">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                        <Settings className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        Unit Status Overview
                    </h3>
                    <div className="flex-1 space-y-3">
                        <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between group hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                            <div>
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Atmospheric Column C-101</div>
                                <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">Feed: 102.5k bbl/d • Temp: 342°C</div>
                            </div>
                            <span className="status-dot normal" />
                        </div>
                        <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between group hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                            <div>
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Atmospheric Furnace F-101</div>
                                <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">Duty: 184 MMBtu/h • O2: 2.1%</div>
                            </div>
                            <span className="status-dot warning" />
                        </div>
                        <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between group hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                            <div>
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Vacuum Distillation V-201</div>
                                <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">Feed: 48.2k bbl/d • Vac: 12mmHg</div>
                            </div>
                            <span className="status-dot normal" />
                        </div>
                        <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between group hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                            <div>
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Desalter D-101</div>
                                <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">Water content: 0.2% • Salt: 3 ptb</div>
                            </div>
                            <span className="status-dot normal" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Correlation Chart */}
            <div className="glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <GitCompare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        KPI Correlation — Throughput vs Distillation Efficiency vs Furnace Efficiency (normalized 0–100)
                    </h3>
                    <button onClick={() => setActiveChart({ title: 'Crude Processing KPI Correlation', chartType: 'Multi-Line Chart', description: 'Normalizes three key process efficiency metrics to the same 0–100 scale, enabling direct trend comparison across incompatible units. Crude Throughput is normalized against its own range, as are Distillation Efficiency and Furnace Efficiency. This view reveals lead-lag relationships: furnace efficiency drops often precede distillation efficiency degradation, while throughput changes typically lead all other metrics.', metrics: [{ name: 'Crude Throughput', color: '#3b82f6', meaning: 'bbl/day normalized. Typically moves smoothly unless feed supply or pump changes occur.' }, { name: 'Distillation Efficiency', color: '#8b5cf6', meaning: '% normalized. Sensitive to reflux ratio, column pressure stability, and crude preheat temperature.' }, { name: 'Furnace Efficiency', color: '#10b981', meaning: '% normalized. Sensitive to excess air, tube fouling, and fuel gas composition. Drops here often ripple into column performance 1-2 hrs later.' }], howToRead: 'Watch for sequences: a furnace efficiency drop followed 30-60 minutes later by a distillation efficiency decline is the classic preheat train degradation signature. When throughput rises sharply and both efficiency metrics decline, the feed rate may have exceeded the unit’s optimized operating range. Hover to see actual raw values.', keyInsight: 'The furnace efficiency trend leads distillation efficiency by approximately 1–2 hours. Using this chart for early warning can allow operators to adjust cutpoints or reduce throughput before off-spec products occur.' })} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"><Info className="w-4 h-4" /></button>
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
                                    if (name === 'throughput') return [`${raw.throughput_raw?.toFixed(0)} bbl/d`, 'Crude Throughput'];
                                    if (name === 'distEff') return [`${raw.distEff_raw?.toFixed(1)}%`, 'Distillation Efficiency'];
                                    if (name === 'furnace') return [`${raw.furnace_raw?.toFixed(1)}%`, 'Furnace Efficiency'];
                                    return [value, name];
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} formatter={(v) => v === 'throughput' ? 'Crude Throughput' : v === 'distEff' ? 'Distillation Efficiency' : 'Furnace Efficiency'} />
                            <Line type="monotone" dataKey="throughput" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <Line type="monotone" dataKey="distEff" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <Line type="monotone" dataKey="furnace" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                        </LineChart>
                    </ResponsiveContainer>
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
                    advisory={advisories[0]} // Mocking related advisory
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
