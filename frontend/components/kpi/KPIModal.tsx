"use client";

import { useWorkOrderStore } from '@/store/workOrderStore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from 'recharts';
import { X, TrendingUp, Info, ArrowRight, Activity, Bot, Wrench, Search, Lightbulb, ChevronDown, ChevronUp, AlertTriangle, Zap } from 'lucide-react';
import { KPI, Advisory } from '@/lib/types';
import Link from 'next/link';
import { useMemo, useState } from 'react';

interface Props {
    title: string;
    definition: string;
    formula?: string;
    operationalExplanation?: string;
    kpiKey?: string;
    kpi: KPI;
    advisory?: Advisory;
    thresholds: {
        green: string;
        amber: string;
        red: string;
    };
    onClose: () => void;
}

function linearForecast(values: number[], steps: number) {
    // simple least squares vs index
    const n = values.length;
    if (n < 2) return Array.from({ length: steps }, () => values[n - 1] ?? 0);
    const xs = values.map((_, i) => i);
    const xMean = xs.reduce((a, b) => a + b, 0) / n;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i += 1) {
        num += (xs[i] - xMean) * (values[i] - yMean);
        den += (xs[i] - xMean) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const intercept = yMean - slope * xMean;
    return Array.from({ length: steps }, (_, j) => intercept + slope * (n + j));
}

export default function KPIModal({ title, definition, formula, operationalExplanation, kpi, advisory, thresholds, onClose }: Props) {
    const { openCreateModal } = useWorkOrderStore();
    if (!kpi) return null;
    const [showPrediction, setShowPrediction] = useState(false);
    const [advExpanded, setAdvExpanded] = useState(true);

    const statusColor = kpi.status === 'critical' ? '#ef4444' : kpi.status === 'warning' ? '#f59e0b' : '#10b981';
    const bgBorder = kpi.status === 'critical' ? 'border-status-critical/50' :
        kpi.status === 'warning' ? 'border-status-warning/50' : 'border-primary-500/50';

    const formatValue = (v: number) => {
        if (v >= 1_000_000) return (v / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'M';
        if (v >= 100_000) return (v / 1_000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'k';
        return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
    };

    const handleCreateWorkOrder = () => {
        openCreateModal({
            Subsystem: 'Refinery Subsystem',
            Equipment: kpi.label || title,
            Description: `Rectification requested from KPI Analytics for ${title}. Current: ${formatValue(kpi.value)} ${kpi.unit} (${kpi.status.toUpperCase()}).`,
            Priority: kpi.status === 'critical' ? 'Critical' : 'High',
            Source: 'kpi-modal',
        });
    };

    const chartData = useMemo(() => {
        const base = (kpi.history || []).map((p) => ({ time: p.timestamp, value: Number(p.value.toFixed(2)) })) as Array<{ time: string; value: number; predicted?: number }>;
        if (!showPrediction || base.length === 0) return base;
        const values = base.map((p) => p.value);
        const pred = linearForecast(values.slice(-Math.min(values.length, 30)), 7);
        const lastTime = new Date(base[base.length - 1].time);
        const future = pred.map((v, i) => {
            const t = new Date(lastTime.getTime() + (i + 1) * 24 * 60 * 60 * 1000).toISOString();
            return { time: t, value: base[base.length - 1].value, predicted: Number(v.toFixed(2)) };
        });
        return [...base, ...future];
    }, [kpi.history, showPrediction]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

            {/* Modal – single column, full scrollable */}
            <div className={`relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border ${bgBorder} flex flex-col animate-slide-in`}
                style={{ maxHeight: '90vh' }}>

                {/* ── Header (sticky) ─────────────────────────────── */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 shrink-0 rounded-t-2xl">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: statusColor + '20', color: statusColor }}>
                            <Activity className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Info className="w-3 h-3 shrink-0" />{definition}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                        {kpi.status !== 'normal' && (
                            <button onClick={handleCreateWorkOrder}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-status-warning text-white rounded-lg text-xs font-bold hover:bg-status-warning/90 transition-colors">
                                <Wrench className="w-3.5 h-3.5" />Rectify
                            </button>
                        )}
                        <button onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── Scrollable body ──────────────────────────────── */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">

                    {/* 1. Current Value */}
                    <div className="p-5 rounded-xl border flex flex-col items-center text-center"
                        style={{ borderColor: statusColor + '40', backgroundColor: statusColor + '08' }}>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Value</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-6xl font-extrabold tabular-nums" style={{ color: statusColor }}>
                                {formatValue(kpi.value)}
                            </span>
                            <span className="text-xl font-medium text-slate-500">{kpi.unit}</span>
                        </div>
                        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                            style={{ backgroundColor: statusColor + '20', color: statusColor }}>
                            <span className={`status-dot ${kpi.status}`} />{kpi.status}
                        </div>
                    </div>

                    {/* 2. Operating Thresholds */}
                    <div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Operating Thresholds</h3>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-status-normal/5 border border-status-normal/20">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-status-normal" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Normal</span>
                                </div>
                                <span className="text-sm font-mono text-slate-600 dark:text-slate-400">{thresholds.green}</span>
                            </div>
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-status-warning/5 border border-status-warning/20">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-status-warning" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Warning</span>
                                </div>
                                <span className="text-sm font-mono text-slate-600 dark:text-slate-400">{thresholds.amber}</span>
                            </div>
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-status-critical/5 border border-status-critical/20">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-status-critical animate-pulse" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Critical</span>
                                </div>
                                <span className="text-sm font-mono text-slate-600 dark:text-slate-400">{thresholds.red}</span>
                            </div>
                        </div>
                    </div>

                    {/* 3. Trend Chart */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                {showPrediction ? 'Historical + 7-Day Forecast' : '30-Day Historical Trend'}
                            </h3>
                            <button onClick={() => setShowPrediction(s => !s)}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                {showPrediction ? 'Hide Forecast' : 'Predict Trend'}
                            </button>
                        </div>
                        <div className="h-[180px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorModalKpi" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={statusColor} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={statusColor} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                                    <XAxis dataKey="time" hide />
                                    <YAxis domain={['auto','auto']} axisLine={false} tickLine={false} tick={{ fontSize:11, fill:'#94a3b8' }} width={40} tickFormatter={(v) => Number(v.toFixed(2)).toLocaleString()} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor:'#0f172a', borderRadius:'8px', border:'1px solid #1e293b' }}
                                        itemStyle={{ fontSize:'13px', fontWeight:600, color:'#f8fafc' }}
                                        formatter={(v: number | undefined) => [(v ?? 0).toLocaleString(undefined,{maximumFractionDigits:2}), 'Value']}
                                    />
                                    <Area type="monotone" dataKey="value" stroke={statusColor} strokeWidth={3} fillOpacity={1} fill="url(#colorModalKpi)" isAnimationActive={false} />
                                    {showPrediction && (
                                        <Line type="monotone" dataKey="predicted" stroke={statusColor} strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
                                    )}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 4. Definition */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Definition</div>
                        <p className="text-sm text-slate-700 dark:text-slate-200 font-medium leading-relaxed">{definition}</p>
                    </div>

                    {/* 5. Formula */}
                    {formula && (
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Formula</div>
                            <p className="text-sm text-slate-700 dark:text-slate-200 font-mono leading-relaxed">{formula}</p>
                        </div>
                    )}

                    {/* 6. Operational Meaning */}
                    {operationalExplanation && (
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Operational Meaning</div>
                            <p className="text-sm text-slate-700 dark:text-slate-200 font-medium leading-relaxed">{operationalExplanation}</p>
                        </div>
                    )}

                    {/* 7. AI Advisory – full detail, expandable */}
                    {advisory ? (
                        <div className="rounded-xl border border-ai-500/30 bg-ai-900/20 overflow-hidden">
                            {/* Advisory header */}
                            <button
                                onClick={() => setAdvExpanded(e => !e)}
                                className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-2">
                                    {advisory.severity === 'critical' ? <AlertTriangle className="w-4 h-4 text-red-400" /> :
                                     advisory.severity === 'warning'  ? <Zap className="w-4 h-4 text-amber-400" /> :
                                     <Bot className="w-4 h-4 text-ai-400" />}
                                    <span className="text-sm font-bold text-ai-300">AI Operational Advisory</span>
                                    {advisory.system && <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{advisory.system}</span>}
                                </div>
                                {advExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </button>

                            {advExpanded && (
                                <div className="px-4 pb-4 space-y-4">
                                    {/* Title + severity */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-bold text-white">{advisory.title}</span>
                                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                            advisory.severity === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                            advisory.severity === 'warning'  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                            'bg-ai-500/20 text-ai-400 border-ai-500/30'}`}>
                                            {advisory.severity}
                                        </span>
                                    </div>

                                    {/* Message */}
                                    <p className="text-sm text-slate-300 leading-relaxed">{advisory.message}</p>

                                    {/* Impact */}
                                    {advisory.impact && (
                                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                                            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                                            <span>{advisory.impact}</span>
                                        </div>
                                    )}

                                    {/* Root Cause */}
                                    {advisory.rootCause && (
                                        <div className="rounded-lg border border-red-500/20 bg-red-900/10 p-3">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <Search className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Root Cause Analysis</span>
                                            </div>
                                            <p className="text-xs text-slate-300 leading-relaxed">{advisory.rootCause}</p>
                                        </div>
                                    )}

                                    {/* Recommended Actions */}
                                    {advisory.solution && (
                                        <div className="rounded-lg border border-amber-500/20 bg-amber-900/10 p-3">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Recommended Actions</span>
                                            </div>
                                            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{advisory.solution}</p>
                                        </div>
                                    )}

                                    {/* Expected Benefit */}
                                    {advisory.benefit && (
                                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-900/10 p-3">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Expected Benefit</span>
                                            </div>
                                            <p className="text-xs text-slate-300 leading-relaxed">{advisory.benefit}</p>
                                        </div>
                                    )}

                                    {/* Action Button */}
                                    {advisory.action && (
                                        <Link href="/ai-workflow"
                                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-ai-600 hover:bg-ai-700 text-white text-sm font-semibold rounded-lg transition-colors w-full justify-center"
                                            onClick={onClose}>
                                            {advisory.action}
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-slate-50 dark:bg-slate-800/30 flex flex-col items-center justify-center p-6 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                            <Bot className="w-8 h-8 text-slate-400 mb-2 opacity-50" />
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No active AI advisory for this metric.</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Operating parameters are within optimal ML baselines.</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
