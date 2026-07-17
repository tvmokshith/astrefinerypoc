const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const STORE_PATH = path.join(DATA_DIR, "work-orders.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadAll() {
  try {
    ensureDir();
    if (!fs.existsSync(STORE_PATH)) return [];
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(workOrders) {
  ensureDir();
  const tmp = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(workOrders, null, 2), "utf8");
  fs.renameSync(tmp, STORE_PATH);
}

function newId(prefix = "WO") {
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${Date.now()}-${rand}`;
}

/**
 * Work order schema (canonical):
 * - WorkOrderID, Subsystem, Equipment, Description, Priority, Status, AssignedTeam,
 *   CreatedBy, CreatedDate, ApprovalStatus, Source, LinkedKPI, LinkedAlertID
 */
function normalize(raw) {
  const WorkOrderID = raw.WorkOrderID || raw.id || newId();
  const CreatedDate = raw.CreatedDate || raw.createdAt || new Date().toISOString();
  return {
    WorkOrderID,
    Subsystem: raw.Subsystem ?? raw.subsystem ?? "Unknown",
    Equipment: raw.Equipment ?? raw.equipment ?? raw.unit ?? "Unspecified",
    Description: raw.Description ?? raw.description ?? "",
    Priority: raw.Priority ?? raw.priority ?? "Medium",
    Status: raw.Status ?? raw.status ?? "Pending Approval",
    AssignedTeam: raw.AssignedTeam ?? raw.assignedTeam ?? "Maintenance",
    CreatedBy: raw.CreatedBy ?? raw.createdBy ?? "system",
    CreatedDate,
    ApprovalStatus: raw.ApprovalStatus ?? raw.approvalStatus ?? "Pending",
    Source: raw.Source ?? raw.source ?? "manual",
    LinkedKPI: raw.LinkedKPI ?? raw.linkedKpi ?? null,
    LinkedAlertID: raw.LinkedAlertID ?? raw.linkedAlertId ?? null,
  };
}

function list({ approvalStatus, status } = {}) {
  let all = loadAll().map(normalize);
  if (approvalStatus) all = all.filter((w) => w.ApprovalStatus === approvalStatus);
  if (status) all = all.filter((w) => w.Status === status);
  return all.sort((a, b) => new Date(b.CreatedDate).getTime() - new Date(a.CreatedDate).getTime());
}

function getById(id) {
  return loadAll().map(normalize).find((w) => w.WorkOrderID === id) || null;
}

function create(input) {
  const all = loadAll().map(normalize);
  const wo = normalize({
    ...input,
    WorkOrderID: input?.WorkOrderID || newId("WO"),
    CreatedDate: input?.CreatedDate || new Date().toISOString(),
  });
  all.unshift(wo);
  saveAll(all);
  return wo;
}

function patch(id, partial) {
  const all = loadAll().map(normalize);
  const idx = all.findIndex((w) => w.WorkOrderID === id);
  if (idx === -1) return null;
  const next = normalize({ ...all[idx], ...partial, WorkOrderID: id });
  all[idx] = next;
  saveAll(all);
  return next;
}

function findOpenByLinkedKPI(linkedKpi) {
  if (!linkedKpi) return null;
  const all = loadAll().map(normalize);
  return (
    all.find(
      (w) =>
        w.LinkedKPI === linkedKpi &&
        w.ApprovalStatus !== "Rejected" &&
        w.Status !== "Completed",
    ) || null
  );
}

module.exports = {
  list,
  getById,
  create,
  patch,
  findOpenByLinkedKPI,
};

