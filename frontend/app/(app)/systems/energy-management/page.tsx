"use client";

import { useState, useMemo } from 'react';
import KPICard from '@/components/kpi/KPICard';
import KPIModal from '@/components/kpi/KPIModal';
import { useDataStore } from '@/store/dataStore';
import { KPIDefinition } from '@/lib/types';
import { Zap, Activity, TrendingDown, GitCompare, Info, BarChart2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, BarChart, Bar } from 'recharts';
import ChartDescriptionModal, { ChartDescription } from '@/components/charts/ChartDescriptionModal';

type TimeRange = '6h' | '12h' | '30h';

const DEFINITIONS: Record<string, KPIDefinition> = {
    energyIntensityIndex: { key: 'energyIntensityIndex', label: 'Energy Intensity Index', description: 'Ratio of actual to standard energy consumption.', formula: 'Total Energy Consumption / Crude Throughput', operationalExplanation: 'Measures refinery energy efficiency. Higher values indicate excess energy per barrel and higher operating cost.', unit: 'GJ/bbl', greenMax: 0.9, amberMax: 1.1, higherIsBetter: false },
    energyPerBarrel: { key: 'energyPerBarrel', label: 'Energy Per Barrel', description: 'Total energy consumed per barrel of crude processed.', formula: 'Total Energy (MJ) / Total Throughput (bbl)', operationalExplanation: 'Normalizes energy usage to production. Tracks utility performance and process heat integration effectiveness.', unit: 'MJ/bbl', greenMax: 165, amberMax: 185, higherIsBetter: false },
    boilerEfficiency: { key: 'boilerEfficiency', label: 'Boiler Efficiency', description: 'Thermal efficiency of utility boilers.', formula: '(Steam Energy Out) / (Fuel Energy In)', operationalExplanation: 'Low efficiency increases fuel gas consumption and CO₂ emissions; indicates fouling, excess air, or poor combustion tuning.', unit: '%', greenMin: 88, amberMin: 82, higherIsBetter: true },
    steamUsage: { key: 'steamUsage', label: 'Steam Usage', description: 'Total high and medium pressure steam consumption.', formula: 'Σ Steam Flow (HP + MP)', operationalExplanation: 'High steam usage can signal leaks, trap failures, or inefficient stripping/reboiler operation.', unit: 't/day', greenMax: 3000, amberMax: 3500, higherIsBetter: false },
    powerConsumption: { key: 'powerConsumption', label: 'Power Consumption', description: 'Total electrical power demand of the facility.', formula: 'Σ Electrical Load (MW)', operationalExplanation: 'Reflects rotating equipment and utility demand. Spikes typically correlate with compressor loading, pump recirculation, or cooling constraints.', unit: 'MW', greenMax: 55, amberMax: 65, higherIsBetter: false },
};

export default function EnergyManagementPage() {
    const kpis = useDataStore(s => s.kpis?.energyManagement);
    const [selectedKpi, setSelectedKpi] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState<TimeRange>('30h');
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

    const powerHistory = kpis.powerConsumption?.history || [];
    const pointsForRange: Record<TimeRange, number> = { '6h': 6, '12h': 12, '30h': 30 };
    const slicedPower = powerHistory.slice(-pointsForRange[timeRange]);

    // Stacked bar: utility mix distribution (power / steam / fuel gas as %-shares)
    const stackedBarData = useMemo(() => {
        const pH = kpis.powerConsumption?.history || [];
        const sH = kpis.steamUsage?.history || [];
        const eH = kpis.energyPerBarrel?.history || [];
        const len = Math.min(pH.length, sH.length, eH.length, pointsForRange[timeRange]);
        if (len === 0) return [];
        const pS = pH.slice(-len);
        const sS = sH.slice(-len);
        const eS = eH.slice(-len);
        return pS.map((h, i) => {
            // scale to comparable MW-equivalent
            const p = h.value;               // MW
            const s = sS[i].value / 50;      // t/day → ~MW equivalent
            const e = eS[i].value / 3;       // MJ/bbl → ~MW equivalent
            const total = p + s + e;
            const pPct = Math.round((p / total) * 100);
            const sPct = Math.round((s / total) * 100);
            const ePct = 100 - pPct - sPct;
            return {
                time: safeFormatTime(h),
                fullDate: safeFormatFullDate(h),
                power: pPct,
                steam: sPct,
                fuelGas: ePct,
                power_raw: h.value.toFixed(1),
                steam_raw: sS[i].value.toFixed(0),
                energy_raw: eS[i].value.toFixed(1),
            };
        });
    }, [kpis.powerConsumption?.history, kpis.steamUsage?.history, kpis.energyPerBarrel?.history, timeRange]);

    const chartData = slicedPower.map((h) => ({
        time: safeFormatTime(h),
        fullDate: safeFormatFullDate(h),
        power: h.value
    }));

    // Correlation chart: Power Consumption vs Energy Intensity vs Boiler Efficiency (normalized)
    const correlationData = useMemo(() => {
        const pH = kpis.powerConsumption?.history || [];
        const eH = kpis.energyIntensityIndex?.history || [];
        const bH = kpis.boilerEfficiency?.history || [];
        const len = Math.min(pH.length, eH.length, bH.length, pointsForRange[timeRange]);
        if (len === 0) return [];

        const pSlice = pH.slice(-len);
        const eSlice = eH.slice(-len);
        const bSlice = bH.slice(-len);

        const norm = (arr: { value: number }[], v: number) => {
            const min = Math.min(...arr.map(h => h.value));
            const max = Math.max(...arr.map(h => h.value));
            return max === min ? 50 : Math.round(((v - min) / (max - min)) * 100);
        };

        return pSlice.map((h, i) => ({
            time: safeFormatTime(h),
            fullDate: safeFormatFullDate(h),
            power: norm(pSlice, h.value),
            intensity: norm(eSlice, eSlice[i].value),
            boiler: norm(bSlice, bSlice[i].value),
            power_raw: h.value,
            intensity_raw: eSlice[i].value,
            boiler_raw: bSlice[i].value,
        }));
    }, [kpis.powerConsumption?.history, kpis.energyIntensityIndex?.history, kpis.boilerEfficiency?.history, timeRange]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                        <Zap className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        Energy Management
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Power, steam, and fuel consumption analytics</p>
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
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            Power Demand Curve (MW) — {timeRange === '6h' ? 'Last 6 Hours' : timeRange === '12h' ? 'Last 12 Hours' : 'Last 30 Hours'}
                        </h3>
                        <div className="flex items-center gap-2">
                        <button onClick={() => setActiveChart({ title: 'Power Demand Curve', chartType: 'Area Chart', description: 'Tracks total electrical power consumption (in megawatts) across the refinery over the selected time window. Spikes typically indicate compressor start-ups, pump recirculation events, or cooling system overloads.', metrics: [{ name: 'Power (MW)', color: '#8b5cf6', meaning: 'Total electrical load drawn by all rotating equipment and utilities.' }], howToRead: 'Monitor for sustained high plateaus (>60 MW) which indicate inefficient equipment operation. Sharp spikes may signal process upsets. The gradient fill is purely visual — the line represents real-time load.', keyInsight: 'Shifting large compressors (C-301) to off-peak hours can reduce peak loads by up to 8 MW.' })} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"><Info className="w-4 h-4" /></button>
                        <div className="flex gap-2 text-[11px]">
                            {(['6h', '12h', '30h'] as TimeRange[]).map(range => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors ${
                                        timeRange === range
                                            ? 'bg-primary-600 text-white border-primary-500'
                                            : 'bg-slate-900/5 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-900/10'
                                    }`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                        </div>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPwr" x1="0" y1="0" x2="0" y2="1">
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
                                    domain={['dataMin - 5', 'dataMax + 5']}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    dx={-10}
                                    label={{ value: 'MW', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}
                                    labelStyle={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}
                                    labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                                />
                                <Area type="monotone" dataKey="power" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorPwr)" dot={{ r: 1 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6">
                        <TrendingDown className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        Top Optimization Opportunities
                    </h3>
                    <div className="space-y-3">
                        <div className="p-3 rounded-lg border border-primary-200 dark:border-primary-800/50 bg-primary-50 dark:bg-primary-900/10 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-semibold text-primary-900 dark:text-primary-300">Furnace F-101 Trim Adjustment</div>
                                <div className="text-xs text-primary-700 dark:text-primary-500 mt-0.5 font-medium">Reduce O2 by 0.5% to save fuel gas</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-primary-700 dark:text-primary-400">-$42K</div>
                                <div className="text-[10px] text-primary-600 dark:text-primary-500 uppercase font-bold">/ month</div>
                            </div>
                        </div>
                        <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Compressor Load Shifting</div>
                                <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">Shift C-301 operation to off-peak hours</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-slate-700 dark:text-slate-400">-$18K</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-500 uppercase font-bold">/ month</div>
                            </div>
                        </div>
                        <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Steam Trap Repair (Area 4)</div>
                                <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">Fix identified blowing steam traps</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-slate-700 dark:text-slate-400">-$9K</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-500 uppercase font-bold">/ month</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Utility Mix Stacked Bar Chart */}
            <div className="glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        Utility Energy Mix Distribution (% Share over Time)
                    </h3>
                    <button onClick={() => setActiveChart({ title: 'Utility Energy Mix Distribution', chartType: 'Stacked Bar Chart', description: 'Shows the proportional contribution of three major utility energy consumers — Electrical Power, Steam, and Fuel Gas — as percentage-of-total across each sampled time point. All values are normalized to a common MW-equivalent basis for fair comparison.', metrics: [{ name: 'Power (Electricity)', color: '#8b5cf6', meaning: 'Direct electrical load (MW). Dominated by compressors, motors, and air coolers.' }, { name: 'Steam', color: '#06b6d4', meaning: 'Steam generation demand (t/day normalized). Used in process heating, stripping columns, and reboilers.' }, { name: 'Fuel Gas', color: '#f59e0b', meaning: 'Energy-per-barrel proxy for furnace and fuel gas consumption. Driven by crude preheat train performance.' }], howToRead: 'Each bar represents a time point. Taller purple segments indicate higher electrical draw. Tall cyan suggests steam demand spikes. When fuel gas (amber) grows, it usually means furnace pass temperatures are elevated. Look for shifts in composition that suggest process changes.', keyInsight: 'A shift toward higher steam share (cyan) with falling fuel gas (amber) often signals improved furnace heat integration — more heat recovered through steam rather than flue gas losses.' })} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"><Info className="w-4 h-4" /></button>
                </div>
                <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stackedBarData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barCategoryGap="20%">
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
                                    if (name === 'power') return [`${value}% (${raw.power_raw} MW)`, 'Electricity'];
                                    if (name === 'steam') return [`${value}% (${raw.steam_raw} t/day)`, 'Steam'];
                                    if (name === 'fuelGas') return [`${value}% (${raw.energy_raw} MJ/bbl)`, 'Fuel Gas'];
                                    return [value, name];
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} formatter={(v) => v === 'power' ? 'Electricity (MW)' : v === 'steam' ? 'Steam (t/day)' : 'Fuel Gas (MJ/bbl)'} />
                            <Bar dataKey="power" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} isAnimationActive={false} />
                            <Bar dataKey="steam" stackId="a" fill="#06b6d4" isAnimationActive={false} />
                            <Bar dataKey="fuelGas" stackId="a" fill="#f59e0b" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Correlation Chart: Power Consumption vs Energy Intensity vs Boiler Efficiency */}
            <div className="glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <GitCompare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        KPI Correlation — Power vs Energy Intensity vs Boiler Efficiency (normalized 0–100)
                    </h3>
                    <button onClick={() => setActiveChart({ title: 'KPI Correlation — Energy Metrics', chartType: 'Multi-Line Chart', description: 'Normalizes three key energy KPIs (0–100 scale) on the same axis to reveal directional relationships and lead/lag effects over time. Power Consumption and Energy Intensity should move together if process conditions are consistent. Boiler Efficiency moving inversely to power may indicate steam supply constraints.', metrics: [{ name: 'Power Consumption', color: '#8b5cf6', meaning: 'Total electrical load (MW), normalized. A rising trend with stable intensity means equipment is less efficient.' }, { name: 'Energy Intensity Index', color: '#ef4444', meaning: 'GJ per barrel normalized. When this leads power upward, it indicates the process is consuming more energy per unit of output before electrical load responds.' }, { name: 'Boiler Efficiency', color: '#10b981', meaning: 'Thermal efficiency (%) normalized. When this drops, steam-to-process decreases, often raising electrical load as substitute.' }], howToRead: 'On x-axis, time flows left to right. Watch for divergence: when power rises but intensity holds flat, electrical waste is occurring. When boiler efficiency falls while power rises, the steam-electric balance is shifting. Hover to see actual raw values.', keyInsight: 'A persistent divergence where Energy Intensity rises faster than Power Consumption often signals feed quality changes (heavier crude), reducing yield while burning the same fuel.' })} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"><Info className="w-4 h-4" /></button>
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
                                    if (name === 'power') return [`${raw.power_raw?.toFixed(1)} MW`, 'Power Consumption'];
                                    if (name === 'intensity') return [`${raw.intensity_raw?.toFixed(2)} GJ/bbl`, 'Energy Intensity'];
                                    if (name === 'boiler') return [`${raw.boiler_raw?.toFixed(1)}%`, 'Boiler Efficiency'];
                                    return [value, name];
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} formatter={(v) => v === 'power' ? 'Power Consumption' : v === 'intensity' ? 'Energy Intensity' : 'Boiler Efficiency'} />
                            <Line type="monotone" dataKey="power" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <Line type="monotone" dataKey="intensity" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <Line type="monotone" dataKey="boiler" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
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
