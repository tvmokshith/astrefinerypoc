"use client";

import { Building2, Maximize2 } from 'lucide-react';
import Link from 'next/link';
import { useDataStore } from '@/store/dataStore';

export default function DigitalTwinPreview() {
    const buildings = useDataStore(s => s.buildings);

    return (
        <div className="glass rounded-xl overflow-hidden shadow-sm border border-slate-200 h-full flex flex-col relative group">
            <div className="absolute top-4 left-4 z-10">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white dark:border-slate-800">
                    <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    Digital Twin Preview
                </h3>
            </div>

            <Link href="/digital-twin" className="absolute top-4 right-4 z-10">
                <button className="bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-md p-2 rounded-lg border border-white dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary-600 transition-colors shadow-sm opacity-0 group-hover:opacity-100">
                    <Maximize2 className="w-4 h-4" />
                </button>
            </Link>

            <div className="absolute inset-0 bg-slate-900 bg-[url('https://images.unsplash.com/photo-1574828131365-2bc3ccb63756?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-60 mix-blend-overlay z-0" />

            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-900 to-transparent z-0" />

            <div className="flex-1 flex items-center justify-center relative z-10 w-full h-full">
                <div className="bg-black/45 backdrop-blur-xl p-5 rounded-2xl border border-white/10 text-left w-full max-w-md">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Astrikos Digital Twin</p>
                            <p className="text-white font-semibold text-sm">Cinematic 3D Refinery View</p>
                        </div>
                        <Building2 className="w-8 h-8 text-blue-400" />
                    </div>
                    <p className="text-slate-300 text-xs mb-3">
                        Navigate a fully interactive 3D refinery (now rendered with Three.js) that faithfully reproduces the layout and detail from the provided reference image, complete with labeled buildings, real‑world geometry, and all existing telemetry/advisory features.
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-300 mb-3">
                        <span>Tracked assets: <span className="font-semibold text-white">{buildings.length}</span></span>
                        <span className="text-slate-400">Mode: Orbit • Click to drill in</span>
                    </div>
                    <Link href="/digital-twin" className="mt-1 inline-block px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-lg shadow-primary-600/30">
                        Launch 3D Digital Twin
                    </Link>
                </div>
            </div>
        </div>
    );
}
