"use client";

import { Machine } from "@/lib/types";
import { X, Thermometer, Gauge, Activity, Zap, Vibrate, Bot, ArrowRight, Clock, Wrench } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useRouter } from "next/navigation";
import { useWorkOrderStore } from "@/store/workOrderStore";

interface Props {
  machine: Machine | null;
  buildingName: string | null;
  onClose: () => void;
}

export default function MachineAnalyticsPanel({ machine, buildingName, onClose }: Props) {
  const { setSelectedWorkflow } = useUIStore();
  const router = useRouter();
  const { openCreateModal } = useWorkOrderStore();

  if (!machine) return null;

  const severity = machine.failureRisk > 30 ? "critical" : machine.failureRisk > 15 ? "warning" : "normal";

  const statusLabel = severity === "critical" ? "Critical" : severity === "warning" ? "Warning" : "Healthy";

  const statusColor =
    severity === "critical" ? "text-status-critical" : severity === "warning" ? "text-status-warning" : "text-status-normal";

  const glowBg =
    severity === "critical"
      ? "bg-status-critical/10 shadow-status-critical/40"
      : severity === "warning"
      ? "bg-status-warning/10 shadow-status-warning/40"
      : "bg-status-normal/10 shadow-status-normal/40";

  const handleOpenWorkflow = () => {
    setSelectedWorkflow("schedule-maintenance");
    onClose();
    router.push("/ai-workflow");
  };

  return (
    <div className="absolute left-4 bottom-4 w-80 bg-slate-950/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-30 animate-slide-in-up overflow-hidden">
      <div className="p-3 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Machine Analytics</div>
          <div className="text-sm font-semibold text-white leading-tight">{machine.name}</div>
          <div className="text-[11px] text-slate-400">
            {machine.type} • {buildingName}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded bg-white/5 hover:bg-white/20 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className={`rounded-xl border border-white/10 px-3 py-2 flex items-center justify-between shadow-lg ${glowBg}`}>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full status-dot ${severity} animate-pulse`} />
            <div>
              <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Health Score</div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-white">{(100 - machine.failureRisk).toFixed(1)}</span>
                <span className="text-[11px] text-slate-400">/ 100</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xs font-semibold uppercase tracking-wider ${statusColor}`}>{statusLabel}</div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3" />
              Live telemetry
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-900 rounded-lg p-3 border border-white/5">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Thermometer className="w-3.5 h-3.5" />
              <span>Temperature</span>
            </div>
            <div className="text-white font-mono font-medium">
              {machine.temp.toFixed(1)} <span className="text-[10px] text-slate-500">°C</span>
            </div>
          </div>
          <div className="bg-slate-900 rounded-lg p-3 border border-white/5">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Gauge className="w-3.5 h-3.5" />
              <span>Pressure</span>
            </div>
            <div className="text-white font-mono font-medium">
              {machine.pressure.toFixed(2)} <span className="text-[10px] text-slate-500">bar</span>
            </div>
          </div>
          <div className="bg-slate-900 rounded-lg p-3 border border-white/5">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Vibrate className="w-3.5 h-3.5" />
              <span>Vibration</span>
            </div>
            <div className="text-white font-mono font-medium">
              {(machine.vibration ?? 0).toFixed(2)} <span className="text-[10px] text-slate-500">mm/s</span>
            </div>
          </div>
          <div className="bg-slate-900 rounded-lg p-3 border border-white/5">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Zap className="w-3.5 h-3.5" />
              <span>Energy</span>
            </div>
            <div className="text-white font-mono font-medium">
              {machine.energy.toLocaleString()} <span className="text-[10px] text-slate-500">kW</span>
            </div>
          </div>
          <div className="bg-slate-900 rounded-lg p-3 border border-white/5">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Activity className="w-3.5 h-3.5" />
              <span>Utilization</span>
            </div>
            <div className="text-white font-mono font-medium">
              {machine.utilization.toFixed(1)} <span className="text-[10px] text-slate-500">%</span>
            </div>
          </div>
          <div className="bg-slate-900 rounded-lg p-3 border border-white/5">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Zap className="w-3.5 h-3.5" />
              <span>Failure Prob.</span>
            </div>
            <div
              className={`font-mono font-bold ${
                severity === "critical" ? "text-status-critical" : severity === "warning" ? "text-status-warning" : "text-status-normal"
              }`}
            >
              {machine.failureRisk.toFixed(1)} <span className="text-[10px] text-slate-500">%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-2">
        <button
          onClick={() =>
            openCreateModal({
              Subsystem: "Equipment Health",
              Equipment: machine.name,
              Description: `Machine panel request for ${machine.name} (${machine.type}) in ${buildingName ?? "unit"}.\n\nObservations:\n- Failure probability: ${machine.failureRisk.toFixed(
                1,
              )}%\n- Vibration: ${(machine.vibration ?? 0).toFixed(2)} mm/s\n- Temp: ${machine.temp.toFixed(1)} °C\n- Pressure: ${machine.pressure.toFixed(
                2,
              )} bar\n\nSuggested action: Inspect bearings / alignment; verify lubrication; schedule condition monitoring review.`,
              Priority: severity === "critical" ? "Critical" : severity === "warning" ? "High" : "Low",
              Source: "digital-twin-machine",
            })
          }
          className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-bold uppercase tracking-wider ${
            severity === "critical"
              ? "bg-status-critical/15 border-status-critical/30 text-status-critical"
              : severity === "warning"
                ? "bg-status-warning/15 border-status-warning/30 text-status-warning"
                : "bg-status-normal/10 border-status-normal/20 text-status-normal"
          } hover:opacity-90 transition-opacity`}
        >
          <Wrench className="w-4 h-4" />
          Create Work Order
        </button>
        <div className="bg-ai-900/40 border border-ai-700/60 rounded-lg p-3 flex items-start gap-2">
          <div className="mt-0.5">
            <Bot className="w-4 h-4 text-ai-300" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold text-ai-100 uppercase tracking-wider mb-1">AI Advisory</div>
            <p className="text-[11px] text-ai-100/90 leading-snug mb-2">
              Pump vibration anomaly detected. Recommend inspection within 48 hours to avoid unplanned downtime.
            </p>
            <button
              onClick={handleOpenWorkflow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ai-600 hover:bg-ai-500 text-white text-[11px] font-semibold rounded-md transition-colors"
            >
              Schedule Maintenance Workflow
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

