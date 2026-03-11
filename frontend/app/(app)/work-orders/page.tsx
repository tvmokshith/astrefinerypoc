"use client";

import { useEffect, useMemo, useState } from "react";
import { useWorkOrderStore } from "@/store/workOrderStore";
import { HardHat, ClipboardList, CheckCircle2, Clock, AlertCircle, Search, MoreVertical, Activity, Plus, ShieldCheck, ShieldX } from "lucide-react";
import { WorkOrder, WorkOrderPriority, WorkOrderStatus } from "@/lib/types";

const SUBSYSTEMS = [
    'All',
    'Crude processing',
    'FCC Unit',
    'Hydrotreater',
    'Reforming Unit',
    'Storage & Logistics',
    'Utilities Unit',
    'Environmental',
    'Safety'
];

export default function WorkOrdersPage() {
    const { workOrders, refresh, isLoading, openCreateModal, approve, reject, updateStatus } = useWorkOrderStore();
    const [filter, setFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        refresh();
    }, [refresh]);

    const filteredOrders = useMemo(() => {
        return workOrders.filter((wo) => {
            const matchesFilter = filter === "All" || wo.Subsystem === filter;
            const hay = `${wo.Description} ${wo.Equipment} ${wo.WorkOrderID} ${wo.Subsystem}`.toLowerCase();
            const matchesSearch = hay.includes(searchQuery.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [filter, searchQuery, workOrders]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "Completed":
                return <CheckCircle2 className="w-4 h-4 text-status-normal" />;
            case "In Progress":
                return <Clock className="w-4 h-4 text-status-warning animate-pulse" />;
            case "Approved":
                return <ShieldCheck className="w-4 h-4 text-status-normal" />;
            default:
                return <AlertCircle className="w-4 h-4 text-slate-400" />;
        }
    };

    const getPriorityColor = (priority: WorkOrderPriority) => {
        switch (priority) {
            case "Critical":
                return "bg-status-critical/10 text-status-critical border-status-critical/20";
            case "High":
                return "bg-status-warning/10 text-status-warning border-status-warning/20";
            case "Medium":
                return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
            default:
                return "bg-status-normal/10 text-status-normal border-status-normal/20";
        }
    };

    const nextStatus = (wo: WorkOrder): WorkOrderStatus => {
        // Pending approval -> Approved (admin action)
        // Approved -> In Progress -> Completed
        if (wo.Status === "Approved") return "In Progress";
        if (wo.Status === "In Progress") return "Completed";
        return wo.Status;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                        <HardHat className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        Maintenance Work Orders
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Track and manage refinery rectification tasks</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => openCreateModal({ Source: "manual" })}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold shadow-lg shadow-primary-600/20"
                    >
                        <Plus className="w-4 h-4" />
                        Manual Create
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search orders..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 transition-all w-64"
                        />
                    </div>
                </div>
            </div>

            {/* Subsystem Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
                {SUBSYSTEMS.map(s => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap border ${filter === s
                            ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-600/20'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-primary-300'
                            }`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            <div className="glass dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Order ID</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Description</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Subsystem</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Equipment</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Priority</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Approval</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Date Created</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {isLoading ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-20 text-center text-slate-500 dark:text-slate-400 font-medium">
                                    Loading work orders…
                                </td>
                            </tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-20 text-center">
                                    <ClipboardList className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">No work orders match the criteria</p>
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map((wo) => (
                                <tr key={wo.WorkOrderID} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400">{wo.WorkOrderID}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate max-w-xs">{wo.Description}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{wo.Subsystem}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                                            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium uppercase tracking-wider">{wo.Equipment}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getPriorityColor(wo.Priority)}`}>
                                            {wo.Priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(wo.Status)}
                                            <button
                                                onClick={() => {
                                                    if (wo.ApprovalStatus !== "Approved") return;
                                                    void updateStatus(wo.WorkOrderID, nextStatus(wo));
                                                }}
                                                className={`text-xs font-bold text-slate-700 dark:text-slate-300 ${wo.ApprovalStatus !== "Approved" ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"}`}
                                                title={wo.ApprovalStatus !== "Approved" ? "Awaiting approval" : "Advance status"}
                                            >
                                                {wo.Status}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {wo.ApprovalStatus === "Pending" ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => void approve(wo.WorkOrderID)}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-status-normal/10 text-status-normal border border-status-normal/20 text-[11px] font-bold hover:bg-status-normal/15"
                                                >
                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => void reject(wo.WorkOrderID)}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-status-critical/10 text-status-critical border border-status-critical/20 text-[11px] font-bold hover:bg-status-critical/15"
                                                >
                                                    <ShieldX className="w-3.5 h-3.5" />
                                                    Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{wo.ApprovalStatus}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-xs text-slate-400">{new Date(wo.CreatedDate).toLocaleDateString()}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
                                            <MoreVertical className="w-4 h-4 text-slate-400" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Integrated Quick Action */}
            <div className="bg-primary-600 rounded-2xl p-6 text-white shadow-xl shadow-primary-600/30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Predictive Maintenance Active</h3>
                        <p className="text-primary-100 text-sm">AI Agent is continuously identifying rectification needs based on sensor drift.</p>
                    </div>
                </div>
                <button
                    onClick={() => openCreateModal({ Priority: "High", Source: "manual" })}
                    className="px-6 py-2.5 bg-white text-primary-600 font-bold rounded-xl hover:bg-primary-50 transition-colors"
                >
                    Create Work Order
                </button>
            </div>
        </div>
    );
}
