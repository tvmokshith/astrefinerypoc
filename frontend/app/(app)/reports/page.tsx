"use client";

import { BarChart3, Download, FileText, Zap, ShieldCheck, Leaf } from 'lucide-react';
import { useState } from 'react';

const REPORTS = [
    { id: 'ops', icon: BarChart3, title: 'Operational Performance Report', desc: 'Comprehensive daily yield and throughput analysis across all distillation units.', color: 'text-primary-600', bg: 'bg-primary-50' },
    { id: 'nrg', icon: Zap, title: 'Energy Efficiency Report', desc: 'Plant-wide energy intensity breakdown and optimization opportunities.', color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'maint', icon: ShieldCheck, title: 'Maintenance & Reliability Report', desc: 'Predictive health scoring, upcoming turnarounds, and work order backlog.', color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { id: 'esg', icon: Leaf, title: 'ESG Compliance Report', desc: 'Auditable carbon footprint, emissions, and environmental compliance data.', color: 'text-emerald-500', bg: 'bg-emerald-50' }
];

export default function ReportsPage() {
    const [generating, setGenerating] = useState<string | null>(null);

    const handleExport = (id: string) => {
        setGenerating(id);
        setTimeout(() => {
            setGenerating(null);
            // Stub PDF download trigger
            const a = document.createElement('a');
            a.href = "data:text/plain;charset=utf-8,Astrikos%20Report%20Stub";
            a.download = `astrikos-report-${id}-${new Date().toISOString().split('T')[0]}.pdf`;
            a.click();
        }, 1500);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">

            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    <FileText className="w-6 h-6 text-primary-600" />
                    Enterprise Reports
                </h1>
                <p className="text-slate-500 text-sm mt-1">Generate and export automated operational intelligence reports</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                {REPORTS.map((report) => (
                    <div key={report.id} className="glass bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col hover:shadow-md transition-shadow group">
                        <div className="flex items-start gap-4 mb-6">
                            <div className={`p-4 rounded-xl ${report.bg} ${report.color} group-hover:scale-110 transition-transform`}>
                                <report.icon className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-1 leading-tight">{report.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{report.desc}</p>
                            </div>
                        </div>

                        <div className="mt-auto space-y-3">
                            <div className="flex justify-between text-xs text-slate-400 font-medium px-1 mb-2">
                                <span>Last generated: {new Date().toLocaleDateString()}</span>
                                <span>PDF Format</span>
                            </div>
                            <button
                                onClick={() => handleExport(report.id)}
                                disabled={generating !== null}
                                className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 group-hover:border-primary-200 group-hover:text-primary-700 disabled:opacity-50"
                            >
                                {generating === report.id ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Generating PDF...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        Export Report PDF
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}
