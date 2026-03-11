"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        // Auth guards
        const isAuthRoute = pathname === '/login' || pathname === '/';

        if (!isAuthenticated && !isAuthRoute) {
            router.push('/login');
        } else if (isAuthenticated && isAuthRoute) {
            router.push('/dashboard');
        }
    }, [isAuthenticated, pathname, router, mounted]);

    // Prevent hydration mismatch flashes by not rendering children immediately if state might redirect
    if (!mounted) return <div className="min-h-screen bg-slate-100" />;

    return <>{children}</>;
}
