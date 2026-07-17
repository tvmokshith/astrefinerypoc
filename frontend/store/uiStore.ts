import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Theme } from '@/lib/types';

interface UIState {
    sidebarOpen: boolean;
    aiPanelOpen: boolean;
    notificationsOpen: boolean;
    selectedWorkflow: string | null;
    theme: Theme;

    setSidebarOpen: (v: boolean) => void;
    toggleSidebar: () => void;
    setAiPanelOpen: (v: boolean) => void;
    toggleAiPanel: () => void;
    setNotificationsOpen: (v: boolean) => void;
    toggleNotifications: () => void;
    setSelectedWorkflow: (w: string | null) => void;
    setTheme: (t: Theme) => void;
    toggleTheme: () => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            sidebarOpen: true,
            aiPanelOpen: false,
            notificationsOpen: false,
            selectedWorkflow: null,
            theme: 'light',

            setSidebarOpen: (v) => set({ sidebarOpen: v }),
            toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
            setAiPanelOpen: (v) => set({ aiPanelOpen: v }),
            toggleAiPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
            setNotificationsOpen: (v) => set({ notificationsOpen: v }),
            toggleNotifications: () => set((s) => ({ notificationsOpen: !s.notificationsOpen })),
            setSelectedWorkflow: (w) => set({ selectedWorkflow: w }),
            setTheme: (t) => set({ theme: t }),
            toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
        }),
        {
            name: 'astrikos-ui-storage',
        }
    )
);
