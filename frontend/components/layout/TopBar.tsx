"use client";

import { Bell, Bot, Search, User, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useDataStore } from '@/store/dataStore';

export default function TopBar() {
    const user = useAuthStore((s) => s.user);
    const { toggleAiPanel, aiPanelOpen, notificationsOpen, toggleNotifications, theme, toggleTheme } = useUIStore();
    const { alerts, advisory } = useDataStore();

    const criticalCount = advisory.filter(a => a.severity === 'critical').length;
    const warningCount = advisory.filter(a => a.severity === 'warning').length;
    const totalAdvisory = criticalCount + warningCount;
    const alertCount = alerts.length;

    return (
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-10 sticky top-0 transition-colors duration-300">
            <div className="flex-1 max-w-xl">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search KPIs, equipment, or reports..."
                        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all dark:text-slate-100 dark:placeholder-slate-500"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
                <button
                    onClick={toggleTheme}
                    className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                    {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-400" />}
                </button>

                <button
                    onClick={toggleAiPanel}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${aiPanelOpen
                        ? 'bg-ai-700 text-white shadow-md shadow-ai-700/20'
                        : 'bg-ai-50 dark:bg-ai-900/20 text-ai-700 dark:text-ai-400 hover:bg-ai-100 dark:hover:bg-ai-900/40'
                        }`}
                >
                    <Bot className="w-4 h-4" />
                    <span className="hidden md:inline">AI Advisory</span>
                    {totalAdvisory > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-status-critical text-[10px] text-white font-bold ml-1">
                            {totalAdvisory}
                        </span>
                    )}
                </button>

                <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

                <button
                    onClick={toggleNotifications}
                    className={`relative p-2 rounded-full transition-colors ${notificationsOpen
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                >
                    <Bell className="w-5 h-5" />
                    {alertCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-status-warning text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                            {alertCount}
                        </span>
                    )}
                </button>

                <button className="flex items-center gap-3 pl-2 group">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight group-hover:text-primary-600 transition-colors">{user?.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 flex items-center justify-center text-primary-700 dark:text-primary-400 font-bold overflow-hidden shadow-sm">
                        {user?.avatar ? <span>{user.avatar}</span> : <User className="w-4 h-4" />}
                    </div>
                </button>
            </div>
        </header>
    );
}
