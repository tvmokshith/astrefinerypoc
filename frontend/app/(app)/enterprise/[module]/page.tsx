import { use } from 'react';
import KPICard from '@/components/kpi/KPICard';
import { Network, Building2 } from 'lucide-react';
import { SERVER_API_BASE } from '@/lib/api';

// Using fetch directly in Server Component for enterprise KPIs
async function getEnterpriseData(module: string) {
    try {
        const res = await fetch(`${SERVER_API_BASE}/enterprise/${module}`, { next: { revalidate: 5 } });
        if (!res.ok) return null;
        return res.json();
    } catch (e) {
        return null;
    }
}

const MODULE_TITLES: Record<string, string> = {
    'hr': 'HR & Workforce',
    'finance': 'Finance & Accounting',
    'procurement': 'Procurement & Supply Chain',
    'operations-safety-management': 'Operations & Safety Management',
    'sustainability-environmental-impact': 'Sustainability & Environmental Impact',
    'governance-risk-management': 'Governance & Risk Management',
    // legacy routes (still served by backend)
    'it': 'IT & Cybersecurity',
    'legal': 'Legal, Risk & Compliance',
    'esg': 'Sustainability & ESG',
    'facilities': 'Facilities & BMS',
    'ehs': 'Environment Health Safety',
};

export default function EnterpriseModulePage({ params }: { params: Promise<{ module: string }> }) {
    const unwrappedParams = use(params);
    const data = use(getEnterpriseData(unwrappedParams.module));
    const title = MODULE_TITLES[unwrappedParams.module] || 'Enterprise Service';

    if (!data) return <div className="p-8 text-center text-slate-500">Service module unavailable or loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <Network className="w-6 h-6 text-primary-600" />
                        {title}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Shared enterprise service metrics</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {Object.entries(data).map(([key, kpi]: [string, any]) => (
                    <KPICard
                        key={key}
                        title={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        kpi={{ ...kpi, history: [] }} // Mock history for enterprise
                    />
                ))}
            </div>

            <div className="glass bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center mt-10 min-h-[300px]">
                <Building2 className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-700">Enterprise Data Warehouse Integrated</h3>
                <p className="text-slate-500 max-w-md mt-2">
                    {title} metrics are aggregated from the corporate ERP and synchronized with real-time operational data via Astrikos AI.
                </p>
            </div>
        </div>
    );
}
