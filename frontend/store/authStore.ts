import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole } from '@/lib/types';

const USERS: Record<string, { password: string; user: User }> = {
    'admin@astrikos.ai': {
        password: 'admin123',
        user: { email: 'admin@astrikos.ai', name: 'Alex Admin', role: 'admin', avatar: 'A' },
    },
    'engineer@astrikos.ai': {
        password: 'engineer123',
        user: { email: 'engineer@astrikos.ai', name: 'Emma Engineer', role: 'engineer', avatar: 'E' },
    },
    'operator@astrikos.ai': {
        password: 'operator123',
        user: { email: 'operator@astrikos.ai', name: 'Omar Operator', role: 'operator', avatar: 'O' },
    },
};

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => { success: boolean; error?: string };
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            login: (email, password) => {
                const record = USERS[email.toLowerCase()];
                if (!record || record.password !== password) {
                    return { success: false, error: 'Invalid email or password' };
                }
                set({ user: record.user, isAuthenticated: true });
                return { success: true };
            },
            logout: () => set({ user: null, isAuthenticated: false }),
        }),
        { name: 'astrikos-auth' }
    )
);
