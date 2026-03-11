"use client";

import { useMemo } from 'react';
import { KPI } from '@/lib/types';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { Info, TrendingDown, TrendingUp, Minus, Wrench } from 'lucide-react';
import { useWorkOrderStore } from '@/store/workOrderStore';
import { usePathname } from 'next/navigation';

interface KPICardProps {
    title: string;
    kpi?: KPI;
    onClick?: () => void;
    inverseTrend?: boolean; // if true, going down is good (e.g., emissions)
}

export default function KPICard({ title, kpi, onClick, inverseTrend = false }: KPICardProps) {
    const isLoading = !kpi;
    const { openCreateModal } = useWorkOrderStore();
    const pathname = usePathname();

    const trend = useMemo(() => {
        if (!kpi || !kpi.history || kpi.history.length < 2) return null;
        const len = kpi.history.length;
        const current = kpi.history[len - 1].value;
        const previous = kpi.history[len - 2].value;
        const diff = current - previous;
        const pct = (diff / previous) * 100;
        return {
            diff,
            pct: pct.toFixed(1),
            isUp: diff > 0,
            isDown: diff < 0,
            isGood: inverseTrend ? diff <= 0 : diff >= 0
        };
    }, [kpi, inverseTrend]);

    const chartData = useMemo(() => {
        if (!kpi || !kpi.history) return [];
        return kpi.history.map((h) => ({ time: h.timestamp, value: h.value }));
    }, [kpi?.history]);

    const handleCreateWorkOrder = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!kpi) return;

        let subsystem = 'Refining Section';
        const page = pathname.split('/').pop();

        switch (page) {
            case 'crude-processing': subsystem = 'Crude processing'; break;
            case 'equipment-health': subsystem = 'FCC Unit'; break;
            case 'energy-management': subsystem = 'Utilities Unit'; break;
            case 'production-yield': subsystem = 'FCC Unit'; break;
            case 'environmental': subsystem = 'Environmental'; break;
            case 'safety': subsystem = 'Safety'; break;
            case 'storage': subsystem = 'Storage & Logistics'; break;
            default: subsystem = 'Refining Section';
        }

        openCreateModal({
            Subsystem: subsystem,
            Equipment: kpi.label || title,
            Description: `${title} entered ${kpi.status.toUpperCase()} range. Current value: ${kpi.value} ${kpi.unit}.`,
            Priority: kpi.status === 'critical' ? 'Critical' : 'High',
            Source: 'kpi-card',
            LinkedKPI: `${page ?? "dashboard"}.${title.replace(/\s+/g, "_")}`,
        });
    };

    // Format to 2dp; abbreviate only at 1M+ to avoid truncation of 5-digit values
    const formatValue = (v: number): string => {
        if (v >= 1_000_000) return (v / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'M';
        return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    if (isLoading) {
        return (
            <div className="glass dark:bg-slate-900/50 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm h-32 flex flex-col justify-between skeleton">
                <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-8 w-1/3 bg-slate-200 dark:bg-slate-800 rounded mt-4"></div>
            </div>
        );
    }

    const statusValueColor =
        kpi?.status === 'critical' ? '#ef4444' :
        kpi?.status === 'warning'  ? '#f59e0b' :
        '#10b981';

    const getStatusBgColor = () => {
        if (kpi?.status === 'critical') return 'bg-status-critical/10';
        if (kpi?.status === 'warning') return 'bg-status-warning/10';
        return 'bg-status-normal/10';
    };

    const getStatusTextColor = () => {
        if (kpi?.status === 'critical') return 'text-status-critical';
        if (kpi?.status === 'warning') return 'text-status-warning';
        return 'text-status-normal';
    };

    return (
        <div
            onClick={onClick}
            className="glass dark:bg-slate-900/50 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm kpi-card relative overflow-hidden group bg-white dark:hover:bg-slate-900 transition-all"
        >
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 leading-tight max-w-[calc(100%-80px)]">{title}</h3>
                <div className="flex items-center gap-2 shrink-0">
                    {kpi && kpi.status !== 'normal' && (
                        <button
                            onClick={handleCreateWorkOrder}
                            title="Request Rectification"
                            className="p-1 rounded bg-status-warning/10 text-status-warning hover:bg-status-warning/20 transition-all opacity-0 group-hover:opacity-100"
                        >
                            <Wrench className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {onClick && (
                        <button className="p-1 text-slate-400 hover:text-primary-600 transition-colors opacity-0 group-hover:opacity-100">
                            <Info className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="z-10 relative mt-1 space-y-1.5">
                {/* Value — full width, no truncation */}
                <div className="flex items-baseline gap-1 flex-wrap">
                    <span
                        className="text-2xl font-bold tracking-tight tabular-nums dark:drop-shadow-[0_0_8px_rgba(0,0,0,0.3)]"
                        style={{ color: statusValueColor }}
                    >
                        {kpi ? formatValue(kpi.value) : '—'}
                    </span>
                    <span className="text-sm font-medium text-slate-400 dark:text-slate-500 shrink-0">{kpi?.unit}</span>
                </div>

                {/* Trend + status badge on second row */}
                <div className="flex items-center justify-between gap-2">
                    {trend && (
                        <div className={`flex items-center gap-1 text-xs font-semibold ${trend.isGood ? 'text-status-normal' : 'text-status-critical'}`}>
                            {trend.isUp ? <TrendingUp className="w-3 h-3" /> : trend.isDown ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            <span>{Math.abs(Number(trend.pct))}%</span>
                        </div>
                    )}
                    {kpi?.status && (
                        <div className={`ml-auto shrink-0 px-2 py-1 rounded-md flex items-center gap-1.5 ${getStatusBgColor()}`}>
                            <span className={`status-dot ${kpi.status}`} />
                            <span className={`text-xs font-bold capitalize ${getStatusTextColor()}`}>{kpi.status}</span>
                        </div>
                    )}
                </div>
            </div>

            {kpi?.history && kpi.history.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-16 opacity-20 pointer-events-none z-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id={`color-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={kpi.status === 'critical' ? '#ef4444' : kpi.status === 'warning' ? '#f59e0b' : '#3b82f6'} stopOpacity={0.8} />
                                    <stop offset="95%" stopColor={kpi.status === 'critical' ? '#ef4444' : kpi.status === 'warning' ? '#f59e0b' : '#3b82f6'} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <YAxis domain={['auto', 'auto']} hide />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={kpi.status === 'critical' ? '#ef4444' : kpi.status === 'warning' ? '#f59e0b' : '#3b82f6'}
                                fillOpacity={1}
                                fill={`url(#color-${title.replace(/\s+/g, '')})`}
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
