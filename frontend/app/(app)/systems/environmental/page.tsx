"use client";

import { useState, useMemo } from 'react';
import KPICard from '@/components/kpi/KPICard';
import KPIModal from '@/components/kpi/KPIModal';
import { useDataStore } from '@/store/dataStore';
import { KPIDefinition } from '@/lib/types';
import { Leaf, Wind, AlertOctagon, GitCompare, Info, Layers } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import ChartDescriptionModal, { ChartDescription } from '@/components/charts/ChartDescriptionModal';

const DEFINITIONS: Record<string, KPIDefinition> = {
    co2Emissions: { key: 'co2Emissions', label: 'CO2 Emissions', description: 'Total equivalent carbon dioxide released into atmosphere.', formula: 'Σ Emissions (tCO₂e/day)', operationalExplanation: 'Tracks carbon footprint. High emissions typically align with high fuel burn, poor efficiency, or flaring events.', unit: 't/day', greenMax: 2000, amberMax: 2500, higherIsBetter: false },
    soxEmissions: { key: 'soxEmissions', label: 'SOx Emissions', description: 'Sulfur oxides released, primarily from FCC and boilers.', formula: 'Σ SOx (t/day)', operationalExplanation: 'SOx is a compliance-critical pollutant. Excursions can indicate scrubber issues, high sulfur feed, or combustion tuning problems.', unit: 't/day', greenMax: 3, amberMax: 5, higherIsBetter: false },
    noxEmissions: { key: 'noxEmissions', label: 'NOx Emissions', description: 'Nitrogen oxides released during combustion processes.', formula: 'Σ NOx (t/day)', operationalExplanation: 'NOx correlates with flame temperature and excess air. Elevated NOx often suggests burner tuning or staged combustion issues.', unit: 't/day', greenMax: 2.5, amberMax: 4, higherIsBetter: false },
    flareGasVolume: { key: 'flareGasVolume', label: 'Flare Gas Volume', description: 'Volume of gas combusted in the flare system.', formula: 'Σ Flare Flow (Nm³/h)', operationalExplanation: 'High flare volumes indicate upset conditions and lost hydrocarbons. Should trigger operational investigation and possible work orders.', unit: 'Nm³/h', greenMax: 100, amberMax: 150, higherIsBetter: false },
    waterDischargeQuality: { key: 'waterDischargeQuality', label: 'Water Discharge Quality', description: 'Effluent quality compliance index vs environmental limits.', formula: 'Compliance Index (0–100%)', operationalExplanation: 'Represents effluent treatment performance. Drops can indicate treatment upsets or equipment issues in the ETP.', unit: '%', greenMin: 90, amberMin: 85, higherIsBetter: true },
};

export default function EnvironmentalPage() {
    const kpis = useDataStore(s => s.kpis?.environmental);
    const [selectedKpi, setSelectedKpi] = useState<string | null>(null);
    const [activeChart, setActiveChart] = useState<ChartDescription | null>(null);

    // Stacked area: CO2 + SOx + NOx normalized (each 0-100) then stacked
    const stackedAreaData = useMemo(() => {
        if (!kpis) return [];
        const co2H: any[] = kpis.co2Emissions?.history || [];
        const soxH: any[] = kpis.soxEmissions?.history || [];
        const noxH: any[] = kpis.noxEmissions?.history || [];
        const len = Math.min(co2H.length, soxH.length, noxH.length, 30);
        if (len === 0) return [];
        const co2S = co2H.slice(-len), soxS = soxH.slice(-len), noxS = noxH.slice(-len);
        const norm = (arr: any[]) => {
            const vals = arr.map((h: any) => h.value);
            const mn = Math.min(...vals), mx = Math.max(...vals);
            return arr.map((h: any) => mx === mn ? 50 : Math.round(((h.value - mn) / (mx - mn)) * 100));
        };
        const t = (h: any) => { const d = new Date(h.timestamp || h.time); return isNaN(d.getTime()) ? (h.time || '') : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
        const ft = (h: any) => { const d = new Date(h.timestamp || h.time); return isNaN(d.getTime()) ? (h.time || '') : d.toLocaleString(); };
        const cn = norm(co2S), sn = norm(soxS), nn = norm(noxS);
        return co2S.map((h: any, i: number) => ({
            time: t(h), fullDate: ft(h),
            co2: cn[i], sox: sn[i], nox: nn[i],
            co2_raw: co2S[i].value.toFixed(0),
            sox_raw: soxS[i].value.toFixed(2),
            nox_raw: noxS[i].value.toFixed(2),
        }));
    }, [kpis?.co2Emissions?.history, kpis?.soxEmissions?.history, kpis?.noxEmissions?.history]);

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

    const chartData = kpis.soxEmissions?.history?.map((h, i) => ({
        time: safeFormatTime(h),
        fullDate: safeFormatFullDate(h),
        sox: h.value
    })) || [];

    const corrCVals = (kpis.co2Emissions?.history || []).map((h: any) => h.value);
    const corrSVals = (kpis.soxEmissions?.history || []).map((h: any) => h.value);
    const corrNVals = (kpis.noxEmissions?.history || []).map((h: any) => h.value);
    const corrLen = Math.min(corrCVals.length, corrSVals.length, corrNVals.length);
    const cMin = corrLen ? Math.min(...corrCVals) : 0, cMax = corrLen ? Math.max(...corrCVals) : 100;
    const sMin = corrLen ? Math.min(...corrSVals) : 0, sMax = corrLen ? Math.max(...corrSVals) : 100;
    const nMin = corrLen ? Math.min(...corrNVals) : 0, nMax = corrLen ? Math.max(...corrNVals) : 100;

    const correlationData = (kpis.co2Emissions?.history || []).slice(-corrLen).map((h: any, i: number) => {
        const d = new Date(h.timestamp || h.time);
        return {
            time: isNaN(d.getTime()) ? String(i) : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fullDate: isNaN(d.getTime()) ? String(i) : d.toLocaleString(),
            co2: cMax === cMin ? 50 : ((corrCVals[i] - cMin) / (cMax - cMin)) * 100,
            sox: sMax === sMin ? 50 : ((corrSVals[i] - sMin) / (sMax - sMin)) * 100,
            nox: nMax === nMin ? 50 : ((corrNVals[i] - nMin) / (nMax - nMin)) * 100,
            co2_raw: corrCVals[i],
            sox_raw: corrSVals[i],
            nox_raw: corrNVals[i],
        };
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                        <Leaf className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        Environmental Monitoring
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Real-time emissions tracking and compliance</p>
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
                            <Wind className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            SOx Emissions Trend (Stack S-3)
                        </h3>
                        <button onClick={() => setActiveChart({ title: 'SOx Emissions Trend', chartType: 'Area Chart', description: 'Tracks sulfur dioxide (SOx) emissions from Stack S-3 over time, in tonnes per day. SOx is produced primarily from FCC regenerator operations and boiler combustion of high-sulfur fuel gas. It is a critical regulated pollutant with strict daily permit limits.', metrics: [{ name: 'SOx (t/day)', color: '#ef4444', meaning: 'Total sulfur oxide emissions measured at Stack S-3. Limit: 3 t/day (green), 5 t/day (amber). Exceeding 5 t/day triggers regulatory reporting.' }], howToRead: 'Flat line at low values is the ideal. Rising trends should prompt investigation into FCC feed sulfur content, scrubber water flow, or boiler combustion adjustment. Any sustained value above 3 t/day should trigger a work order on the feed desulfurization unit.', keyInsight: 'Sudden SOx spikes with stable feed rates typically indicate scrubber performance degradation — check caustic circulation rates and demister integrity.' })} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"><Info className="w-4 h-4" /></button>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSox" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
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
                                    label={{ value: 't/day', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}
                                    labelStyle={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}
                                    labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                                />
                                <Area type="monotone" dataKey="sox" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorSox)" dot={{ r: 1 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6">
                        <AlertOctagon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        Compliance Watchlist
                    </h3>
                    <div className="space-y-3">
                        <div className="p-3 rounded-lg border border-status-critical/30 bg-status-critical/5 dark:bg-status-critical/10 flex items-start gap-3">
                            <div className="mt-0.5"><div className="w-2 h-2 rounded-full bg-status-critical animate-pulse" /></div>
                            <div>
                                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">SOx Regulatory Limit Approaching</div>
                                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Stack S-3 reading at 94% of EPA daily allowance. Immediate reduction in FCC feed rate recommended.</div>
                            </div>
                        </div>
                        <div className="p-3 rounded-lg border border-status-warning/30 bg-status-warning/5 dark:bg-status-warning/10 flex items-start gap-3">
                            <div className="mt-0.5"><div className="w-2 h-2 rounded-full bg-status-warning" /></div>
                            <div>
                                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Flaring Event Detected</div>
                                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Unexpected flow to Area 2 flare header. Investigation required to identify source unit.</div>
                            </div>
                        </div>
                        <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-start gap-3">
                            <div className="mt-0.5"><div className="w-2 h-2 rounded-full bg-status-normal" /></div>
                            <div>
                                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Water Discharge Compliant</div>
                                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Effluent pH and hydrocarbon content within local municipal limits.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stacked Area: Normalized CO2 + SOx + NOx over time */}
            <div className="glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        Combined Emissions Signature — CO₂, SOx &amp; NOx (normalized, stacked)
                    </h3>
                    <button onClick={() => setActiveChart({ title: 'Combined Emissions Signature', chartType: 'Stacked Area Chart', description: 'Shows all three major pollutants (CO₂, SOx, NOx) on a single stacked area chart, each normalized independently to a 0–100 scale based on their individual range across the selected window. Stacking reveals the total relative environmental burden and which pollutant is driving changes at any given moment.', metrics: [{ name: 'CO₂ (normalized)', color: '#ef4444', meaning: 'Carbon dioxide deviation from its own recent min/max range. Always the bottom layer.' }, { name: 'SOx (normalized)', color: '#f59e0b', meaning: 'Sulfur oxide deviation normalized. Mid layer. Most volatile as scrubber performance fluctuates.' }, { name: 'NOx (normalized)', color: '#8b5cf6', meaning: 'Nitrogen oxide deviation normalized. Top layer. Driven by combustion temperature spikes.' }], howToRead: 'All three share the same 0–100 normalized axis to enable relative comparison. When all three bands widen simultaneously, a broad process upset is occurring. If only one band grows, the cause is pollutant-specific. The total stacked height represents overall emissions pressure — not an absolute value. Hover to see actual raw readings.', keyInsight: 'When SOx and NOx both trend upward while CO₂ stays flat, it typically indicates a combustion air ratio problem rather than a feed quality change.' })} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"><Info className="w-4 h-4" /></button>
                </div>
                <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stackedAreaData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <defs>
                                <linearGradient id="gcO2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.5} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} /></linearGradient>
                                <linearGradient id="gcSOx" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} /></linearGradient>
                                <linearGradient id="gcNOx" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} /></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dx={-5} unit="" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b' }}
                                itemStyle={{ fontSize: '11px', color: '#f8fafc' }}
                                labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
                                labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                                formatter={(value: any, name: any, props: any) => {
                                    const raw = props.payload;
                                    if (name === 'co2') return [`${value}/100 (${raw.co2_raw} t/day)`, 'CO₂'];
                                    if (name === 'sox') return [`${value}/100 (${raw.sox_raw} t/day)`, 'SOx'];
                                    if (name === 'nox') return [`${value}/100 (${raw.nox_raw} t/day)`, 'NOx'];
                                    return [value, name];
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} formatter={(v) => v === 'co2' ? 'CO₂' : v === 'sox' ? 'SOx' : 'NOx'} />
                            <Area type="monotone" dataKey="co2" stackId="a" stroke="#ef4444" fill="url(#gcO2)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                            <Area type="monotone" dataKey="sox" stackId="a" stroke="#f59e0b" fill="url(#gcSOx)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                            <Area type="monotone" dataKey="nox" stackId="a" stroke="#8b5cf6" fill="url(#gcNOx)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Correlation Chart */}
            <div className="glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <GitCompare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        KPI Correlation — CO₂ vs SOx vs NOx Emissions (normalized 0–100)
                    </h3>
                    <button onClick={() => setActiveChart({ title: 'Emissions KPI Correlation', chartType: 'Multi-Line Chart', description: 'Normalizes CO₂, SOx, and NOx emissions to the same 0–100 scale to compare directional relationships. CO₂ correlates strongly with fuel throughput, SOx with sulfur content of feed and scrubber efficiency, and NOx with combustion temperature and excess air. Divergence between these trends reveals the root cause of emission changes.', metrics: [{ name: 'CO₂ (normalized)', color: '#ef4444', meaning: 'Carbon dioxide emission trend. Strongly correlated with crude throughput and energy consumption.' }, { name: 'SOx (normalized)', color: '#f59e0b', meaning: 'Sulfur oxide trend. Sensitive to feed sulfur content (crude API gravity) and wet scrubber performance.' }, { name: 'NOx (normalized)', color: '#8b5cf6', meaning: 'Nitrogen oxide trend. Driven by flame temperature — rises with higher combustion air ratios or elevated throughput.' }], howToRead: 'When all three lines rise in parallel, the root cause is likely an increase in crude throughput (burning more fuel). When SOx rises alone, a scrubber or high-sulfur crude issue is indicated. When NOx rises while others hold flat, check combustion air settings on furnaces.', keyInsight: 'Persistent NOx elevation with stable CO₂ is a strong signal of high excess air ratios — a burner trim optimization opportunity that also reduces fuel consumption.' })} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"><Info className="w-4 h-4" /></button>
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
                                    if (name === 'co2') return [`${raw.co2_raw?.toFixed(0)} t/day`, 'CO₂ Emissions'];
                                    if (name === 'sox') return [`${raw.sox_raw?.toFixed(2)} t/day`, 'SOx Emissions'];
                                    if (name === 'nox') return [`${raw.nox_raw?.toFixed(2)} t/day`, 'NOx Emissions'];
                                    return [value, name];
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} formatter={(v) => v === 'co2' ? 'CO₂ Emissions' : v === 'sox' ? 'SOx Emissions' : 'NOx Emissions'} />
                            <Line type="monotone" dataKey="co2" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <Line type="monotone" dataKey="sox" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                            <Line type="monotone" dataKey="nox" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false} />
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
