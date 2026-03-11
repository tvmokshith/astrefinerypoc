"use client";

import { create } from "zustand";
import { api } from "@/lib/api";
import { WorkOrder, WorkOrderPriority, WorkOrderStatus } from "@/lib/types";

export type WorkOrderDraft = {
  Subsystem?: string;
  Equipment?: string;
  Description?: string;
  Priority?: WorkOrderPriority;
  CreatedBy?: string;
  AssignedTeam?: string;
  Source?: string;
  LinkedKPI?: string | null;
  LinkedAlertID?: string | null;
};

type State = {
  workOrders: WorkOrder[];
  isLoading: boolean;
  error: string | null;

  createModalOpen: boolean;
  draft: WorkOrderDraft | null;

  openCreateModal: (draft?: WorkOrderDraft) => void;
  closeCreateModal: () => void;

  refresh: () => Promise<void>;
  create: (draft: WorkOrderDraft) => Promise<WorkOrder>;
  approve: (id: string) => Promise<void>;
  reject: (id: string) => Promise<void>;
  updateStatus: (id: string, status: WorkOrderStatus) => Promise<void>;
};

export const useWorkOrderStore = create<State>((set, get) => ({
  workOrders: [],
  isLoading: false,
  error: null,
  createModalOpen: false,
  draft: null,

  openCreateModal: (draft) => set({ createModalOpen: true, draft: draft ?? null }),
  closeCreateModal: () => set({ createModalOpen: false, draft: null }),

  refresh: async () => {
    set({ isLoading: true, error: null });
    try {
      const workOrders = await api.listWorkOrders();
      set({ workOrders, isLoading: false });
    } catch (e: any) {
      set({ error: e?.message ?? "Failed to load work orders", isLoading: false });
    }
  },

  create: async (draft) => {
    const payload: Partial<WorkOrder> = {
      Subsystem: draft.Subsystem ?? "Unknown",
      Equipment: draft.Equipment ?? "Unspecified",
      Description: draft.Description ?? "",
      Priority: draft.Priority ?? "Medium",
      Status: "Pending Approval",
      AssignedTeam: draft.AssignedTeam ?? "Maintenance",
      CreatedBy: draft.CreatedBy ?? "operator",
      CreatedDate: new Date().toISOString(),
      ApprovalStatus: "Pending",
      Source: draft.Source ?? "manual",
      LinkedKPI: draft.LinkedKPI ?? null,
      LinkedAlertID: draft.LinkedAlertID ?? null,
    };

    const created = await api.createWorkOrder(payload);
    set({ workOrders: [created, ...get().workOrders] });
    return created;
  },

  approve: async (id) => {
    const updated = await api.approveWorkOrder(id);
    set({ workOrders: get().workOrders.map((w) => (w.WorkOrderID === id ? updated : w)) });
  },

  reject: async (id) => {
    const updated = await api.rejectWorkOrder(id);
    set({ workOrders: get().workOrders.map((w) => (w.WorkOrderID === id ? updated : w)) });
  },

  updateStatus: async (id, status) => {
    const updated = await api.patchWorkOrder(id, { Status: status });
    set({ workOrders: get().workOrders.map((w) => (w.WorkOrderID === id ? updated : w)) });
  },
}));

