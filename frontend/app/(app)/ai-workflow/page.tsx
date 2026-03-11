"use client";

import { useState, useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';
import { api } from '@/lib/api';
import { WorkflowResult } from '@/lib/types';
import { Bot, Play, CheckCircle2, ChevronRight, Activity, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function WorkflowSimulatorPage() {
    const { selectedWorkflow } = useUIStore();
    const [result, setResult] = useState<WorkflowResult | null>(null);
    const [running, setRunning] = useState(false);
    const [step, setStep] = useState(-1);

    // If no workflow selected (e.g. direct load), default to optimize
    const workflowToRun = selectedWorkflow || 'optimize-process';

    const startSimulation = async () => {
        setRunning(true);
        setResult(null);
        setStep(0);

        // Simulate step progression
        for (let i = 0; i < 4; i++) {
            await new Promise(r => setTimeout(r, 800));
            setStep(i);
        }

        try {
            const data = await api.simulateWorkflow(workflowToRun);
            setResult(data);
        } catch (e) {
            console.error(e);
        } finally {
            setRunning(false);
            setStep(4); // complete
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">

            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600 font-medium transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
            </Link>

            <div className="glass bg-white rounded-xl shadow-lg border border-ai-200 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-ai-500/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />

                <div className="p-8 pb-10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 bg-gradient-to-br from-ai-500 to-ai-700 rounded-2xl flex items-center justify-center shadow-lg shadow-ai-500/30">
                            <Bot className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">AI Agent Workflow Simulator</h1>
                            <p className="text-slate-500 font-medium mt-1">Autonomous decision support & operational modeling</p>
                        </div>
                    </div>

                    {!running && step === -1 ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center max-w-lg mx-auto">
                            <Activity className="w-10 h-10 text-ai-400 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-700 mb-2">Ready to Simulate: {workflowToRun.replace(/-/g, ' ').toUpperCase()}</h3>
                            <p className="text-sm text-slate-500 mb-6">The AI Agent will analyze the current process state, run multi-variable optimization models, and predict operational outcomes.</p>

                            <button
                                onClick={startSimulation}
                                className="px-6 py-3 bg-ai-600 hover:bg-ai-500 text-white rounded-xl font-bold shadow-lg shadow-ai-600/30 transition-all hover:-translate-y-0.5 flex items-center gap-2 mx-auto"
                            >
                                <Play className="w-5 h-5 fill-current" />
                                Initialize AI Simulation
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Progress Steps */}
                            <div className="flex items-center justify-between relative">
                                <div className="absolute left-0 right-0 top-1/2 h-1 bg-slate-100 -z-10 -translate-y-1/2 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-ai-500 transition-all duration-500"
                                        style={{ width: `${(step / 3) * 100}%` }}
                                    />
                                </div>

                                {[
                                    'Agent Initialized',
                                    'Ingesting Telemetry',
                                    'Running ML Models',
                                    'Validating Constraints'
                                ].map((label, i) => (
                                    <div key={label} className="flex flex-col items-center gap-2 bg-white px-2">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${step > i ? 'bg-ai-500 border-ai-500 text-white' :
                                                step === i ? 'bg-white border-ai-500 text-ai-600 shadow-[0_0_15px_rgba(168,85,247,0.4)]' :
                                                    'bg-white border-slate-200 text-slate-400'
                                            }`}>
                                            {step > i ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                                        </div>
                                        <span className={`text-xs font-semibold ${step >= i ? 'text-slate-800' : 'text-slate-400'}`}>
                                            {label}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Running State */}
                            {running && (
                                <div className="py-12 text-center text-ai-600">
                                    <Bot className="w-12 h-12 mx-auto mb-4 animate-bounce" />
                                    <div className="text-lg font-bold animate-pulse">Processing Simulation...</div>
                                    <div className="text-sm text-slate-500 font-mono mt-2">Iterating through constraint bounds</div>
                                </div>
                            )}

                            {/* Results State */}
                            {result && !running && (
                                <div className="animate-fade-in space-y-6 mt-8">
                                    <div className="bg-ai-50 border border-ai-200 rounded-xl p-5 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-ai-900">{result.title}</h3>
                                            <p className="text-sm text-ai-700 font-medium">Simulation completed with {result.confidence}% prediction confidence.</p>
                                        </div>
                                        <div className="px-4 py-2 bg-white rounded-lg border border-ai-200 shadow-sm text-center">
                                            <div className="text-2xl font-black text-ai-600">{result.confidence}%</div>
                                            <div className="text-[10px] font-bold text-ai-400 uppercase tracking-widest">Confidence</div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-slate-700 mb-4 px-1">Predicted Outcomes</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {result.outcomes.map((outcome, i) => (
                                                <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-ai-300 transition-colors">
                                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{outcome.metric}</div>
                                                    <div className="text-3xl font-black text-slate-800 mb-1">{outcome.value}</div>
                                                    <div className="text-sm font-semibold text-status-normal">{outcome.saving}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4 border-t border-slate-100">
                                        <button className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-bold shadow-lg shadow-primary-600/30 transition-all flex items-center gap-2">
                                            Approve & Execute via DCS
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
