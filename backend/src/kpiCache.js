const { getKPIs: generateKPIs } = require("./dataGenerator");

// Default refresh: 24h for most KPIs, 30d for throughput.
const MS_24H = 24 * 60 * 60 * 1000;
const MS_30D = 30 * 24 * 60 * 60 * 1000;

let cache = null;
let cacheAt = 0;

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const EXPECTED_KEYS = [
  ['crudeProcessing', 'grossRefiningMargin'],
  ['environmental', 'environmentalComplianceIndex'],
];

function hasAllExpectedKeys(c) {
  return EXPECTED_KEYS.every(([sub, key]) => c && c[sub] && c[sub][key]);
}

function shouldRefresh(now) {
  if (!cache) return true;
  if (!hasAllExpectedKeys(cache)) return true;
  if (now - cacheAt > MS_24H) return true;
  return false;
}

function refresh(now) {
  cache = generateKPIs();
  cacheAt = now;
  getCachedKPIs._throughput = null; // invalidate throughput sub-cache
  return cache;
}

function getCachedKPIs() {
  const now = Date.now();
  if (shouldRefresh(now)) refresh(now);
  const out = deepClone(cache);

  // Throughput special rule: update only every 30 days.
  // We keep a separate cached value for crude throughput.
  if (!getCachedKPIs._throughput) {
    getCachedKPIs._throughput = {
      value: out.crudeProcessing.crudeThroughput.value,
      unit: out.crudeProcessing.crudeThroughput.unit,
      status: out.crudeProcessing.crudeThroughput.status,
      history: out.crudeProcessing.crudeThroughput.history,
      at: now,
    };
  }

  const thr = getCachedKPIs._throughput;
  if (now - thr.at > MS_30D) {
    getCachedKPIs._throughput = {
      value: out.crudeProcessing.crudeThroughput.value,
      unit: out.crudeProcessing.crudeThroughput.unit,
      status: out.crudeProcessing.crudeThroughput.status,
      history: out.crudeProcessing.crudeThroughput.history,
      at: now,
    };
  } else {
    out.crudeProcessing.crudeThroughput.value = thr.value;
    out.crudeProcessing.crudeThroughput.unit = thr.unit;
    out.crudeProcessing.crudeThroughput.status = thr.status;
    out.crudeProcessing.crudeThroughput.history = thr.history;
  }

  out._meta = {
    generatedAt: new Date(cacheAt).toISOString(),
    throughputGeneratedAt: new Date(getCachedKPIs._throughput.at).toISOString(),
    refreshPolicy: {
      default: "24h",
      throughput: "30d",
    },
  };

  return out;
}

module.exports = { getCachedKPIs };

