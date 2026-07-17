"use client";

import { useAuthStore } from '@/store/authStore';
import { Settings, User, Bell, Shield, Cpu, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const { user, logout } = useAuthStore();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">

            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    <Settings className="w-6 h-6 text-primary-600" />
                    System Settings & Profile
                </h1>
                <p className="text-slate-500 text-sm mt-1">Manage platform configuration and user preferences</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* Profile Column */}
                <div className="md:col-span-1 space-y-6">
                    <div className="glass bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/30 mb-4">
                            {user?.avatar ? (
                                <span className="text-3xl font-bold text-white">{user.avatar}</span>
                            ) : (
                                <User className="w-10 h-10 text-white" />
                            )}
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">{user?.name}</h2>
                        <p className="text-sm font-medium text-primary-600 capitalize">{user?.role} Access</p>
                        <p className="text-xs text-slate-500 mt-1">{user?.email}</p>

                        <button
                            onClick={handleLogout}
                            className="mt-6 w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors text-sm"
                        >
                            Sign Out
                        </button>
                    </div>

                    <div className="glass bg-white rounded-xl shadow-sm border border-slate-200 p-1 flex flex-col">
                        <button className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 text-slate-800 font-medium text-sm">
                            <User className="w-4 h-4 text-slate-400" /> Account Details
                        </button>
                        <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 text-slate-600 font-medium text-sm transition-colors">
                            <Bell className="w-4 h-4 text-slate-400" /> Notifications
                        </button>
                        <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 text-slate-600 font-medium text-sm transition-colors">
                            <Shield className="w-4 h-4 text-slate-400" /> Security & Privacy
                        </button>
                        <button className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 text-slate-600 font-medium text-sm transition-colors">
                            <div className="flex items-center gap-3">
                                <Cpu className="w-4 h-4 text-ai-500" /> API Integrations
                            </div>
                        </button>
                    </div>
                </div>

                {/* Content Column */}
                <div className="md:col-span-2 space-y-6">

                    <div className="glass bg-white rounded-xl shadow-sm border border-slate-200 p-6 pr-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">Agentic AI Configuration</h3>

                        <div className="space-y-6">

                            <div className="bg-ai-50 rounded-lg p-4 border border-ai-200">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold text-ai-900 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-ai-500"></span>
                                        S!a Agentic Tool Integration
                                    </h4>
                                    <span className="px-2 py-1 bg-white text-xs font-bold text-ai-600 rounded shadow-sm border border-ai-100 uppercase">
                                        Connected
                                    </span>
                                </div>
                                <p className="text-sm text-ai-800 mb-4">
                                    Autonomous decision models and workflow generation are currently powered by the S!a AI architecture placeholder.
                                </p>
                                <div className="flex gap-3">
                                    <button className="px-4 py-2 bg-white hover:bg-slate-50 border border-ai-200 rounded-lg text-sm font-semibold text-ai-700 transition-colors shadow-sm">
                                        Configure Endpoints
                                    </button>
                                    <button className="px-4 py-2 bg-ai-600 hover:bg-ai-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center gap-1.5">
                                        View Logs <ExternalLink className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-slate-700 mb-3 text-sm">Telemetry Polling Rate (Backend Simulator)</h4>
                                <div className="flex items-center gap-4">
                                    <input type="range" min="1" max="15" defaultValue="5" className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600" />
                                    <span className="text-sm font-bold text-slate-700 w-12 text-right">5 sec</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Adjusts how frequently the frontend polls the Node.js simulation backend for fresh KPI data.</p>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <h4 className="font-semibold text-slate-700 mb-3 text-sm">Active Subsystems</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {['Crude Processing', 'Equipment Health', 'Energy Management', 'Production Yield', 'Environmental Monitoring', 'Safety Monitoring'].map(sys => (
                                        <label key={sys} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-200">
                                            <input type="checkbox" defaultChecked className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500" />
                                            <span className="text-sm font-medium text-slate-700">{sys}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
