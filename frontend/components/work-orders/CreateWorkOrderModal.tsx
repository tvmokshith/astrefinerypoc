"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Wrench } from "lucide-react";
import { useWorkOrderStore, WorkOrderDraft } from "@/store/workOrderStore";
import { WorkOrderPriority } from "@/lib/types";

const PRIORITIES: WorkOrderPriority[] = ["Critical", "High", "Medium", "Low"];

function priorityStyles(p: WorkOrderPriority) {
  switch (p) {
    case "Critical":
      return "bg-status-critical/10 text-status-critical border-status-critical/20";
    case "High":
      return "bg-status-warning/10 text-status-warning border-status-warning/20";
    case "Medium":
      return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
    default:
      return "bg-status-normal/10 text-status-normal border-status-normal/20";
  }
}

export default function CreateWorkOrderModal() {
  const { createModalOpen, closeCreateModal, draft, create } = useWorkOrderStore();

  const initial = useMemo(() => {
    const d = draft ?? {};
    return {
      Subsystem: d.Subsystem ?? "",
      Equipment: d.Equipment ?? "",
      Description: d.Description ?? "",
      Priority: d.Priority ?? ("High" as WorkOrderPriority),
      AssignedTeam: d.AssignedTeam ?? "Maintenance",
      CreatedBy: d.CreatedBy ?? "operator",
      Source: d.Source ?? "manual",
      LinkedKPI: d.LinkedKPI ?? null,
      LinkedAlertID: d.LinkedAlertID ?? null,
    };
  }, [draft]);

  const [form, setForm] = useState<Required<Omit<WorkOrderDraft, "LinkedKPI" | "LinkedAlertID">> & { Priority: WorkOrderPriority } & { LinkedKPI: string | null; LinkedAlertID: string | null }>({
    Subsystem: "",
    Equipment: "",
    Description: "",
    Priority: "High",
    AssignedTeam: "Maintenance",
    CreatedBy: "operator",
    Source: "manual",
    LinkedKPI: null,
    LinkedAlertID: null,
  });

  useEffect(() => {
    if (!createModalOpen) return;
    setForm(initial as any);
  }, [createModalOpen, initial]);

  if (!createModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeCreateModal} />

      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-status-warning/10 text-status-warning">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100">Create Work Order</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Status will be <span className="font-semibold">Pending Approval</span> until an Admin approves it.
              </div>
            </div>
          </div>
          <button
            onClick={closeCreateModal}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          className="p-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const created = await create(form);
            closeCreateModal();
            // keep it quiet; Work Orders page + notifications surface it
            void created;
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Subsystem</div>
              <input
                value={form.Subsystem}
                onChange={(e) => setForm((s) => ({ ...s, Subsystem: e.target.value }))}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm"
                placeholder="e.g. Equipment Health"
                required
              />
            </label>
            <label className="space-y-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Equipment</div>
              <input
                value={form.Equipment}
                onChange={(e) => setForm((s) => ({ ...s, Equipment: e.target.value }))}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm"
                placeholder="e.g. Pump P-203"
                required
              />
            </label>
          </div>

          <label className="space-y-1 block">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Description</div>
            <textarea
              value={form.Description}
              onChange={(e) => setForm((s) => ({ ...s, Description: e.target.value }))}
              className="w-full min-h-[110px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm"
              placeholder="Describe the issue and required rectification steps..."
              required
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="space-y-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Priority</div>
              <div className="flex flex-wrap gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setForm((s) => ({ ...s, Priority: p }))}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase border transition-colors ${priorityStyles(p)} ${
                      form.Priority === p ? "ring-2 ring-primary-500/30" : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </label>
            <label className="space-y-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Assigned team</div>
              <input
                value={form.AssignedTeam}
                onChange={(e) => setForm((s) => ({ ...s, AssignedTeam: e.target.value }))}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Created by</div>
              <input
                value={form.CreatedBy}
                onChange={(e) => setForm((s) => ({ ...s, CreatedBy: e.target.value }))}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeCreateModal}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-sm font-bold bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-600/20"
            >
              Submit Work Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

