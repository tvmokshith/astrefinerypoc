"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/store/uiStore';
import {
    LayoutDashboard, Activity, Zap, Droplets, Leaf, ShieldAlert,
    Users, DollarSign, Package, Shield, Scale, Grid, Building2, HardHat,
    ChevronLeft, BarChart3, Settings, Bot
} from 'lucide-react';

const REFINERY_ROUTES = [
    { name: 'Crude Processing', href: '/systems/crude-processing', icon: Droplets },
    { name: 'Equipment Health', href: '/systems/equipment-health', icon: Activity },
    { name: 'Energy Management', href: '/systems/energy-management', icon: Zap },
    { name: 'Production Yield', href: '/systems/production-yield', icon: BarChart3 },
    { name: 'Environmental', href: '/systems/environmental', icon: Leaf },
    { name: 'Safety Monitoring', href: '/systems/safety', icon: ShieldAlert },
    { name: 'Work Orders', href: '/work-orders', icon: HardHat },
];

const ENTERPRISE_ROUTES = [
    { name: 'HR & Workforce', href: '/enterprise/hr', icon: Users },
    { name: 'Finance & Accounting', href: '/enterprise/finance', icon: DollarSign },
    { name: 'Procurement', href: '/enterprise/procurement', icon: Package },
    { name: 'Governance & Risk Management', href: '/enterprise/governance-risk-management', icon: Scale },
    { name: 'Sustainability & Environmental Impact', href: '/enterprise/sustainability-environmental-impact', icon: Grid },
    { name: 'Operations & Safety Management', href: '/enterprise/operations-safety-management', icon: HardHat },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { sidebarOpen, setSidebarOpen } = useUIStore();

    const NavLink = ({ item }: { item: any }) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
            <Link href={item.href} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl sidebar-link text-sm font-medium ${active ? 'active' : 'text-slate-600'}`}>
                <Icon className={`w-5 h-5 ${active ? 'text-primary-600' : 'text-slate-400'}`} />
                {sidebarOpen && <span>{item.name}</span>}
            </Link>
        );
    };

    return (
        <aside className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col z-20 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center overflow-hidden">
                    {sidebarOpen ? (
                        <Image src="/astrikos-logo.jpg" alt="Astrikos" width={130} height={40} className="object-contain" priority />
                    ) : (
                        <Image src="/astrikos-logo.jpg" alt="Astrikos" width={36} height={36} className="object-contain rounded" priority />
                    )}
                </div>
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hidden md:block">
                    <ChevronLeft className={`w-5 h-5 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                <div>
                    <NavLink item={{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }} />
                    <NavLink item={{ name: '3D Digital Twin', href: '/digital-twin', icon: Building2 }} />
                    <NavLink item={{ name: 'Workflow Simulator', href: '/ai-workflow', icon: Bot }} />
                </div>

                <div>
                    {sidebarOpen && <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-4">Refinery Systems</div>}
                    <div className="space-y-1">
                        {REFINERY_ROUTES.map(r => <NavLink key={r.href} item={r} />)}
                    </div>
                </div>

                <div>
                    {sidebarOpen && <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-4">Enterprise Services</div>}
                    <div className="space-y-1">
                        {ENTERPRISE_ROUTES.map(r => <NavLink key={r.href} item={r} />)}
                    </div>
                </div>
            </div>

            <div className="p-3 border-t border-slate-200 dark:border-slate-800 hide-scrollbar">
                <NavLink item={{ name: 'Reports', href: '/reports', icon: BarChart3 }} />
                <NavLink item={{ name: 'Settings', href: '/settings', icon: Settings }} />
            </div>
        </aside>
    );
}
