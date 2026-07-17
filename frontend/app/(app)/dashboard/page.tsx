 "use client";

import { useState, useMemo } from 'react';
import KPICard from '@/components/kpi/KPICard';
import KPIModal from '@/components/kpi/KPIModal';
import AlertsFeed from '@/components/dashboard/AlertsFeed';
import DigitalTwinPreview from '@/components/dashboard/DigitalTwinPreview';
import { useDataStore } from '@/store/dataStore';
import { KPIDefinition } from '@/lib/types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, LineChart, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell } from 'recharts';
import { Activity, ArrowRight, TrendingUp, GitCompare, Info, PieChart as PieIcon, Radio } from 'lucide-react';
import Link from 'next/link';
import { linearForecast } from '@/lib/forecast';
import ChartDescriptionModal, { ChartDescription } from '@/components/charts/ChartDescriptionModal';

type TimeRange = '6h' | '12h' | '30h';

const DEFINITIONS: Record<string, KPIDefinition> = {
    crudeThroughput: { key: 'crudeThroughput', label: 'Crude Throughput', description: 'Total volume of crude oil processed through the primary distillation units per day.', formula: 'Σ CDU Feed Flow (bbl/day)', operationalExplanation: 'Core production KPI. Sustained throughput above 95,000 bbl/day meets revenue targets. Drops indicate feed supply issues, unit constraints, or planned maintenance.', unit: 'bbl/day', greenMin: 95000, amberMin: 80000, higherIsBetter: true },
    equipmentUptime: { key: 'equipmentUptime', label: 'Equipment Uptime', description: 'Percentage of time critical equipment is operational.', formula: '(Operating Time / Total Time) × 100', operationalExplanation: 'Measures availability. Low uptime drives throughput loss and increases safety risk from repeated startups/shutdowns.', unit: '%', greenMin: 95, amberMin: 90, higherIsBetter: true },
    grossRefiningMargin: { key: 'grossRefiningMargin', label: 'Gross Refining Margin', description: 'Revenue from refined products minus the cost of crude oil, per barrel processed.', formula: '(Σ Product Sales Revenue − Crude Cost) / Throughput', operationalExplanation: 'Primary financial KPI for refinery profitability. GRM is driven by crude-product price spreads, yield performance, and energy cost efficiency.', unit: '$/bbl', greenMin: 7, amberMin: 5, higherIsBetter: true },
    productYield: { key: 'productYieldRatio', label: 'Product Yield', description: 'Ratio of valuable liquid products to total crude feed processed.', formula: '(Total Liquid Product / Total Feed) × 100', operationalExplanation: 'High yield indicates efficient conversion with minimal residue or losses. Decline in yield may point to fractionation column issues or feed quality changes.', unit: '%', greenMin: 82, amberMin: 78, higherIsBetter: true },
    safetyIndex: { key: 'pressureSafetyIndex', label: 'Safety Index', description: 'Composite index of pressure system integrity and safety performance.', formula: 'Weighted composite of pressure deviations, PSV actuations, and near-miss events', operationalExplanation: 'Safety index below 95% indicates active pressure safety concerns. Critical drops require immediate review of relief device settings and upstream process control.', unit: '%', greenMin: 95, amberMin: 88, higherIsBetter: true },
    environmentalComplianceIndex: { key: 'environmentalComplianceIndex', label: 'Env. Compliance', description: 'Composite index measuring compliance with environmental permit limits across all emission streams.', formula: 'Weighted score of SOx, NOx, CO₂, flare, and water discharge against permit thresholds', operationalExplanation: 'Index below 85% signals that one or more emission categories are approaching or breaching permit limits, triggering regulatory risk.', unit: '%', greenMin: 85, amberMin: 75, higherIsBetter: true },
};

export default function DashboardPage() {
    const kpis = useDataStore(s => s.kpis);
    const [timeRange, setTimeRange] = useState<TimeRange>('30h');
    const [showPrediction, setShowPrediction] = useState(false);
    const [selectedKpi, setSelectedKpi] = useState<string | null>(null);
    const [activeChart, setActiveChart] = useState<ChartDescription | null>(null);

    const safeFormatTime = (h: any) => {
        const d = new Date(h.timestamp || h.time);
        if (isNaN(d.getTime())) return h.time || 'N/A';
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const safeFormatFullDate = (h: any) => {
        const d = new Date(h.timestamp || h.time);
        if (isNaN(d.getTime())) return h.time || 'N/A';
        return d.toLocaleString();
    };

    const crudeThroughput = kpis?.crudeProcessing?.crudeThroughput;
    const equipmentUptime = kpis?.equipmentHealth?.equipmentUptime;
    const grossRefiningMargin = kpis?.crudeProcessing?.grossRefiningMargin;
    const productYield = kpis?.crudeProcessing?.productYieldRatio;
    const safetyIndex = kpis?.safety?.pressureSafetyIndex;
    const environmentalComplianceIndex = kpis?.environmental?.environmentalComplianceIndex;

    const history = crudeThroughput?.history || [];
    const pointsForRange: Record<TimeRange, number> = { '6h': 6, '12h': 12, '30h': 30 };
    const slicedHistory = history.slice(-pointsForRange[timeRange]);

    const chartData = useMemo(() => {
        const base = slicedHistory.map(h => ({
            time: safeFormatTime(h),
            fullDate: safeFormatFullDate(h),
            throughput: h.value,
            target: 100000,
        }));
        if (!showPrediction || base.length === 0) return base;
        const values = base.map(p => p.throughput);
        const pred = linearForecast(values.slice(-Math.min(values.length, 30)), 7);
        const lastTime = new Date(base[base.length - 1].fullDate);
        const future = pred.map((v, i) => {
            const t = new Date(lastTime.getTime() + (i + 1) * 24 * 60 * 60 * 1000).toISOString();
            return { time: t, fullDate: t, throughput: base[base.length - 1].throughput, target: 100000, predicted: Number(v.toFixed(2)) };
        });
        return [...base, ...future];
    }, [slicedHistory, showPrediction]);

    // Correlation chart: Throughput (normalized) vs GRM (normalized) vs Product Yield (normalized)
    const correlationData = useMemo(() => {
        const tH = crudeThroughput?.history || [];
        const gH = grossRefiningMargin?.history || [];
        const yH = productYield?.history || [];
        const len = Math.min(tH.length, gH.length, yH.length, pointsForRange[timeRange]);
        if (len === 0) return [];

        const tSlice = tH.slice(-len);
        const gSlice = gH.slice(-len);
        const ySlice = yH.slice(-len);

        const tMin = Math.min(...tSlice.map(h => h.value)), tMax = Math.max(...tSlice.map(h => h.value));
        const gMin = Math.min(...gSlice.map(h => h.value)), gMax = Math.max(...gSlice.map(h => h.value));
        const yMin = Math.min(...ySlice.map(h => h.value)), yMax = Math.max(...ySlice.map(h => h.value));

        const norm = (v: number, min: number, max: number) => max === min ? 50 : Math.round(((v - min) / (max - min)) * 100);

        return tSlice.map((h, i) => ({
            time: safeFormatTime(h),
            fullDate: safeFormatFullDate(h),
            throughput: norm(h.value, tMin, tMax),
            grm: norm(gSlice[i].value, gMin, gMax),
            yield: norm(ySlice[i].value, yMin, yMax),
            throughput_raw: h.value,
            grm_raw: gSlice[i].value,
            yield_raw: ySlice[i].value,
        }));
    }, [crudeThroughput?.history, grossRefiningMargin?.history, productYield?.history, timeRange]);

    // Radar: system health scores (0-100)
    const radarData = useMemo(() => [
        { subject: 'Crude', score: Math.round((kpis?.crudeProcessing?.crudeThroughput?.value || 95000) / 1200), fullMark: 100 },
        { subject: 'Equipment', score: Math.round(kpis?.equipmentHealth?.equipmentUptime?.value || 97), fullMark: 100 },
        { subject: 'Energy', score: Math.round(100 - ((kpis?.energyManagement?.energyIntensityIndex?.value || 0.82) / 1.5) * 100), fullMark: 100 },
        { subject: 'Yield', score: Math.round(kpis?.crudeProcessing?.productYieldRatio?.value || 84), fullMark: 100 },
        { subject: 'Safety', score: Math.round(kpis?.safety?.pressureSafetyIndex?.value || 97), fullMark: 100 },
        { subject: 'Env.', score: Math.round(kpis?.environmental?.environmentalComplianceIndex?.value || 87), fullMark: 100 },
    ], [kpis]);

    // Product slate donut (from production yield)
    const slateData = useMemo(() => [
        { name: 'Gasoline', value: kpis?.productionYield?.gasolineYield?.value || 38.4, color: '#3b82f6' },
        { name: 'Diesel', value: kpis?.productionYield?.dieselYield?.value || 27.1, color: '#10b981' },
        { name: 'Jet Fuel', value: kpis?.productionYield?.jetFuelYield?.value || 12.8, color: '#8b5cf6' },
        { name: 'LPG', value: Math.round((kpis?.productionYield?.lgpOutput?.value || 8420) / 450), color: '#f59e0b' },
        { name: 'Residue', value: kpis?.productionYield?.heavyResidue?.value || 14.2, color: '#ef4444' },
    ], [kpis]);

    // Modal lookup: map selectedKpi key to its subsystem + definition
    const kpiModalData = useMemo(() => {
        if (!selectedKpi) return null;
        const def = DEFINITIONS[selectedKpi];
        if (!def) return null;
        const kpiKey = def.key;
        let kpiData = null;
        if (selectedKpi === 'crudeThroughput') kpiData = kpis?.crudeProcessing?.crudeThroughput;
        else if (selectedKpi === 'equipmentUptime') kpiData = kpis?.equipmentHealth?.equipmentUptime;
        else if (selectedKpi === 'grossRefiningMargin') kpiData = kpis?.crudeProcessing?.grossRefiningMargin;
        else if (selectedKpi === 'productYield') kpiData = kpis?.crudeProcessing?.productYieldRatio;
        else if (selectedKpi === 'safetyIndex') kpiData = kpis?.safety?.pressureSafetyIndex;
        else if (selectedKpi === 'environmentalComplianceIndex') kpiData = kpis?.environmental?.environmentalComplianceIndex;
        return { def, kpiData };
    }, [selectedKpi, kpis]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Refinery Operations Dashboard</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Enterprise-wide performance overview — Live Telemetry</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 text-xs font-semibold bg-status-normal/10 text-status-normal px-3 py-1.5 rounded-full border border-status-normal/20">
                        <span className="w-2 h-2 rounded-full bg-status-normal animate-pulse"></span>
                        System Online
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono hidden sm:block">
                        Last sync: {new Date().toLocaleTimeString()}
                    </span>
                </div>
            </div>

            {/* Top Global KPIs — click to expand */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <KPICard title="Crude Throughput" kpi={crudeThroughput} onClick={() => setSelectedKpi('crudeThroughput')} />
                <KPICard title="Equipment Uptime" kpi={equipmentUptime} onClick={() => setSelectedKpi('equipmentUptime')} />
                <KPICard title="Gross Refining Margin" kpi={grossRefiningMargin} onClick={() => setSelectedKpi('grossRefiningMargin')} />
                <KPICard title="Product Yield" kpi={productYield} onClick={() => setSelectedKpi('productYield')} />
                <KPICard title="Safety Index" kpi={safetyIndex} onClick={() => setSelectedKpi('safetyIndex')} />
                <KPICard title="Env. Compliance" kpi={environmentalComplianceIndex} onClick={() => setSelectedKpi('environmentalComplianceIndex')} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[400px]">
                {/* Digital Twin Preview */}
                <div className="lg:col-span-2 shadow-sm rounded-xl overflow-hidden">
                    <DigitalTwinPreview />
                </div>

                {/* Live Alerts */}
                <div className="lg:col-span-1 shadow-sm rounded-xl overflow-hidden">
                    <AlertsFeed />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Operational Performance Chart */}
                <div className="lg:col-span-2 glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                Production Throughput ({timeRange === '6h' ? 'Last 6 Hours' : timeRange === '12h' ? 'Last 12 Hours' : 'Last 30 Hours'})
                            </h3>
                            <button onClick={() => setActiveChart({
                                title: 'Production Throughput',
                                chartType: 'Area Chart',
                                description: 'Tracks real-time crude oil throughput (bbl/day) processed by the Crude Distillation Unit. The dashed line shows the operational target of 100,000 bbl/day.',
                                metrics: [
                                    { name: 'Actual Throughput', color: '#3b82f6', meaning: 'Measured crude feed to CDU/VDU in barrels per day. This is the primary production volume driver.' },
                                    { name: 'Target Line', color: '#475569', meaning: 'Operational target of 100,000 bbl/day — the threshold required to meet revenue and margin targets.' },
                                    { name: 'Predicted Trend', color: '#3b82f6', meaning: '7-point linear forecast based on the most recent trend. Enable using the "Predict Trend" button.' },
                                ],
                                howToRead: 'The shaded blue area represents actual production volume over time. When the area dips below the dashed target line, production is under-performing. Sudden drops indicate feed supply disruption, equipment trips, or maintenance outages.',
                                keyInsight: 'A 1% drop in throughput below 95,000 bbl/day directly reduces refinery margin. Use the time range selector to zoom into recent hours for incident investigation.',
                            })} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                                <Info className="w-4 h-4" />
                            </button>
                        </div>
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
                            <button
                                onClick={() => setShowPrediction((s) => !s)}
                                className="text-[10px] px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                {showPrediction ? 'Hide' : 'Predict'} Trend
                            </button>
                        </div>
                        <div className="flex gap-4">
                            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                                <span className="w-3 h-3 rounded bg-primary-500"></span> Actual (bbl/d)
                            </span>
                            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                                <span className="w-3 h-3 rounded bg-slate-300 dark:bg-slate-700 border border-slate-400 dark:border-slate-600 border-dashed"></span> Target
                            </span>
                        </div>
                    </div>

                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
                                    label={{ value: 'bbl/day', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}
                                    labelStyle={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}
                                    labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                                />
                                <Area type="monotone" dataKey="target" stroke="#475569" strokeDasharray="5 5" fill="none" strokeWidth={2} dot={false} />
                                <Area type="monotone" dataKey="throughput" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorThroughput)" dot={{ r: 2, fill: '#3b82f6' }} />
                                {showPrediction && (
                                    <Line
                                        type="monotone"
                                        dataKey="predicted"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        strokeDasharray="6 4"
                                        dot={false}
                                        isAnimationActive={false}
                                    />
                                )}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Subsystem Health Radar */}
                <div className="glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Radio className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            Subsystem Health
                        </h3>
                        <button onClick={() => setActiveChart({
                            title: 'Subsystem Health Radar',
                            chartType: 'Radar / Spider Chart',
                            description: 'A spider chart comparing the relative health scores of all six operational subsystems on a 0–100 scale. Each axis represents one subsystem, and the shaded area shows overall system balance.',
                            metrics: [
                                { name: 'Crude Processing', color: '#3b82f6', meaning: 'Normalized crude throughput relative to design capacity (102,500 bbl/day).' },
                                { name: 'Equipment Health', color: '#3b82f6', meaning: 'Equipment uptime percentage — the proportion of time critical equipment is operational.' },
                                { name: 'Energy Efficiency', color: '#3b82f6', meaning: 'Inverse of energy intensity index. Higher score = lower energy consumption per barrel.' },
                                { name: 'Product Yield', color: '#3b82f6', meaning: 'Product yield ratio: how much of the crude input becomes saleable liquid products.' },
                                { name: 'Safety', color: '#3b82f6', meaning: 'Pressure safety index — composite health of pressure relief valves and burst discs.' },
                                { name: 'Environmental', color: '#3b82f6', meaning: 'Environmental compliance index — aggregate compliance with permit limits across all emission streams.' },
                            ],
                            howToRead: 'A perfectly shaped hexagon indicates all subsystems performing at 100%. Watch for "dips" — a concave edge on one axis signals that subsystem needs attention. When two adjacent axes both dip, investigate cross-subsystem dependencies.',
                            keyInsight: 'Energy efficiency scores often inversely correlate with throughput — higher crude rates increase per-barrel energy costs. A balanced portfolio scores above 85 on all axes.',
                        })} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                            <Info className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1 h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                <PolarGrid stroke="#334155" opacity={0.3} />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="Health" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b' }}
                                    itemStyle={{ fontSize: '12px', color: '#f8fafc' }}
                                    formatter={(v: any) => [`${v}/100`, 'Health Score']}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-2 space-y-1.5">
                        {[
                            { name: 'Crude Processing', status: kpis?.crudeProcessing?.crudeThroughput?.status || 'normal', href: '/systems/crude-processing' },
                            { name: 'Equipment Health', status: kpis?.equipmentHealth?.mttr?.status || 'warning', href: '/systems/equipment-health' },
                            { name: 'Energy Management', status: kpis?.energyManagement?.energyIntensityIndex?.status || 'normal', href: '/systems/energy-management' },
                            { name: 'Production Yield', status: kpis?.productionYield?.heavyResidue?.status || 'normal', href: '/systems/production-yield' },
                            { name: 'Environmental', status: kpis?.environmental?.soxEmissions?.status || 'critical', href: '/systems/environmental' },
                            { name: 'Safety Monitoring', status: kpis?.safety?.leakDetectionEvents?.status || 'normal', href: '/systems/safety' }
                        ].map(sys => (
                            <Link key={sys.name} href={sys.href} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{sys.name}</span>
                                <div className="flex items-center gap-2">
                                    <span className={`status-dot ${sys.status}`} />
                                    <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-primary-500 transition-colors group-hover:translate-x-0.5" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Correlation + Slate row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Correlation Chart: Throughput vs GRM vs Product Yield */}
            <div className="lg:col-span-2 glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <GitCompare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            KPI Correlation — Throughput vs Margin vs Yield
                        </h3>
                        <button onClick={() => setActiveChart({
                            title: 'KPI Correlation — Throughput / Margin / Yield',
                            chartType: 'Normalised Multi-Line Chart',
                            description: 'Overlays three critical business KPIs on a common 0–100 normalized scale to reveal how they move together over time. Values are scaled to their own historical min/max — actual values appear in the hover tooltip.',
                            metrics: [
                                { name: 'Crude Throughput', color: '#3b82f6', meaning: 'Volume of crude processed (bbl/day). Forms the revenue base — other KPIs are affected when this changes.' },
                                { name: 'Gross Refining Margin', color: '#10b981', meaning: 'Revenue from products minus crude cost per barrel ($/bbl). Primary profitability signal.' },
                                { name: 'Product Yield', color: '#f59e0b', meaning: 'Percentage of crude feed converted to saleable liquid products. Measures conversion efficiency.' },
                            ],
                            howToRead: 'When all three lines move together (positive correlation), the refinery is operating in a stable, integrated state. If GRM diverges from throughput, crude-product spreads are changing. If yield drops while throughput is stable, conversion efficiency is declining.',
                            keyInsight: 'Divergence between GRM and Yield is an early signal of either crude assay changes or FCC/conversion unit issues. Target all three lines trending upward simultaneously for optimal margin performance.',
                        })} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                            <Info className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Values normalized 0–100. Hover for actuals.</p>
                </div>
                <div className="h-[220px] w-full">
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
                                    if (name === 'throughput') return [`${raw.throughput_raw?.toLocaleString()} bbl/day`, 'Throughput'];
                                    if (name === 'grm') return [`$${raw.grm_raw?.toFixed(2)}/bbl`, 'Gross Margin'];
                                    if (name === 'yield') return [`${raw.yield_raw?.toFixed(1)}%`, 'Product Yield'];
                                    return [value, name];
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} formatter={(v) => v === 'throughput' ? 'Crude Throughput' : v === 'grm' ? 'Gross Refining Margin' : 'Product Yield'} />
                            <Line type="monotone" dataKey="throughput" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <Line type="monotone" dataKey="grm" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <Line type="monotone" dataKey="yield" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Product Slate Donut */}
            <div className="glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <PieIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        Product Slate
                    </h3>
                    <button onClick={() => setActiveChart({
                        title: 'Product Slate Distribution',
                        chartType: 'Donut / Pie Chart',
                        description: 'Shows the current product slate — the proportional breakdown of what the refinery is producing from each barrel of crude. This directly drives revenue since different products command different crack spreads.',
                        metrics: [
                            { name: 'Gasoline', color: '#3b82f6', meaning: 'Motor gasoline and naphtha blendstocks. Highest volume product; margin sensitive to seasonal demand.' },
                            { name: 'Diesel', color: '#10b981', meaning: 'Diesel and middle distillates. Typically the highest-margin product in European/Asian markets.' },
                            { name: 'Jet Fuel', color: '#8b5cf6', meaning: 'Aviation turbine fuel (ATF/Jet A1). Niche but high-value in periods of strong air travel demand.' },
                            { name: 'LPG', color: '#f59e0b', meaning: 'Liquefied petroleum gas (propane/butane). By-product of cracking. Margin varies with petrochemical demand.' },
                            { name: 'Residue', color: '#ef4444', meaning: 'Heavy fuel oil / vacuum residue. Low-value bottom-of-barrel product. Minimizing residue improves overall margin.' },
                        ],
                        howToRead: 'A wider diesel/gasoline slice relative to residue = better margin profile. If the red residue slice grows, it indicates conversion units (FCC/coker) are underperforming or crude quality has degraded.',
                        keyInsight: 'Target: residue < 15% of total slate. Every 1% shift from residue to gasoline/diesel improves GRM by approximately $0.20–0.35/bbl at typical crack spreads.',
                    })} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                        <Info className="w-4 h-4" />
                    </button>
                </div>
                <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={slateData} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" dataKey="value" paddingAngle={3}>
                                {slateData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b' }}
                                itemStyle={{ fontSize: '12px', color: '#f8fafc' }}
                                formatter={(v: any, name: any) => [`${Number(v).toFixed(1)}%`, name]}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                    {slateData.map(d => (
                        <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                            <span>{d.name}</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 ml-auto">{Number(d.value).toFixed(1)}%</span>
                        </div>
                    ))}
                </div>
            </div>
            </div>

            {/* KPI Detail Modal */}
            {selectedKpi && kpiModalData && (
                <KPIModal
                    title={kpiModalData.def.label}
                    definition={kpiModalData.def.description}
                    formula={kpiModalData.def.formula}
                    operationalExplanation={kpiModalData.def.operationalExplanation}
                    kpiKey={kpiModalData.def.key}
                    kpi={kpiModalData.kpiData!}
                    thresholds={{
                        green: kpiModalData.def.higherIsBetter ? `> ${kpiModalData.def.greenMin} ${kpiModalData.def.unit}` : `< ${kpiModalData.def.greenMax} ${kpiModalData.def.unit}`,
                        amber: kpiModalData.def.higherIsBetter ? `${kpiModalData.def.amberMin}–${kpiModalData.def.greenMin} ${kpiModalData.def.unit}` : `${kpiModalData.def.greenMax}–${kpiModalData.def.amberMax} ${kpiModalData.def.unit}`,
                        red: kpiModalData.def.higherIsBetter ? `< ${kpiModalData.def.amberMin} ${kpiModalData.def.unit}` : `> ${kpiModalData.def.amberMax} ${kpiModalData.def.unit}`,
                    }}
                    onClose={() => setSelectedKpi(null)}
                />
            )}
            {activeChart && <ChartDescriptionModal chart={activeChart} onClose={() => setActiveChart(null)} />}
        </div>
    );
}
