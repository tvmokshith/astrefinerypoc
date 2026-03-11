const crypto = require("crypto");

const MAX_EVENTS = 200;

const PRIORITY_ORDER = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

let events = [];

function newId(prefix = "EVT") {
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${Date.now()}-${rand}`;
}

function normalize(e) {
  return {
    EventID: e.EventID || e.id || newId(),
    Severity: e.Severity || e.severity || "Normal", // Critical | Warning | Normal
    Priority: e.Priority || e.priority || "Low", // Critical | High | Medium | Low
    Subsystem: e.Subsystem || e.subsystem || "Unknown",
    Equipment: e.Equipment || e.equipment || "Unspecified",
    Description: e.Description || e.description || "",
    Timestamp: e.Timestamp || e.timestamp || new Date().toISOString(),
    LinkedKPI: e.LinkedKPI || e.linkedKpi || null,
    LinkedAlertID: e.LinkedAlertID || e.linkedAlertId || null,
  };
}

function upsertMany(list) {
  const normalized = list.map(normalize);
  // stable list behavior: append new IDs only
  const existingIds = new Set(events.map((e) => e.EventID));
  normalized.forEach((e) => {
    if (!existingIds.has(e.EventID)) events.unshift(e);
  });
  if (events.length > MAX_EVENTS) events = events.slice(0, MAX_EVENTS);
}

function list() {
  return [...events].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.Priority] ?? 99;
    const pb = PRIORITY_ORDER[b.Priority] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime();
  });
}

module.exports = { upsertMany, list, normalize };

