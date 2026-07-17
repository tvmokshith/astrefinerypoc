"use client";

import { useEffect } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useUIStore } from '@/store/uiStore';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import AIAdvisoryPanel from './AIAdvisoryPanel';
import NotificationsPanel from './NotificationsPanel';
import CreateWorkOrderModal from '@/components/work-orders/CreateWorkOrderModal';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { startPolling, stopPolling } = useDataStore();
    const { theme } = useUIStore();

    useEffect(() => {
        startPolling();
        return () => {
            stopPolling();
        };
    }, [startPolling, stopPolling]);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    return (
        <div className="flex h-screen bg-[var(--app-bg)] overflow-hidden text-[var(--app-text)] transition-colors duration-300">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <TopBar />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[var(--app-bg)] relative pb-10">
                    <div className="mx-auto w-full max-w-[1600px] p-6">
                        {children}
                    </div>
                </main>
            </div>
            <AIAdvisoryPanel />
            <NotificationsPanel />
            <CreateWorkOrderModal />
        </div>
    );
}
