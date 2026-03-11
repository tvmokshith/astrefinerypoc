"use client";

import { useState } from 'react';
import { X, AlertTriangle, Info, Bot, ArrowRight, Zap, ChevronDown, ChevronUp, Search, Lightbulb, TrendingUp } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useDataStore } from '@/store/dataStore';
import { useRouter } from 'next/navigation';

export default function AIAdvisoryPanel() {
    const { aiPanelOpen, setAiPanelOpen, setSelectedWorkflow } = useUIStore();
    const advisory = useDataStore((s) => s.advisory);
    const router = useRouter();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (!aiPanelOpen) return null;

    const handleAction = (workflowId: string | null) => {
        if (workflowId) {
            setSelectedWorkflow(workflowId);
            setAiPanelOpen(false);
            router.push('/ai-workflow');
        }
    };

    const toggleExpand = (key: string) => {
        setExpandedId(prev => prev === key ? null : key);
    };

    const getSeverityIcon = (sev: string) => {
        switch (sev) {
            case 'critical': return <AlertTriangle className="w-4 h-4 text-red-400" />;
            case 'warning': return <Zap className="w-4 h-4 text-amber-400" />;
            case 'info':
            default: return <Info className="w-4 h-4 text-ai-400" />;
        }
    };

    const getSeverityBadge = (sev: string) => {
        switch (sev) {
            case 'critical': return <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Critical</span>;
            case 'warning': return <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">Warning</span>;
            default: return <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-ai-500/20 text-ai-400 border border-ai-500/30">Info</span>;
        }
    };

    const getBorderColor = (sev: string) => {
        switch (sev) {
            case 'critical': return 'border-red-500/30 bg-red-950/20';
            case 'warning': return 'border-amber-500/30 bg-amber-950/20';
            default: return 'border-ai-400/20 bg-slate-900/40';
        }
    };

    const criticalCount = advisory.filter(a => a.severity === 'critical').length;
    const warningCount = advisory.filter(a => a.severity === 'warning').length;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setAiPanelOpen(false)} />

            {/* Slide-over panel */}
            <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-slate-950 z-50 border-l border-ai-800/50 shadow-2xl flex flex-col transform transition-transform duration-300 animate-slide-in">

                {/* Header */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 ai-panel relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-white font-semibold flex items-center gap-2">
                                Astrikos AI Advisory
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ai-200 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-ai-100" />
                                </span>
                            </h2>
                            <p className="text-[10px] text-white/60">Real-time AI diagnostics &amp; root cause analysis</p>
                        </div>
                    </div>
                    <button onClick={() => setAiPanelOpen(false)} className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors z-10">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Summary bar */}
                <div className="px-4 py-3 border-b border-white/5 bg-slate-900/60 flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-3 py-1">
                        <AlertTriangle className="w-3 h-3" /> {criticalCount} Critical
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">
                        <Zap className="w-3 h-3" /> {warningCount} Warning
                    </div>
                    <div className="ml-auto text-[10px] text-slate-500">{advisory.length} total advisories</div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {advisory.map((adv, idx) => {
                        const key = `${adv.id}-${idx}`;
                        const isExpanded = expandedId === key;
                        const hasDetail = adv.rootCause || adv.solution || adv.benefit;

                        return (
                            <div key={key} className={`rounded-xl border ${getBorderColor(adv.severity)} overflow-hidden transition-all`}>
                                {/* Card header — always visible */}
                                <div className="p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0 mt-0.5">{getSeverityIcon(adv.severity)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <h3 className="text-sm font-semibold text-white">{adv.title}</h3>
                                                {getSeverityBadge(adv.severity)}
                                            </div>
                                            {adv.system && (
                                                <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-2">{adv.system}</div>
                                            )}
                                            <p className="text-xs text-slate-300 leading-relaxed">{adv.message}</p>
                                            {adv.impact && (
                                                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                                                    <TrendingUp className="w-3 h-3" />
                                                    <span>{adv.impact}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-3">
                                        {adv.action && (
                                            <button
                                                onClick={() => handleAction(adv.workflow)}
                                                className="flex-1 inline-flex items-center justify-between px-3 py-2 bg-ai-600 hover:bg-ai-500 text-white text-xs font-semibold rounded-lg transition-colors"
                                            >
                                                <span>{adv.action}</span>
                                                <ArrowRight className="w-3 h-3" />
                                            </button>
                                        )}
                                        {hasDetail && (
                                            <button
                                                onClick={() => toggleExpand(key)}
                                                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-ai-400 transition-colors px-2 py-2 rounded-lg hover:bg-white/5"
                                            >
                                                {isExpanded ? <><ChevronUp className="w-3 h-3" />Less</> : <><ChevronDown className="w-3 h-3" />Full Analysis</>}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded detail panel */}
                                {isExpanded && hasDetail && (
                                    <div className="border-t border-white/5 bg-slate-900/60 divide-y divide-white/5">
                                        {adv.rootCause && (
                                            <div className="px-4 py-3">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Search className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Root Cause Analysis</span>
                                                </div>
                                                <p className="text-xs text-slate-300 leading-relaxed pl-5">{adv.rootCause}</p>
                                            </div>
                                        )}
                                        {adv.solution && (
                                            <div className="px-4 py-3">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Recommended Actions</span>
                                                </div>
                                                <p className="text-xs text-slate-300 leading-relaxed pl-5 whitespace-pre-line">{adv.solution}</p>
                                            </div>
                                        )}
                                        {adv.benefit && (
                                            <div className="px-4 py-3">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Expected Benefit</span>
                                                </div>
                                                <p className="text-xs text-slate-300 leading-relaxed pl-5">{adv.benefit}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {advisory.length === 0 && (
                        <div className="text-center py-12 px-4 border border-dashed border-slate-700 rounded-xl">
                            <Bot className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400 text-sm">No active advisories. All systems operating normally.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
