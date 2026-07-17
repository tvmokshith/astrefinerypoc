"use client";

import { X, BarChart2, Info, TrendingUp, AlertTriangle } from 'lucide-react';

export interface ChartDescription {
    title: string;
    chartType: string;
    description: string;
    metrics: { name: string; color: string; meaning: string }[];
    howToRead: string;
    keyInsight?: string;
}

interface Props {
    chart: ChartDescription;
    onClose: () => void;
}

export default function ChartDescriptionModal({ chart, onClose }: Props) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-primary-50 to-slate-50 dark:from-primary-950/30 dark:to-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/40">
                            <BarChart2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight">{chart.title}</h2>
                            <span className="text-[10px] font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-widest">{chart.chartType}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                    {/* Description */}
                    <div className="flex gap-3">
                        <Info className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{chart.description}</p>
                    </div>

                    {/* Metrics */}
                    {chart.metrics.length > 0 && (
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Metrics shown</h3>
                            <div className="space-y-2.5">
                                {chart.metrics.map((m, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                        <span className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: m.color }} />
                                        <div>
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{m.name}</span>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{m.meaning}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* How to read */}
                    <div className="rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-950/20 p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">How to read this chart</span>
                        </div>
                        <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">{chart.howToRead}</p>
                    </div>

                    {/* Key insight */}
                    {chart.keyInsight && (
                        <div className="rounded-lg border border-amber-100 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 p-4">
                            <div className="flex items-center gap-2 mb-1.5">
                                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Key insight</span>
                            </div>
                            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">{chart.keyInsight}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
