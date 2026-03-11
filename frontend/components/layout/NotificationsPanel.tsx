"use client";

import { useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useDataStore } from '@/store/dataStore';
import { useWorkOrderStore } from '@/store/workOrderStore';
import { X, Bell, AlertTriangle, Info, Zap, ChevronDown, ChevronUp, Wrench, Search } from 'lucide-react';

export default function NotificationsPanel() {
    const { notificationsOpen, toggleNotifications } = useUIStore();
    const { alerts, clearAlerts } = useDataStore();
    const { openCreateModal } = useWorkOrderStore();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (!notificationsOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 shadow-2xl z-[60] border-l border-slate-200 dark:border-slate-800 animate-slide-in-right flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    <h2 className="font-bold text-slate-800 dark:text-slate-100">System Alerts</h2>
                    {alerts.length > 0 && (
                        <span className="text-[10px] font-bold bg-status-critical text-white px-1.5 py-0.5 rounded-full">{alerts.length}</span>
                    )}
                </div>
                <button
                    onClick={toggleNotifications}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <X className="w-5 h-5 text-slate-400" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {alerts.length === 0 ? (
                    <div className="text-center py-10">
                        <Bell className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                        <p className="text-sm text-slate-400">No active alerts</p>
                    </div>
                ) : (
                    alerts.map((alert) => {
                        const isExpanded = expandedId === alert.id;
                        return (
                            <div
                                key={alert.id}
                                className={`rounded-xl border transition-all ${
                                    alert.severity === 'critical' ? 'bg-status-critical/5 border-status-critical/20' :
                                    alert.severity === 'warning' ? 'bg-status-warning/5 border-status-warning/20' :
                                    'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                }`}
                            >
                                <div className="p-3 flex items-start gap-3">
                                    <div className={`mt-1 p-1 rounded-lg flex-shrink-0 ${
                                        alert.severity === 'critical' ? 'bg-status-critical/10 text-status-critical' :
                                        alert.severity === 'warning' ? 'bg-status-warning/10 text-status-warning' :
                                        'bg-primary-100 text-primary-600 dark:bg-primary-900/30'
                                    }`}>
                                        {alert.severity === 'critical' ? <AlertTriangle className="w-4 h-4" /> :
                                            alert.severity === 'warning' ? <Zap className="w-4 h-4" /> :
                                            <Info className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{alert.type}</span>
                                            <span className="text-[10px] text-slate-400 shrink-0 ml-2">{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight mb-1">
                                            {alert.message}
                                        </p>
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <span className="status-dot normal h-1.5 w-1.5" />
                                            <span className="text-[10px] text-slate-500 font-medium">{alert.equipment || alert.unit}</span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <button
                                                onClick={() => openCreateModal({
                                                    Subsystem: alert.subsystem || alert.type,
                                                    Equipment: alert.equipment || alert.unit,
                                                    Description: `${alert.detailedDescription || alert.message}\n\nSuggested action: ${alert.suggestedAction || 'Inspect and rectify.'}`,
                                                    Priority: alert.severity === 'critical' ? 'Critical' : 'High',
                                                    Source: 'notifications',
                                                    LinkedAlertID: alert.id,
                                                    LinkedKPI: alert.linkedKpi ?? null,
                                                })}
                                                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-status-warning/10 text-status-warning hover:bg-status-warning/20 transition-colors"
                                            >
                                                <Wrench className="w-3 h-3" />
                                                Create Work Order
                                            </button>
                                            {(alert.detailedDescription || alert.suggestedAction) && (
                                                <button
                                                    onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                                                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    <Search className="w-3 h-3" />
                                                    {isExpanded ? 'Hide' : 'View'} Analysis
                                                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (alert.detailedDescription || alert.suggestedAction) && (
                                    <div className="px-3 pb-3 space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3 mt-0">
                                        {alert.detailedDescription && (
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Root Cause / Details</p>
                                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{alert.detailedDescription}</p>
                                            </div>
                                        )}
                                        {alert.suggestedAction && (
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Recommended Action</p>
                                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{alert.suggestedAction}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <button
                    onClick={clearAlerts}
                    className="w-full py-2 text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors uppercase tracking-widest"
                >
                    Clear All Notifications
                </button>
            </div>
        </div>
    );
}
