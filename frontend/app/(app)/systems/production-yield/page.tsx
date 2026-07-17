"use client";

import { useState } from 'react';
import KPICard from '@/components/kpi/KPICard';
import KPIModal from '@/components/kpi/KPIModal';
import { useDataStore } from '@/store/dataStore';
import { KPIDefinition } from '@/lib/types';
import { FileBarChart2, BarChart2, GitCompare, Info, PieChart as PieIcon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line, Legend, PieChart, Pie } from 'recharts';
import ChartDescriptionModal, { ChartDescription } from '@/components/charts/ChartDescriptionModal';

const DEFINITIONS: Record<string, KPIDefinition> = {
    gasolineYield: { key: 'gasolineYield', label: 'Gasoline Yield', description: 'Percentage of crude converted to gasoline and naphtha.', formula: '(Gasoline + Naphtha) / Crude Feed × 100', operationalExplanation: 'Higher gasoline yield improves margin (depending on crack spread). Drops can indicate FCC severity or cutpoint changes.', unit: '%', greenMin: 36, amberMin: 32, higherIsBetter: true },
    dieselYield: { key: 'dieselYield', label: 'Diesel Yield', description: 'Percentage of crude converted to diesel and middle distillates.', formula: '(Diesel + Distillates) / Crude Feed × 100', operationalExplanation: 'Tracks middle distillate recovery. Sensitive to distillation cutpoints, hydrotreater constraints, and crude properties.', unit: '%', greenMin: 25, amberMin: 22, higherIsBetter: true },
    jetFuelYield: { key: 'jetFuelYield', label: 'Jet Fuel Yield', description: 'Percentage of crude converted to aviation turbine fuel.', formula: 'Jet Product / Crude Feed × 100', operationalExplanation: 'Jet yield depends on kerosene cut and hydroprocessing capacity. Deviations can signal off-spec or blending constraints.', unit: '%', greenMin: 11, amberMin: 9, higherIsBetter: true },
    lgpOutput: { key: 'lgpOutput', label: 'LPG Output', description: 'Total daily production of liquefied petroleum gas.', formula: 'Σ LPG Product Rate (t/day)', operationalExplanation: 'LPG output relates to cracking severity and gas recovery operation. Sudden drops can indicate compressor/absorber issues.', unit: 't/day', greenMin: 7500, amberMin: 6000, higherIsBetter: true },
    heavyResidue: { key: 'heavyResidue', label: 'Heavy Residue', description: 'Percentage of low-value residual bottom products.', formula: 'Residue / Crude Feed × 100', operationalExplanation: 'Lower residue typically indicates better conversion. Higher residue can mean conversion unit constraints or poor crude quality.', unit: '%', greenMax: 16, amberMax: 20, higherIsBetter: false },
};

export default function ProductionYieldPage() {
    const kpis = useDataStore(s => s.kpis?.productionYield);
    const [selectedKpi, setSelectedKpi] = useState<string | null>(null);
    const [activeChart, setActiveChart] = useState<ChartDescription | null>(null);

    if (!kpis) return <div className="p-8 text-center text-slate-500">Loading telemetry...</div>;

    const yieldData = [
        { name: 'Gasoline', value: kpis.gasolineYield?.value || 38.4, color: '#3b82f6' },
        { name: 'Diesel', value: kpis.dieselYield?.value || 27.1, color: '#10b981' },
        { name: 'Jet Fuel', value: kpis.jetFuelYield?.value || 12.8, color: '#8b5cf6' },
        { name: 'LPG', value: (kpis.lgpOutput?.value || 8420) / 1000, color: '#f59e0b' },
        { name: 'Residue', value: kpis.heavyResidue?.value || 14.2, color: '#ef4444' }
    ];

    const corrGVals = (kpis.gasolineYield?.history || []).map((h: any) => h.value);
    const corrDVals = (kpis.dieselYield?.history || []).map((h: any) => h.value);
    const corrRVals = (kpis.heavyResidue?.history || []).map((h: any) => h.value);
    const corrLen = Math.min(corrGVals.length, corrDVals.length, corrRVals.length);
    const gMin = corrLen ? Math.min(...corrGVals) : 0, gMax = corrLen ? Math.max(...corrGVals) : 100;
    const dvMin = corrLen ? Math.min(...corrDVals) : 0, dvMax = corrLen ? Math.max(...corrDVals) : 100;
    const rMin = corrLen ? Math.min(...corrRVals) : 0, rMax = corrLen ? Math.max(...corrRVals) : 100;

    const correlationData = (kpis.gasolineYield?.history || []).slice(-corrLen).map((h: any, i: number) => {
        const d = new Date(h.timestamp || h.time);
        return {
            time: isNaN(d.getTime()) ? String(i) : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fullDate: isNaN(d.getTime()) ? String(i) : d.toLocaleString(),
            gasoline: gMax === gMin ? 50 : ((corrGVals[i] - gMin) / (gMax - gMin)) * 100,
            diesel: dvMax === dvMin ? 50 : ((corrDVals[i] - dvMin) / (dvMax - dvMin)) * 100,
            residue: rMax === rMin ? 50 : ((corrRVals[i] - rMin) / (rMax - rMin)) * 100,
            gasoline_raw: corrGVals[i],
            diesel_raw: corrDVals[i],
            residue_raw: corrRVals[i],
        };
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                        <FileBarChart2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        Production Yield
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Product slate optimization and refinery margin</p>
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
                            <BarChart2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            Current Product Slate (%)
                        </h3>
                        <button onClick={() => setActiveChart({
                            title: 'Product Slate Bar Chart',
                            chartType: 'Bar Chart',
                            description: 'Displays yield percentages for each major product category as individual bars. LPG is shown scaled (÷1000) for visual comparison with percentage-based products.',
                            metrics: [
                                { name: 'Gasoline', color: '#3b82f6', meaning: 'Motor gasoline + naphtha. Primary high-volume product from FCC and naphtha splitter.' },
                                { name: 'Diesel', color: '#10b981', meaning: 'Middle distillates from atmospheric CDU cut. High-margin product in current market.' },
                                { name: 'Jet Fuel', color: '#8b5cf6', meaning: 'Kerosene-range product from CDU side cut + hydroprocessing.' },
                                { name: 'LPG', color: '#f59e0b', meaning: 'Liquefied petroleum gas. By-product of cracking expressed in t/day ÷ 1000.' },
                                { name: 'Residue', color: '#ef4444', meaning: 'Unconverted heavy bottom product. Lower is better — residue signifies lost conversion opportunity.' },
                            ],
                            howToRead: 'Taller bars for gasoline and diesel vs. residue indicate better yield performance. A growing residue bar signals conversion unit constraints. The LPG bar is proportionally scaled.',
                            keyInsight: 'Compare diesel + gasoline combined share against residue. Target: diesel + gasoline > 60% of slate, residue < 15%.',
                        })} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                            <Info className="w-4 h-4" />
                        </button>
                        </div>
                    </div>
                    <div className="h-[250px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={yieldData} margin={{ top: 0, right: 30, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b', fontWeight: 500 }} dy={10} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}
                                />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                    {yieldData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <PieIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                Yield Share Distribution
                            </h3>
                            <button onClick={() => setActiveChart({
                                title: 'Yield Share Distribution',
                                chartType: 'Donut / Pie Chart',
                                description: 'A donut chart showing each product as a proportional share of total production volume. Immediately reveals how much of the crude barrel is captured as high-value vs. low-value product.',
                                metrics: [
                                    { name: 'Gasoline', color: '#3b82f6', meaning: 'Motor gasoline share. Key margin product with high seasonal demand sensitivity.' },
                                    { name: 'Diesel', color: '#10b981', meaning: 'Middle distillate share. Typically commands the highest crack spread in this market.' },
                                    { name: 'Jet Fuel', color: '#8b5cf6', meaning: 'Aviation fuel share. Niche high-value product dependent on airline demand.' },
                                    { name: 'LPG', color: '#f59e0b', meaning: 'Gas fraction by weight share (scaled equivalent).' },
                                    { name: 'Residue', color: '#ef4444', meaning: 'Bottom-of-barrel heavy residue. Red slice should be minimized for best margin.' },
                                ],
                                howToRead: 'The total of all slices = 100% of barrel output. Ideally the red residue slice is small and the blue/green (gasoline/diesel) slices dominate. Watch for the residue slice growing implying conversion underperformance.',
                                keyInsight: 'If blue + green (gasoline + diesel) exceeds 60% of the donut and red residue stays below 15%, the refinery is in an optimal yield configuration.',
                            })} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                                <Info className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={yieldData} cx="50%" cy="50%" innerRadius="50%" outerRadius="78%" dataKey="value" paddingAngle={3}>
                                    {yieldData.map((entry, index) => (
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
                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                        {yieldData.map(d => (
                            <div key={d.name} className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                                <span>{d.name}</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300 ml-auto">{Number(d.value).toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Correlation Chart */}
            <div className="glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <GitCompare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        KPI Correlation — Gasoline vs Diesel vs Heavy Residue
                    </h3>
                    <button onClick={() => setActiveChart({
                        title: 'Yield Correlation — Gasoline / Diesel / Heavy Residue',
                        chartType: 'Normalised Multi-Line Chart',
                        description: 'Overlays three competing yield streams normalized to 0–100 to reveal their co-movement over time. When gasoline yield rises, does residue fall? Are gasoline and diesel competing for the same cut range?',
                        metrics: [
                            { name: 'Gasoline Yield', color: '#3b82f6', meaning: 'Motor gasoline + naphtha as % of crude feed.' },
                            { name: 'Diesel Yield', color: '#10b981', meaning: 'Middle distillate products as % of crude feed.' },
                            { name: 'Heavy Residue', color: '#ef4444', meaning: 'Unconverted residue fraction. An upward trend here is negative margin signal.' },
                        ],
                        howToRead: 'Look for the red residue line moving inversely to gasoline/diesel lines — this confirms conversion units are working. If all three lines move up together, crude feed quality may have changed. If residue climbs while the others hold steady, investigate FCC or coker throughput.',
                        keyInsight: 'In a well-optimized refinery, gasoline and diesel lines should trend flat-to-up while the residue line trends down over time. Sudden inversion events signal a process upset.',
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
                                    if (name === 'gasoline') return [`${raw.gasoline_raw?.toFixed(1)}%`, 'Gasoline Yield'];
                                    if (name === 'diesel') return [`${raw.diesel_raw?.toFixed(1)}%`, 'Diesel Yield'];
                                    if (name === 'residue') return [`${raw.residue_raw?.toFixed(1)}%`, 'Heavy Residue'];
                                    return [value, name];
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} formatter={(v) => v === 'gasoline' ? 'Gasoline Yield' : v === 'diesel' ? 'Diesel Yield' : 'Heavy Residue'} />
                            <Line type="monotone" dataKey="gasoline" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <Line type="monotone" dataKey="diesel" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <Line type="monotone" dataKey="residue" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
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
