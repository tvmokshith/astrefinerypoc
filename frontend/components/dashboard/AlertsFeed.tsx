"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Info, Zap, Bell, Clock, Wrench, ChevronDown, ChevronUp, Search } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { api } from "@/lib/api";
import { EventStreamItem } from "@/lib/types";
import { useWorkOrderStore } from "@/store/workOrderStore";

export default function AlertsFeed() {
    const { openCreateModal } = useWorkOrderStore();
    const [events, setEvents] = useState<EventStreamItem[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const fetchEvents = async () => {
            try {
                const next = await api.getEvents();
                if (!cancelled) setEvents(next);
            } catch {
                // keep last stable list
            }
        };
        fetchEvents();
        const id = setInterval(fetchEvents, 30000); // stable: refresh every 30s
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, []);

    const getSeverityStyles = (severity: string) => {
        switch (severity) {
            case 'Critical':
                return { icon: AlertTriangle, color: 'text-status-critical', bg: 'bg-status-critical/10 flex-shrink-0' };
            case 'Warning':
                return { icon: Zap, color: 'text-status-warning', bg: 'bg-status-warning/10 flex-shrink-0' };
            default:
                return { icon: Info, color: 'text-status-normal', bg: 'bg-status-normal/10 flex-shrink-0' };
        }
    };

    const count = events.length;

    return (
        <div className="glass bg-white dark:bg-slate-900/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    Live Event Stream
                </h3>
                <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-full font-medium">
                    {count} events
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 hide-scrollbar">
                {events.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Bell className="w-8 h-8 opacity-20 mb-2" />
                        <p className="text-sm">No recent events</p>
                    </div>
                ) : (
                    events.map((evt, idx) => {
                        const { icon: Icon, color, bg } = getSeverityStyles(evt.Severity);
                        const isExpanded = expandedId === evt.EventID;
                        return (
                            <div
                                key={evt.EventID}
                                className={`rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors animate-fade-in border border-transparent hover:border-slate-100 dark:hover:border-slate-800`}
                                style={{ animationDelay: `${idx * 50}ms` }}
                            >
                                <div className="p-3 flex gap-3 items-start group">
                                    <div className={`p-2 rounded-lg ${bg}`}>
                                        <Icon className={`w-4 h-4 ${color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1">
                                                {evt.Priority} • {evt.Subsystem}
                                            </span>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 whitespace-nowrap">
                                                <Clock className="w-3 h-3" />
                                                {formatDistanceToNow(new Date(evt.Timestamp), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-700 dark:text-slate-200 font-medium leading-tight mb-1">
                                            {evt.Description}
                                        </p>
                                        <p className="text-[11px] text-slate-400 mb-1.5">{evt.Equipment}</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <button
                                                onClick={() =>
                                                    openCreateModal({
                                                        Subsystem: evt.Subsystem,
                                                        Equipment: evt.Equipment,
                                                        Description: `${evt.Description}${evt.SuggestedAction ? '\n\nSuggested action: ' + evt.SuggestedAction : ''}`,
                                                        Priority: evt.Priority,
                                                        Source: "event-stream",
                                                        LinkedAlertID: evt.LinkedAlertID,
                                                        LinkedKPI: evt.LinkedKPI,
                                                    })
                                                }
                                                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-status-warning/10 text-status-warning hover:bg-status-warning/20 transition-colors"
                                                title="Create Work Order"
                                            >
                                                <Wrench className="w-3 h-3" />
                                                Work Order
                                            </button>
                                            {evt.SuggestedAction && (
                                                <button
                                                    onClick={() => setExpandedId(isExpanded ? null : evt.EventID)}
                                                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    <Search className="w-3 h-3" />
                                                    {isExpanded ? 'Hide' : 'Full'} Analysis
                                                    {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {isExpanded && evt.SuggestedAction && (
                                    <div className="mx-3 mb-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 space-y-1.5">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recommended Action</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{evt.SuggestedAction}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
