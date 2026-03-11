// Simulated Refinery Data Generator
const { v4: uuid } = require('crypto');

function noise(base, pct = 0.05) {
  return +(base + base * (Math.random() - 0.5) * pct * 2).toFixed(2);
}

function rand(min, max, decimals = 1) {
  return +(Math.random() * (max - min) + min).toFixed(decimals);
}

function getStatus(value, green, amber) {
  if (value >= green) return 'normal';
  if (value >= amber) return 'warning';
  return 'critical';
}

function getStatusHigh(value, amber, red) {
  if (value <= amber) return 'normal';
  if (value <= red) return 'warning';
  return 'critical';
}

// Utility to map a raw value into normal/warning/critical for generic sensors
function classify(value, { min, max, warningLow, warningHigh }) {
  if (value < warningLow || value > warningHigh) return 'critical';
  if (value < min || value > max) return 'warning';
  return 'normal';
}

function historyPoints(base, count = 30, pct = 0.08, stepMinutes = 60) {
  const arr = [];
  let v = base;
  const now = Date.now();
  for (let i = count - 1; i >= 0; i--) {
    v = +(v + v * (Math.random() - 0.5) * pct).toFixed(2);
    const timestamp = new Date(now - i * stepMinutes * 60000).toISOString();
    arr.push({ timestamp, value: v });
  }
  return arr;
}

// --- Synthetic sensor universe (5000+ streams) ---

// 10 refinery units as required
const UNITS = [
  'Crude Distillation Unit',
  'Vacuum Distillation',
  'Catalytic Cracking',
  'Hydrotreater',
  'Reformer',
  'Hydrogen Plant',
  'Utilities',
  'Tank Farm',
  'Power Plant',
  'Flare & Emissions',
];

// 50 machines per unit, with realistic labels
const MACHINE_TYPES = [
  'Pump',
  'Compressor',
  'Furnace',
  'Reactor',
  'Heat Exchanger',
];

// 10 sensor types per machine
const SENSOR_DEFS = [
  { key: 'temperature', suffix: 'Temp', unit: '°C', min: 50, max: 650, warningLow: 80, warningHigh: 620 },
  { key: 'pressure', suffix: 'Pressure', unit: 'bar', min: 1, max: 150, warningLow: 5, warningHigh: 130 },
  { key: 'flow', suffix: 'Flow', unit: 'bbl/h', min: 100, max: 20000, warningLow: 500, warningHigh: 18000 },
  { key: 'vibration', suffix: 'Vibration', unit: 'mm/s', min: 0.5, max: 20, warningLow: 1.5, warningHigh: 8 },
  { key: 'energy', suffix: 'Energy', unit: 'MW', min: 10, max: 500, warningLow: 30, warningHigh: 420 },
  { key: 'fuel', suffix: 'Fuel_Usage', unit: 'kg/h', min: 100, max: 8000, warningLow: 400, warningHigh: 7000 },
  { key: 'emissions', suffix: 'CO2', unit: 'kg/h', min: 10, max: 2000, warningLow: 80, warningHigh: 1600 },
  { key: 'load', suffix: 'Load', unit: '%', min: 30, max: 100, warningLow: 40, warningHigh: 95 },
  { key: 'valve', suffix: 'Valve_Pos', unit: '%', min: 0, max: 100, warningLow: 5, warningHigh: 95 },
  { key: 'level', suffix: 'Level', unit: '%', min: 5, max: 100, warningLow: 10, warningHigh: 95 },
];

let SENSOR_META = null;

function buildSensorUniverse() {
  if (SENSOR_META) return SENSOR_META;

  const sensors = [];

  UNITS.forEach((unitName, unitIdx) => {
    for (let m = 1; m <= 50; m++) {
      const machineType = MACHINE_TYPES[(m + unitIdx) % MACHINE_TYPES.length];
      const machineId = `${unitName.split(' ').map(s => s[0]).join('')}_M${String(m).padStart(2, '0')}`;

      SENSOR_DEFS.forEach((sd, sIdx) => {
        const sensorId = `${machineId}_${sd.suffix}_${String(sIdx + 1).padStart(2, '0')}`;
        sensors.push({
          sensor_id: sensorId,
          unit: unitName,
          machine_id: machineId,
          machine_type: machineType,
          sensor_type: sd.key,
          name: `${machineType} ${sd.suffix.replace('_', ' ')}`,
          ranges: {
            min: sd.min,
            max: sd.max,
            warningLow: sd.warningLow,
            warningHigh: sd.warningHigh,
          },
          unitSymbol: sd.unit,
        });
      });
    }
  });

  // Safety check – must be at least 5000 sensors
  if (sensors.length < 5000) {
    throw new Error(`Synthetic sensor universe too small: ${sensors.length}`);
  }

  SENSOR_META = sensors;
  return SENSOR_META;
}

// Live sensor snapshot (1-second style updates for UI)
function getLiveSensors(filter = {}) {
  const { unit, machineId } = filter;
  const sensors = buildSensorUniverse().filter((s) => {
    if (unit && s.unit !== unit) return false;
    if (machineId && s.machine_id !== machineId) return false;
    return true;
  });

  const now = new Date().toISOString();

  return sensors.map((s) => {
    const base = rand(s.ranges.min, s.ranges.max, 2);
    // Inject occasional anomalies
    const anomalyRoll = Math.random();
    let value = base;
    if (anomalyRoll > 0.985) {
      // critical spike
      value = base * rand(1.3, 1.8, 2);
    } else if (anomalyRoll > 0.96) {
      // warning excursion
      value = base * rand(1.1, 1.3, 2);
    }

    const status = classify(
      value,
      s.ranges,
    );

    return {
      sensor_id: s.sensor_id,
      unit: s.unit,
      machine_id: s.machine_id,
      machine_type: s.machine_type,
      sensor_type: s.sensor_type,
      timestamp: now,
      value: +value.toFixed(2),
      unitSymbol: s.unitSymbol,
      status,
    };
  });
}

// Historical time series – 30 days with trend + seasonal variation (compressed sampling)
function getUnitSensorSummary() {
  const live = getLiveSensors();
  const byUnit = new Map();

  live.forEach((s) => {
    if (!byUnit.has(s.unit)) {
      byUnit.set(s.unit, {
        unit: s.unit,
        totalSensors: 0,
        criticalSensors: 0,
        warningSensors: 0,
        avgTemperature: null,
        avgPressure: null,
        avgFlow: null,
      });
    }

    const row = byUnit.get(s.unit);
    row.totalSensors += 1;
    if (s.status === 'critical') row.criticalSensors += 1;
    if (s.status === 'warning') row.warningSensors += 1;
  });

  const aggregate = (unitName, sensorType) => {
    const rows = live.filter((s) => s.unit === unitName && s.sensor_type === sensorType);
    if (!rows.length) return null;
    const avg = rows.reduce((sum, s) => sum + s.value, 0) / rows.length;
    return +avg.toFixed(2);
  };

  return Array.from(byUnit.values()).map((row) => ({
    ...row,
    avgTemperature: aggregate(row.unit, 'temperature'),
    avgPressure: aggregate(row.unit, 'pressure'),
    avgFlow: aggregate(row.unit, 'flow'),
  }));
}
function getSensorHistory(sensorId, options = {}) {
  const { days = 30, intervalSeconds = 60 } = options;
  const meta = buildSensorUniverse().find((s) => s.sensor_id === sensorId);
  if (!meta) return [];

  const totalPoints = Math.floor((days * 24 * 60 * 60) / intervalSeconds);
  const now = Date.now();
  const points = [];

  // Base in middle of normal range
  let base = (meta.ranges.min + meta.ranges.max) / 2;

  for (let i = totalPoints - 1; i >= 0; i--) {
    const t = now - i * intervalSeconds * 1000;
    const hourOfDay = new Date(t).getHours();

    // Daily seasonal pattern (e.g. higher load in day)
    const diurnalFactor = 1 + 0.15 * Math.sin(((hourOfDay / 24) * Math.PI * 2));

    // Slow drift to model degradation or load changes
    const drift = 1 + 0.05 * Math.sin(((i / totalPoints) * Math.PI * 4));

    base = base * diurnalFactor * drift;
    const value = noise(base, 0.03);
    const status = classify(value, meta.ranges);

    points.push({
      sensor_id: sensorId,
      timestamp: new Date(t).toISOString(),
      value: +value.toFixed(2),
      unit: meta.unitSymbol,
      status,
    });
  }

  return points;
}

function getKPIs() {
  return {
    crudeProcessing: {
      crudeThroughput: { value: noise(102500, 0.03), unit: 'bbl/day', status: getStatus(noise(102500, 0.03), 95000, 80000), history: historyPoints(102500) },
      distillationEfficiency: { value: noise(92.4, 0.02), unit: '%', status: getStatus(noise(92.4, 0.02), 90, 85), history: historyPoints(92.4) },
      furnaceEfficiency: { value: noise(88.1, 0.02), unit: '%', status: getStatus(noise(88.1, 0.02), 85, 78), history: historyPoints(88.1) },
      hydrogenConsumption: { value: noise(1420, 0.04), unit: 'Nm³/h', status: getStatusHigh(noise(1420, 0.04), 1500, 1800), history: historyPoints(1420) },
      columnPressureStability: { value: noise(97.2, 0.01), unit: '%', status: getStatus(noise(97.2, 0.01), 95, 90), history: historyPoints(97.2) },
      productYieldRatio: { value: noise(84.6, 0.02), unit: '%', status: getStatus(noise(84.6, 0.02), 82, 78), history: historyPoints(84.6) },
      grossRefiningMargin: { value: noise(8.45, 0.04), unit: '$/bbl', status: getStatus(noise(8.45, 0.04), 7, 5), history: historyPoints(8.45) },
    },
    equipmentHealth: {
      equipmentUptime: { value: noise(97.3, 0.01), unit: '%', status: getStatus(noise(97.3, 0.01), 95, 90), history: historyPoints(97.3) },
      mtbf: { value: noise(1840, 0.04), unit: 'hrs', status: getStatus(noise(1840, 0.04), 1500, 1000), history: historyPoints(1840) },
      mttr: { value: noise(4.2, 0.08), unit: 'hrs', status: getStatusHigh(noise(4.2, 0.08), 6, 12), history: historyPoints(4.2) },
      vibrationIndex: { value: noise(2.1, 0.06), unit: 'mm/s', status: getStatusHigh(noise(2.1, 0.06), 3.5, 7), history: historyPoints(2.1) },
      maintenanceBacklog: { value: noise(12, 0.10), unit: 'tasks', status: getStatusHigh(noise(12, 0.10), 20, 35), history: historyPoints(12) },
    },
    energyManagement: {
      energyIntensityIndex: { value: noise(0.82, 0.03), unit: 'GJ/bbl', status: getStatusHigh(noise(0.82, 0.03), 0.9, 1.1), history: historyPoints(0.82) },
      energyPerBarrel: { value: noise(153.4, 0.03), unit: 'MJ/bbl', status: getStatusHigh(noise(153.4, 0.03), 165, 185), history: historyPoints(153.4) },
      boilerEfficiency: { value: noise(91.2, 0.02), unit: '%', status: getStatus(noise(91.2, 0.02), 88, 82), history: historyPoints(91.2) },
      steamUsage: { value: noise(2840, 0.04), unit: 't/day', status: getStatusHigh(noise(2840, 0.04), 3000, 3500), history: historyPoints(2840) },
      powerConsumption: { value: noise(48.6, 0.04), unit: 'MW', status: getStatusHigh(noise(48.6, 0.04), 55, 65), history: historyPoints(48.6) },
    },
    productionYield: {
      gasolineYield: { value: noise(38.4, 0.03), unit: '%', status: getStatus(noise(38.4, 0.03), 36, 32), history: historyPoints(38.4) },
      dieselYield: { value: noise(27.1, 0.03), unit: '%', status: getStatus(noise(27.1, 0.03), 25, 22), history: historyPoints(27.1) },
      jetFuelYield: { value: noise(12.8, 0.04), unit: '%', status: getStatus(noise(12.8, 0.04), 11, 9), history: historyPoints(12.8) },
      lgpOutput: { value: noise(8420, 0.04), unit: 't/day', status: getStatus(noise(8420, 0.04), 7500, 6000), history: historyPoints(8420) },
      heavyResidue: { value: noise(14.2, 0.05), unit: '%', status: getStatusHigh(noise(14.2, 0.05), 16, 20), history: historyPoints(14.2) },
    },
    environmental: {
      co2Emissions: { value: noise(1842, 0.04), unit: 't/day', status: getStatusHigh(noise(1842, 0.04), 2000, 2500), history: historyPoints(1842) },
      soxEmissions: { value: noise(2.4, 0.06), unit: 't/day', status: getStatusHigh(noise(2.4, 0.06), 3, 5), history: historyPoints(2.4) },
      noxEmissions: { value: noise(1.8, 0.06), unit: 't/day', status: getStatusHigh(noise(1.8, 0.06), 2.5, 4), history: historyPoints(1.8) },
      flareGasVolume: { value: noise(84, 0.08), unit: 'Nm³/h', status: getStatusHigh(noise(84, 0.08), 100, 150), history: historyPoints(84) },
      waterDischargeQuality: { value: noise(94.2, 0.02), unit: '%', status: getStatus(noise(94.2, 0.02), 90, 85), history: historyPoints(94.2) },
      environmentalComplianceIndex: { value: noise(87.2, 0.02), unit: '%', status: getStatus(noise(87.2, 0.02), 85, 75), history: historyPoints(87.2) },
    },
    safety: {
      pressureSafetyIndex: { value: noise(96.8, 0.01), unit: '%', status: getStatus(noise(96.8, 0.01), 95, 88), history: historyPoints(96.8) },
      leakDetectionEvents: { value: Math.floor(rand(0, 3, 0)), unit: 'events/day', status: getStatusHigh(Math.floor(rand(0, 3, 0)), 2, 5), history: historyPoints(0.8, 30, 0.5) },
      emergencyShutdownEvents: { value: Math.floor(rand(0, 1, 0)), unit: 'events/month', status: getStatusHigh(Math.floor(rand(0, 1, 0)), 1, 3), history: historyPoints(0.2, 30, 1) },
      hazardRiskIndex: { value: noise(18.4, 0.06), unit: 'score', status: getStatusHigh(noise(18.4, 0.06), 25, 40), history: historyPoints(18.4) },
    },
  };
}

// Machine-level status view derived from sensor health
function getMachineStatusSummary() {
  const sensors = getLiveSensors();
  const byMachine = new Map();

  sensors.forEach((s) => {
    const key = s.machine_id;
    if (!byMachine.has(key)) {
      byMachine.set(key, {
        machine_id: key,
        unit: s.unit,
        machine_type: s.machine_type,
        sensors: [],
      });
    }
    byMachine.get(key).sensors.push(s);
  });

  const machines = [];

  byMachine.forEach((m) => {
    const total = m.sensors.length;
    const critical = m.sensors.filter((s) => s.status === 'critical').length;
    const warning = m.sensors.filter((s) => s.status === 'warning').length;

    const healthScore = Math.max(
      0,
      100 - (critical * 15 + warning * 5),
    );

    const failureProbability = Math.min(
      95,
      critical * 5 + warning * 2 + rand(0, 5, 1),
    );

    machines.push({
      machine_id: m.machine_id,
      unit: m.unit,
      machine_type: m.machine_type,
      healthScore: +healthScore.toFixed(1),
      failureProbability: +failureProbability.toFixed(1),
      criticalSensors: critical,
      warningSensors: warning,
      totalSensors: total,
    });
  });

  return machines;
}

const ALERT_TEMPLATES = [
  {
    type: 'Equipment',
    subsystem: 'Equipment Health',
    equipment: 'Pump P-101',
    message: 'Pump vibration exceeded safe operating range.',
    detailedDescription: 'Pump P-101 vibration trending above baseline. Spectrum indicates possible bearing wear and cavitation.',
    suggestedAction: 'Inspect pump bearings and suction conditions within 24 hours. Verify alignment and lubrication.',
    linkedKpi: 'equipmentHealth.vibrationIndex',
    severity: 'warning',
    unit: 'Crude Distillation Unit',
  },
  {
    type: 'Equipment',
    subsystem: 'Equipment Health',
    equipment: 'Heat Exchanger HE-204',
    message: 'Heat exchanger fouling detected (approach temperature increasing).',
    detailedDescription: 'HE-204 approach temperature has increased indicating fouling. Expected duty reduction may impact product quality.',
    suggestedAction: 'Schedule cleaning and verify filter/strainer condition. Review fouling trend for root cause.',
    linkedKpi: 'equipmentHealth.mttr',
    severity: 'warning',
    unit: 'Hydrotreater',
  },
  {
    type: 'Emission',
    subsystem: 'Environmental',
    equipment: 'Stack S-3',
    message: 'SOx emissions approaching permit breach.',
    detailedDescription: 'Stack S-3 SOx concentration is above the warning band and approaching regulatory limits.',
    suggestedAction: 'Check scrubber reagent flow and analyzer calibration. Reduce sulfur feed rate if required.',
    linkedKpi: 'environmental.soxEmissions',
    severity: 'critical',
    unit: 'Environmental',
  },
  {
    type: 'Energy',
    subsystem: 'Energy Management',
    equipment: 'FCC Power Feed',
    message: 'Power consumption above baseline on FCC unit.',
    detailedDescription: 'FCC electrical load is elevated relative to baseline for the same throughput, indicating inefficiency or abnormal compressor loading.',
    suggestedAction: 'Review compressor recycle, check fouling/pressure drops, and validate control setpoints.',
    linkedKpi: 'energyManagement.powerConsumption',
    severity: 'warning',
    unit: 'Catalytic Cracking Unit',
  },
  {
    type: 'Safety',
    subsystem: 'Safety',
    equipment: 'PRV-08',
    message: 'Pressure relief valve actuation detected.',
    detailedDescription: 'PRV-08 actuation suggests a transient overpressure condition; recurrence increases equipment and personnel risk.',
    suggestedAction: 'Investigate upstream pressure controller tuning and verify relief header backpressure.',
    linkedKpi: 'safety.pressureSafetyIndex',
    severity: 'critical',
    unit: 'Safety',
  },
  {
    type: 'Equipment',
    subsystem: 'Equipment Health',
    equipment: 'Compressor C-301',
    message: 'Compressor bearing temperature elevated.',
    detailedDescription: 'C-301 bearing temperature is above expected operating range. Potential lubrication or cooling issue.',
    suggestedAction: 'Check lube oil pressure/flow and cooling water. Inspect bearing housing sensors and alarms.',
    linkedKpi: 'equipmentHealth.mtbf',
    severity: 'warning',
    unit: 'Reforming Unit',
  },
  {
    type: 'Energy',
    subsystem: 'Energy Management',
    equipment: 'Boiler Train',
    message: 'Boiler efficiency below target threshold.',
    detailedDescription: 'Utility boiler efficiency has dropped below target. Likely due to excess air, fouling, or burner imbalance.',
    suggestedAction: 'Perform combustion tuning and check oxygen trim. Inspect for fouling and steam leaks.',
    linkedKpi: 'energyManagement.boilerEfficiency',
    severity: 'warning',
    unit: 'Utilities',
  },
  {
    type: 'Emission',
    subsystem: 'Environmental',
    equipment: 'Flare System',
    message: 'Flare gas volume increase detected.',
    detailedDescription: 'Increase in flare gas suggests an upset or pressure control issue. Extended flaring increases emissions and product loss.',
    suggestedAction: 'Identify source unit, check PSV lifts, and stabilize upstream pressure control.',
    linkedKpi: 'environmental.flareGasVolume',
    severity: 'warning',
    unit: 'Environmental',
  },
  {
    type: 'Equipment',
    subsystem: 'Crude Processing',
    equipment: 'Furnace F-101',
    message: 'Furnace tube skin temperature high.',
    detailedDescription: 'F-101 tube skin temperature indicates hot spots that may lead to tube failure if not corrected.',
    suggestedAction: 'Reduce firing rate, verify burner balance, and inspect for coking/fouling.',
    linkedKpi: 'crudeProcessing.furnaceEfficiency',
    severity: 'critical',
    unit: 'Crude Distillation Unit',
  },
  {
    type: 'Safety',
    subsystem: 'Safety',
    equipment: 'H2S Sensor Network',
    message: 'H2S leak sensor triggered at Hydrogen Plant.',
    detailedDescription: 'Hydrogen Plant gas detector triggered. Potential H2S release requires immediate response and area verification.',
    suggestedAction: 'Initiate gas test, isolate suspected source, and follow emergency response procedure.',
    linkedKpi: 'safety.leakDetectionEvents',
    severity: 'critical',
    unit: 'Hydrogen Plant',
  },
];

function getAlerts() {
  const now = Date.now();
  return ALERT_TEMPLATES.map((a, i) => ({
    id: `alert-${now}-${i}`,
    ...a,
    timestamp: new Date(now - i * rand(5, 30, 0) * 60000).toISOString(),
  }));
}

const ADVISORY_TEMPLATES = {
  crudeProcessing: [
    {
      id: 1,
      severity: 'warning',
      system: 'Process Optimization',
      title: 'Furnace Optimization',
      message: 'Furnace F-101 operating above optimal temperature. Reducing temperature by 10–15°C may improve efficiency by 4–5%.',
      impact: '4–5% fuel gas reduction, ~$42K/month savings',
      rootCause: 'Excess air ratio in F-101 is running at 18% above stoichiometric, leading to elevated stack temperature (285°C vs target 240°C). This is caused by a drifted O2 trim controller set-point after last turnaround.',
      solution: 'Reduce O2 trim set-point from 3.8% to 2.8% via DCS FIC-101. Verify bridge-wall temperature drops by at least 8°C before committing. If temperature stabilises within target, reduce fuel gas flow by 6%.',
      benefit: 'Reducing excess O2 by 1% recovers ~0.5% furnace efficiency. At current throughput, this translates to 4–5% fuel gas savings and approximately $42,000/month. It also extends tube life by reducing thermal cycling stress.',
      action: 'Optimize Process Parameters',
      workflow: 'optimize-process',
      unitId: 'cdu',
    },
    {
      id: 2,
      severity: 'info',
      system: 'Process Optimization',
      title: 'Crude Mix Rebalancing',
      message: 'Crude Distillation Column pressure variance detected. Rebalancing crude mix with 15% lighter crude can increase gasoline yield.',
      impact: '+2–3% gasoline yield, ~$380K/month uplift',
      rootCause: 'Current crude slate includes 68% heavy Arab medium with API gravity 31. Column tray loading is near hydraulic capacity on trays 12–18, creating pressure drop spikes and reducing light cut recovery.',
      solution: 'Blend in 15% Condensate (API 55+) to reduce overall feed density. Adjust crude pre-heat train duty via HIC-201 to maintain column inlet at 342°C. Re-tune top pressure controller to 1.65 bar abs.',
      benefit: 'Lighter crude blend reduces column internal reflux requirement, freeing tray capacity and improving light component separation. Gasoline yield increases 2–3%, adding ~$380K/month at current product pricing.',
      action: 'Rebalance Crude Mix',
      workflow: 'rebalance-crude',
      unitId: 'cdu',
    },
    {
      id: 3,
      severity: 'normal',
      system: 'Process Optimization',
      title: 'Column Pressure Stable',
      message: 'Column pressure stability is within optimal range. No action required.',
      impact: 'No immediate optimization required',
      rootCause: 'No anomaly detected. All column pressure indicators are within ±2% of set-point.',
      solution: 'Maintain current control loop tuning parameters. Schedule routine review at next shift handover.',
      benefit: 'Consistent pressure stability ensures maximum tray efficiency and product cut accuracy.',
      action: null,
      workflow: null,
      unitId: 'cdu',
    },
  ],
  equipmentHealth: [
    {
      id: 1,
      severity: 'critical',
      system: 'Predictive Maintenance',
      title: 'Pump P-101 Maintenance Due',
      message: 'Pump vibration anomaly detected on P-101. Spectrum indicates potential cavitation and bearing wear.',
      impact: 'High failure risk within 72 hours; unplanned downtime ~8 hrs',
      rootCause: 'Vibration spectrum FFT on P-101 shows a 2× shaft-speed peak at 142 Hz with amplitude 8.2 mm/s — 3.4× above baseline. Sub-harmonic activity at 0.45× shaft speed indicates incipient cavitation from low NPSH margin caused by increased suction strainer ΔP (0.9 bar vs allowed 0.4 bar).',
      solution: '1) Immediately reduce pump discharge flow by 12% via FCV-101 to reduce cavitation. 2) Isolate and clean suction strainer STR-101A (estimated 45 min). 3) Check standby pump P-101B alignment before bringing online. 4) Replace thrust bearing during next 4-hour opportunity window.',
      benefit: 'Addressing cavitation and bearing wear before failure avoids 8–12 hours of unplanned CDU downtime worth ~$1.2M in lost throughput. Preventive bearing replacement costs approximately $8,000 vs ~$65,000 for emergency repair post-failure.',
      action: 'Schedule Maintenance',
      workflow: 'schedule-maintenance',
      unitId: 'cdu',
    },
    {
      id: 2,
      severity: 'warning',
      system: 'Predictive Maintenance',
      title: 'MTTR Trending High',
      message: 'Mean Time To Repair increased 18% vs last month for rotating equipment.',
      impact: '0.6% reduction in expected availability',
      rootCause: 'Analysis shows increased MTTR is concentrated on 4 compressors in the utilities section. Root cause is parts availability — critical seals and bearings for models KMC-40 and KMC-55 have lead times exceeding 6 weeks due to supplier backlog.',
      solution: 'Raise minimum stock levels for KMC-series seals and bearings via procurement PO-2024-1182. Implement a 90-day rolling consumption forecast for critical spares. Consider multi-sourcing from approved alternate suppliers PN-7712 and PN-7803.',
      benefit: 'Reducing parts wait time from 7 days to <24 hours returns MTTR to baseline, recovering 0.6% availability. At 100,000 bbl/day throughput, this equates to ~600 bbl/day additional uptime buffer worth ~$42,000/day.',
      action: 'Schedule Maintenance',
      workflow: 'schedule-maintenance',
      unitId: 'util',
    },
    {
      id: 3,
      severity: 'info',
      system: 'Predictive Maintenance',
      title: 'Uptime Excellent',
      message: 'Equipment uptime at 97.3% — above target. Maintain current preventive maintenance strategy.',
      impact: 'No additional action required',
      rootCause: 'No equipment degradation trends detected. All monitored equipment vibration, temperature, and current signatures are within ±1 standard deviation of rolling baseline.',
      solution: 'Continue PM schedule as planned. Next scheduled lube oil analysis is due for 6 assets in 12 days — confirm sample collection is on track.',
      benefit: 'Sustained 97.3% uptime supports maximum throughput and reduces capital expenditure through extended equipment life.',
      action: null,
      workflow: null,
      unitId: 'util',
    },
  ],
  energyManagement: [
    {
      id: 1,
      severity: 'warning',
      system: 'Energy Management',
      title: 'Energy Intensity Above Baseline',
      message: 'Energy Intensity Index is 6% above optimal baseline for current crude slate.',
      impact: '4–6% excess energy cost; ~$42K/month avoidable spend',
      rootCause: 'Heat integration audit indicates that train B pre-heat exchangers (HE-204 to HE-208) are running 12–18°C below design duty due to fouling. This forces the fired heater to compensate, increasing fuel gas consumption.',
      solution: '1) Schedule HE-204 and HE-206 for online cleaning during this week\'s partial ISBL shutdown. 2) Increase anti-fouling chemical injection on crude train B (dosing rate: 12 ppm → 18 ppm). 3) Re-optimise heat curve following exchanger cleaning.',
      benefit: 'Restoring heat exchanger performance to 95% design efficiency reduces fired heater duty by ~8%, delivering 4–6% total energy savings. At current natural gas prices this saves approximately $42,000/month.',
      action: 'Optimize Process Parameters',
      workflow: 'optimize-process',
      unitId: 'util',
    },
    {
      id: 2,
      severity: 'info',
      system: 'Energy Management',
      title: 'Boiler Efficiency Good',
      message: 'Boiler efficiency at 91.2% — within target envelope.',
      impact: 'No material optimization impact',
      rootCause: 'All boiler parameters including stack O2, flue gas temperature, and feed water quality are within specification.',
      solution: 'Continue scheduled boiler tube inspection at next quarterly outage. Verify economiser performance data is being logged correctly in PI historian.',
      benefit: 'Maintaining 91%+ boiler efficiency minimises steam cost and CO2 per tonne of steam, supporting plant ESG targets.',
      action: null,
      workflow: null,
      unitId: 'util',
    },
    {
      id: 3,
      severity: 'warning',
      system: 'Energy Management',
      title: 'Peak Power Demand Alert',
      message: 'Power consumption approaching peak tariff band. Load shifting of non-critical compressors is recommended.',
      impact: 'Up to 8% reduction in peak demand charges',
      rootCause: 'Coincident operation of CU compressors C-201 and C-401 along with cooling water pump start-up sequence is causing a 4.2 MW demand spike between 08:00–10:00, aligning with peak tariff window.',
      solution: 'Stagger compressor C-401 start by 25 minutes to 10:25. Pre-schedule cooling water pump CWP-03 start to 07:30 to avoid morning coincidence. Enable demand response automation in PLC sub-panel PP-06.',
      benefit: 'Load flattening removes the demand spike from the peak tariff band, reducing monthly demand charges by 6–8% — an estimated saving of $18,000/month with zero process impact.',
      action: 'Optimize Process Parameters',
      workflow: 'optimize-process',
      unitId: 'power',
    },
  ],
  productionYield: [
    {
      id: 1,
      severity: 'info',
      system: 'Process Optimization',
      title: 'Gasoline Yield Optimal',
      message: 'Gasoline yield at 38.4% — above target for current crude mix.',
      impact: 'Positive revenue impact vs plan; maintain settings',
      rootCause: 'Recent FCC catalyst addition (fresh Cat type R-400) has improved conversion activity, shifting product selectivity toward lighter fractions.',
      solution: 'No corrective action required. Monitor catalyst activity index daily and plan next Cat addition in 14 days to sustain current yield advantage.',
      benefit: 'Each 1% increase in gasoline yield at current throughput generates approximately $190,000/month additional revenue at today\'s product premium.',
      action: null,
      workflow: null,
      unitId: 'fcc',
    },
    {
      id: 2,
      severity: 'warning',
      system: 'Process Optimization',
      title: 'Heavy Residue Increase',
      message: 'Heavy residue yield trending up in VDU. Column operation indicates suboptimal vacuum profile.',
      impact: '1–2% lost distillate yield; ~$96K/month opportunity',
      rootCause: 'VDU overhead vacuum is running at 18 mmHg abs vs design 12 mmHg. Investigation shows vacuum ejector EJ-201 first-stage steam pressure has dropped to 8.2 bar — below minimum 9.5 bar required for design vacuum.',
      solution: '1) Raise steam pressure to EJ-201 by opening HV-2014 from 72% to 88%. 2) Verify ejector inter-condenser cooling water flow (target >420 m³/h). 3) If vacuum does not recover to <14 mmHg in 2 hours, bring standby ejector EJ-202 online.',
      benefit: 'Restoring design vacuum improves VDU cut point separation by ~15°C, recovering 1–2% heavy distillate yield from residue. This is worth approximately $96,000/month at current price differentials.',
      action: 'Optimize Process Parameters',
      workflow: 'optimize-process',
      unitId: 'vdu',
    },
    {
      id: 3,
      severity: 'info',
      system: 'Process Optimization',
      title: 'Jet Fuel On Target',
      message: 'Jet fuel yield stable around design value.',
      impact: 'No corrective action required',
      rootCause: 'Hydrotreater operating within specification; kerosene draw tray temperature and flow stabilised after last week\'s crude switch.',
      solution: 'Continue monitoring freeze-point and smoke-point specs via on-line analyser AE-312. Next analyser calibration check due in 5 days.',
      benefit: 'Stable jet fuel quality reduces off-spec reprocessing costs and maintains customer contract compliance.',
      action: null,
      workflow: null,
      unitId: 'fcc',
    },
  ],
  environmental: [
    {
      id: 1,
      severity: 'critical',
      system: 'Emission Reduction',
      title: 'SOx Near Regulatory Limit',
      message: 'SOx emission rate at Stack S-3 is approaching regulatory compliance limit.',
      impact: 'Immediate risk of non-compliance and potential flaring restrictions',
      rootCause: 'Spent amine regenerator amine loading has increased to 0.48 mol H2S/mol amine (vs target 0.35), reducing H2S absorption efficiency in absorber A-701 to 82% (vs design 96%). This is due to a higher-sulfur crude blend introduced 36 hours ago without amine rate adjustment.',
      solution: '1) Immediately increase amine circulation rate from 42 m³/h to 58 m³/h via P-701A. 2) Reduce lean amine temperature by 4°C to improve absorption thermodynamics. 3) If SOx does not reduce within 90 minutes, initiate crude sulfur content reduction plan per ERP-ENV-04.',
      benefit: 'Restoring amine system performance brings H2S absorption back above 95%, reducing SOx at Stack S-3 by approximately 60–70% and returning well within regulatory limits. This avoids potential shutdown orders and environmental penalty fines exceeding $500,000.',
      action: 'Reduce Emissions',
      workflow: 'reduce-emissions',
      unitId: 'h2',
    },
    {
      id: 2,
      severity: 'warning',
      system: 'Emission Reduction',
      title: 'Flare Gas Volume High',
      message: 'Flare gas volume above baseline for current throughput. Relief valve activity suspected.',
      impact: '2–3% increase in CO2 equivalent emissions',
      rootCause: 'Flare gas recovery compressor FGC-01 has been operating at reduced capacity (68% vs design 95%) after a seal failure was reported 4 days ago. Excess gas is being routed to flare rather than recovered to fuel gas system.',
      solution: '1) Fast-track FGC-01 seal repair — parts are in warehouse. Estimated repair time: 6 hours. 2) Temporarily lower HP sub-system operating pressure by 0.3 bar to reduce relief valve chatter on CDU overhead circuit. 3) Increase flare gas knock-out drum level monitoring frequency.',
      benefit: 'Restoring FGC-01 to design capacity reduces flare gas combustion by ~85%, cutting CO2e emissions by approximately 180 tonnes/month and recovering $22,000/month in fuel gas value.',
      action: 'Reduce Emissions',
      workflow: 'reduce-emissions',
      unitId: 'flare',
    },
    {
      id: 3,
      severity: 'info',
      system: 'Emission Reduction',
      title: 'CO2 Within Budget',
      message: 'CO2 emissions are within monthly ESG budget.',
      impact: 'No immediate emission reduction actions required',
      rootCause: 'No anomalous emission sources detected. All CO2 point sources are within their allocated ESG budgets for this period.',
      solution: 'Proceed with the planned energy efficiency initiatives in Q2 roadmap. Review CO2 budget allocation for next quarter given projected crude throughput increase.',
      benefit: 'Staying within ESG CO2 budgets avoids carbon credit purchases and maintains green financing eligibility, estimated value $120,000/quarter.',
      action: null,
      workflow: null,
      unitId: 'power',
    },
  ],
  safety: [
    {
      id: 1,
      severity: 'critical',
      system: 'Safety',
      title: 'H2S Sensor Alert',
      message: 'H2S sensor at Hydrogen Plant triggered above alarm threshold. Personnel exposure risk identified.',
      impact: 'Immediate safety risk; potential unit trip if unmanaged',
      rootCause: 'H2S sensor GDS-H2-04 at H2 Plant east manifold area has recorded readings of 12–18 ppm over the past 45 minutes. Source is likely a gasket leak on flange F-502 on the reformer effluent line, identified as a Level 2 potential leakage point in the last HAZOP review.',
      solution: '1) Immediately evacuate 50m exclusion zone around H2 Plant east manifold. 2) Dispatch LOTO-qualified technician with BA equipment to inspect flange F-502. 3) Isolate reformer effluent circuit via XV-5014 if leak confirmed. 4) Notify emergency response coordinator per procedure ERP-SAF-02.',
      benefit: 'Rapid isolation and repair prevents escalation from a contained leak to a major H2S release scenario. Prompt action keeps personnel safe and avoids a recordable HSE incident, potential production curtailment and regulatory investigation.',
      action: 'Schedule Maintenance',
      workflow: 'schedule-maintenance',
      unitId: 'h2',
    },
    {
      id: 2,
      severity: 'warning',
      system: 'Safety',
      title: 'PRV Actuation Logged',
      message: 'Pressure relief valve PRV-08 actuated twice this shift, indicating upstream pressure instability.',
      impact: 'Elevated risk of future relief events and flaring',
      rootCause: 'PRV-08 on CDU overhead accumulator V-102 has lifted twice at 4.8 bar set pressure. Root cause is intermittent liquid carry-over from column overhead drum, causing hydrostatic head surges. This is linked to variation in overhead condenser cooling water temperature (+6°C vs design).',
      solution: '1) Verify cooling water supply temperature to E-101 — check CW return temperature and tower fan operation. 2) Increase overhead reflux ratio by 8% to improve condenser duty. 3) Check PRV-08 seat condition after second actuation — record in maintenance log per PSM-PRV-003.',
      benefit: 'Stabilising overhead pressure prevents further PRV actuations, eliminating flaring events and protecting against valve seat damage that could lead to continuous passing. Prevents potential unplanned shutdown worth ~$800K per 8-hour event.',
      action: 'Optimize Process Parameters',
      workflow: 'optimize-process',
      unitId: 'cdu',
    },
    {
      id: 3,
      severity: 'info',
      system: 'Safety',
      title: 'Hazard Risk Index Low',
      message: 'Hazard risk index at 18.4 — within safe operating band.',
      impact: 'No additional mitigation required',
      rootCause: 'Comprehensive safety check completed. No new process deviations, equipment deficiencies, or personnel safety concerns identified in the past 24-hour review period.',
      solution: 'Continue standard safety monitoring protocols. Scheduled safety walk-down for unit H2 is due tomorrow — confirm with operations team.',
      benefit: 'Low hazard risk index confirms all safety barriers are performing as designed, supporting plant operating licence and insurance compliance.',
      action: null,
      workflow: null,
      unitId: 'ctrl',
    },
  ],
  global: [
    {
      id: 1,
      severity: 'critical',
      system: 'Emission Reduction',
      title: 'SOx Emissions Critical',
      message: 'SOx emissions approaching regulatory limit at Stack S-3. Immediate scrubber and fuel sulfur optimization required.',
      impact: 'High regulatory risk; potential curtailment of throughput',
      rootCause: 'Amine system efficiency has degraded to 82% due to high amine loading (0.48 mol H2S/mol) from an increase in crude sulfur content not matched by amine circulation rate. Simultaneously, SRU Claus reactor R-701 is running at reduced conversion (92% vs target 97%) due to catalyst age.',
      solution: '1) Increase amine circulation rate by 38% immediately. 2) Initiate SRU catalyst rejuvenation procedure SRU-OPS-07. 3) Reduce high-sulfur crude blend by 10% pending amine system stabilisation.',
      benefit: 'Combined actions restore SOx to 40% below regulatory limit within 2 hours. Avoiding a compliance breach prevents potential $500K fine and production restriction.',
      action: 'Reduce Emissions',
      workflow: 'reduce-emissions',
      unitId: 'flare',
    },
    {
      id: 2,
      severity: 'warning',
      system: 'Energy Management',
      title: 'Energy Optimization Opportunity',
      message: 'Furnace F-204 operating above optimal bridge-wall temperature for current firing curve.',
      impact: 'Estimated 4% energy loss; ~$42K/month avoidable cost',
      rootCause: 'Combustion air dampers on F-204 are throttled to 61% due to a sticky actuator on damper DA-204B. This is restricting air flow and causing incomplete combustion, raising bridge-wall temperature to 1,185°C vs target 1,080°C.',
      solution: '1) Manually override DA-204B to 78% open via field handwheel. 2) Raise work order for actuator replacement during next planned shutdown. 3) Reduce fuel gas firing rate by 7% once bridge-wall temperature normalises.',
      benefit: 'Normalising combustion air reduces bridge-wall temperature to design, cutting fuel gas consumption by 4%, saving ~$42,000/month and reducing CO2 by ~140 tonnes/month.',
      action: 'Optimize Process Parameters',
      workflow: 'optimize-process',
      unitId: 'cdu',
    },
    {
      id: 3,
      severity: 'warning',
      system: 'Predictive Maintenance',
      title: 'Compressor Bearing Wear',
      message: 'Compressor C-102 vibration trend indicates potential bearing wear. Recommend inspection within 72 hours.',
      impact: 'Mitigates unplanned outage risk; protects 1–2% throughput',
      rootCause: 'Vibration data trending shows C-102 overall vibration has increased from 3.1 to 5.8 mm/s over the past 12 days — consistent with outer race bearing defect at BPFO 284 Hz. Lube oil analysis from 10 days ago showed elevated iron particles (42 ppm vs limit 25 ppm).',
      solution: '1) Switch to standby compressor C-102B within 24 hours. 2) Plan bearing inspection and replacement for C-102 during the 6-hour swap window. 3) Send fresh lube oil sample to confirm bearing wear progression before deciding on full overhaul.',
      benefit: 'Planned bearing replacement cost is ~$12,000 and takes 6 hours. An unmanaged bearing failure could result in shaft damage requiring 5–7 days of downtime and $180,000 in parts and labour, plus throughput losses.',
      action: 'Schedule Maintenance',
      workflow: 'schedule-maintenance',
      unitId: 'fcc',
    },
    {
      id: 4,
      severity: 'info',
      system: 'Process Optimization',
      title: 'Crude Mix Rebalancing',
      message: 'Crude mix can be rebalanced towards lighter grades while staying within constraint envelope.',
      impact: 'Energy usage ~3–4% above optimal baseline; yield uplift opportunity ~2%',
      rootCause: 'Current crude blend (API 31.2) is heavier than the optimum API 33.5 for the current column configuration and catalyst loading. This leaves ~2% additional light product recovery on the table.',
      solution: 'Blend in 12% West African light crude (API 37) to shift mix API to 33.8. Validate against heat exchanger duties and column hydraulics using LP model before implementation.',
      benefit: 'Optimised crude blend improves light product recovery by ~2%, worth approximately $380,000/month while keeping plant within all operating constraints.',
      action: 'Rebalance Crude Mix',
      workflow: 'rebalance-crude',
      unitId: 'cdu',
    },
    {
      id: 5,
      severity: 'info',
      system: 'Process Optimization',
      title: 'VDU Vacuum Adjustment',
      message: 'VDU vacuum profile slightly off target; optimization can reduce heavy residue yield.',
      impact: '1–1.5% improvement in distillate yield',
      rootCause: 'VDU column overhead vacuum deviating by 6 mmHg from target due to minor non-condensables accumulation in the vacuum system. This restricts VGO cut point recovery.',
      solution: 'Vent non-condensables from vacuum system via vent valve VV-201 for 15 minutes. Verify ejector steam supply pressure. Re-tune vacuum controller after venting.',
      benefit: 'Recovering design vacuum improves VGO yield by 1–1.5%, worth approximately $96,000/month at current distillate-residue price spread.',
      action: 'Optimize Process Parameters',
      workflow: 'optimize-process',
      unitId: 'vdu',
    },
  ],
};

const BUILDINGS = [
  // DTA process core
  // positions are simple 3‑D coordinates used by the Three.js scene.  they
  // should roughly match the layout of your reference model; the frontend
  // applies a fixed scale factor (see RefineryScene.tsx) so you can multiply
  // these values to enlarge/shrink the facility.  ignore the lon/lat fields
  // unless you want to position buildings using geospatial offsets.
  { id: 'cdu', name: 'Distillation Unit 1', modelUrl: null, position: [10, 0, 10], elevation: 6, zone: 'Process Area', unitType: 'distillation', sensorUnit: 'Distillation 1', subsystemPath: '/systems/crude-processing', throughput: 102500, temp: 342, pressure: 1.8 },
  { id: 'vdu', name: 'Distillation Unit 2', modelUrl: null, position: [15, 0, 10], elevation: 6, zone: 'Process Area', unitType: 'distillation', sensorUnit: 'Distillation 2', subsystemPath: '/systems/crude-processing', throughput: 48200, temp: 384, pressure: 0.05 },
  { id: 'fcc', name: 'Conversion Unit A', modelUrl: null, position: [20, 0, 10], elevation: 7, zone: 'Process Area', unitType: 'conversion', sensorUnit: 'Conversion A', subsystemPath: '/systems/production-yield', throughput: 32400, temp: 510, pressure: 2.1 },
  { id: 'hdt', name: 'Conversion Unit B', modelUrl: null, position: [10, 0, 15], elevation: 7, zone: 'Process Area', unitType: 'conversion', sensorUnit: 'Conversion B', subsystemPath: '/systems/crude-processing', throughput: 28600, temp: 360, pressure: 6.5 },
  { id: 'ref', name: 'Conversion Unit C', modelUrl: null, position: [15, 0, 15], elevation: 7, zone: 'Process Area', unitType: 'conversion', sensorUnit: 'Conversion C', subsystemPath: '/systems/production-yield', throughput: 18400, temp: 500, pressure: 3.2 },

  // Secondary process/support area - surrounding core
  { id: 'h2', name: 'Hydrogen Plant', modelUrl: null, position: [20, 0, 15], elevation: 8, zone: 'Support Area', unitType: 'hydrogen', sensorUnit: 'Hydrogen Plant', subsystemPath: '/systems/safety', throughput: 12800, temp: 820, pressure: 2.5 },
  { id: 'dcoker', name: 'Coker Unit', modelUrl: null, position: [10, 0, 20], elevation: 8, zone: 'Support Area', unitType: 'conversion', sensorUnit: 'Coker', subsystemPath: '/systems/production-yield', throughput: 16400, temp: 486, pressure: 2.8 },
  { id: 'sru', name: 'Utilities Unit', modelUrl: null, position: [15, 0, 20], elevation: 8, zone: 'Support Area', unitType: 'utilities', sensorUnit: 'Utilities', subsystemPath: '/systems/environmental', throughput: 7200, temp: 288, pressure: 1.6 },

  // Storage, utilities and export interface - perimeter
  { id: 'storage', name: 'Tank Farm', modelUrl: null, position: [3, 0, 8], elevation: 5, zone: 'Perimeter', unitType: 'tanks', sensorUnit: 'Tank Farm', subsystemPath: '/systems/production-yield', capacity: 2400000, temp: 42, pressure: 0.5 },
  { id: 'util', name: 'Cooling Plant', modelUrl: null, position: [3, 0, 15], elevation: 6, zone: 'Perimeter', unitType: 'utilities', sensorUnit: 'Cooling Plant', subsystemPath: '/systems/energy-management', power: 48.6, temp: 185, pressure: 8.5 },
  { id: 'power', name: 'Power Plant', modelUrl: null, position: [3, 0, 22], elevation: 6, zone: 'Perimeter', unitType: 'utilities', sensorUnit: 'Power Plant', subsystemPath: '/systems/energy-management', power: 48.6, temp: 290, pressure: 12.5 },
  { id: 'flare', name: 'Flare Stack', modelUrl: null, position: [27, 0, 22], elevation: 9, zone: 'Perimeter', unitType: 'safety', sensorUnit: 'Flare & Emissions', subsystemPath: '/systems/environmental', temp: 720, pressure: 1.2 },
  { id: 'marine', name: 'Export Terminal', modelUrl: null, position: [27, 0, 8], elevation: 4, zone: 'Perimeter', unitType: 'marine', sensorUnit: 'Export Terminal', subsystemPath: '/systems/crude-processing', throughput: 90500, temp: 35, pressure: 1.1 },

  // Control and administration - corner
  { id: 'ctrl', name: 'Control Center', modelUrl: null, position: [27, 0, 15], elevation: 6, zone: 'Perimeter', unitType: 'control', sensorUnit: 'Control Center', subsystemPath: '/systems/safety', uptime: 99.98, temp: 21, pressure: 1.0 },
];

const MACHINES = {
  cdu: [
    { id: 'p101', name: 'Crude Charge Pump P-101', type: 'Pump', temp: noise(68, 0.03), pressure: noise(4.2, 0.03), energy: noise(820, 0.04), utilization: noise(87, 0.02), failureRisk: noise(12, 0.08), vibration: noise(4.5, 0.1) },
    { id: 'he201', name: 'Heat Exchanger HE-201', type: 'Heat Exchanger', temp: noise(280, 0.02), pressure: noise(3.1, 0.03), energy: noise(0, 0), utilization: noise(92, 0.02), failureRisk: noise(8, 0.1), vibration: noise(1.2, 0.1) },
    { id: 'f101', name: 'Atmospheric Furnace F-101', type: 'Furnace', temp: noise(342, 0.02), pressure: noise(2.1, 0.03), energy: noise(18400, 0.04), utilization: noise(94, 0.02), failureRisk: noise(15, 0.08), vibration: noise(2.5, 0.1) },
    { id: 'col1', name: 'Atmospheric Column C-101', type: 'Distillation Column', temp: noise(210, 0.02), pressure: noise(1.8, 0.02), energy: noise(4200, 0.03), utilization: noise(91, 0.02), failureRisk: noise(7, 0.1), vibration: noise(1.0, 0.1) },
  ],
  vdu: [
    { id: 'p201', name: 'Vacuum Bottoms Pump P-201', type: 'Pump', temp: noise(210, 0.03), pressure: noise(3.5, 0.03), energy: noise(640, 0.04), utilization: noise(84, 0.02), failureRisk: noise(14, 0.08), vibration: noise(4.1, 0.1) },
    { id: 'he204', name: 'Vacuum Heater HE-204', type: 'Heat Exchanger', temp: noise(380, 0.02), pressure: noise(0.08, 0.03), energy: noise(9600, 0.04), utilization: noise(90, 0.02), failureRisk: noise(11, 0.08), vibration: noise(1.4, 0.1) },
    { id: 'col2', name: 'Vacuum Column C-201', type: 'Distillation Column', temp: noise(280, 0.02), pressure: noise(0.05, 0.02), energy: noise(6200, 0.03), utilization: noise(89, 0.02), failureRisk: noise(9, 0.08), vibration: noise(1.0, 0.1) },
  ],
  fcc: [
    { id: 'r201', name: 'FCC Reactor R-201', type: 'Reactor', temp: noise(510, 0.02), pressure: noise(2.1, 0.02), energy: noise(9600, 0.04), utilization: noise(88, 0.02), failureRisk: noise(22, 0.08), vibration: noise(3.2, 0.1) },
    { id: 'c301', name: 'Gas Compressor C-301', type: 'Compressor', temp: noise(85, 0.03), pressure: noise(8.4, 0.03), energy: noise(3200, 0.04), utilization: noise(82, 0.03), failureRisk: noise(18, 0.08), vibration: noise(6.5, 0.1) },
    { id: 'r202', name: 'Regenerator R-202', type: 'Reactor', temp: noise(640, 0.02), pressure: noise(2.4, 0.02), energy: noise(11200, 0.04), utilization: noise(86, 0.02), failureRisk: noise(20, 0.08), vibration: noise(3.8, 0.1) },
  ],
  hdt: [
    { id: 'r301', name: 'Hydrotreater Reactor R-301', type: 'Reactor', temp: noise(360, 0.02), pressure: noise(6.5, 0.02), energy: noise(7200, 0.04), utilization: noise(88, 0.02), failureRisk: noise(16, 0.08), vibration: noise(3.0, 0.1) },
    { id: 'e301', name: 'Charge Heater E-301', type: 'Furnace', temp: noise(420, 0.02), pressure: noise(6.0, 0.03), energy: noise(9800, 0.04), utilization: noise(90, 0.02), failureRisk: noise(14, 0.08), vibration: noise(2.4, 0.1) },
  ],
  ref: [
    { id: 'r401', name: 'Reformer Reactor R-401', type: 'Reactor', temp: noise(500, 0.02), pressure: noise(3.2, 0.02), energy: noise(8400, 0.04), utilization: noise(89, 0.02), failureRisk: noise(17, 0.08), vibration: noise(3.1, 0.1) },
    { id: 'c401', name: 'Recycle Compressor C-401', type: 'Compressor', temp: noise(95, 0.03), pressure: noise(9.2, 0.03), energy: noise(3600, 0.04), utilization: noise(81, 0.03), failureRisk: noise(19, 0.08), vibration: noise(6.8, 0.1) },
  ],
  h2: [
    { id: 'r501', name: 'Steam Reformer R-501', type: 'Reactor', temp: noise(820, 0.02), pressure: noise(2.5, 0.02), energy: noise(12800, 0.04), utilization: noise(90, 0.02), failureRisk: noise(35, 0.08), vibration: noise(3.6, 0.1) },
    { id: 'p501', name: 'Transfer Pump P-501', type: 'Pump', temp: noise(72, 0.03), pressure: noise(3.8, 0.03), energy: noise(640, 0.04), utilization: noise(78, 0.03), failureRisk: noise(28, 0.08), vibration: noise(4.9, 0.1) },
  ],
  dcoker: [
    { id: 'c601', name: 'Coker Drum C-601', type: 'Reactor', temp: noise(486, 0.02), pressure: noise(2.8, 0.03), energy: noise(7800, 0.04), utilization: noise(86, 0.03), failureRisk: noise(21, 0.08), vibration: noise(3.1, 0.1) },
    { id: 'f601', name: 'Coker Furnace F-601', type: 'Furnace', temp: noise(540, 0.02), pressure: noise(2.4, 0.03), energy: noise(11500, 0.04), utilization: noise(88, 0.03), failureRisk: noise(18, 0.08), vibration: noise(2.7, 0.1) },
  ],
  sru: [
    { id: 'r701', name: 'Sulfur Claus Reactor R-701', type: 'Reactor', temp: noise(288, 0.02), pressure: noise(1.6, 0.03), energy: noise(4200, 0.04), utilization: noise(84, 0.03), failureRisk: noise(15, 0.08), vibration: noise(1.9, 0.1) },
    { id: 'a701', name: 'Tail Gas Absorber A-701', type: 'Absorber', temp: noise(172, 0.02), pressure: noise(1.2, 0.03), energy: noise(2400, 0.04), utilization: noise(82, 0.03), failureRisk: noise(12, 0.08), vibration: noise(1.2, 0.1) },
  ],
  marine: [
    { id: 'mp801', name: 'Marine Loading Pump MP-801', type: 'Pump', temp: noise(41, 0.03), pressure: noise(7.1, 0.03), energy: noise(2100, 0.04), utilization: noise(76, 0.03), failureRisk: noise(11, 0.08), vibration: noise(3.4, 0.1) },
    { id: 'mv801', name: 'Jetty Transfer Valve MV-801', type: 'Valve', temp: noise(38, 0.03), pressure: noise(6.4, 0.03), energy: noise(260, 0.04), utilization: noise(71, 0.03), failureRisk: noise(9, 0.08), vibration: noise(0.8, 0.1) },
  ],  storage: [
    { id: 't701', name: 'Crude Tank T-701', type: 'Tank', temp: noise(42, 0.02), pressure: noise(0.5, 0.02), energy: noise(0, 0), utilization: noise(68, 0.03), failureRisk: noise(6, 0.08), vibration: noise(0.6, 0.1) },
    { id: 't702', name: 'Product Tank T-702', type: 'Tank', temp: noise(36, 0.02), pressure: noise(0.3, 0.02), energy: noise(0, 0), utilization: noise(74, 0.03), failureRisk: noise(7, 0.08), vibration: noise(0.6, 0.1) },
  ],
  util: [
    { id: 'ct801', name: 'Cooling Tower CT-801', type: 'Cooling Tower', temp: noise(28, 0.02), pressure: noise(1.2, 0.02), energy: noise(2200, 0.04), utilization: noise(83, 0.03), failureRisk: noise(10, 0.08), vibration: noise(2.0, 0.1) },
    { id: 'b801', name: 'Boiler B-801', type: 'Boiler', temp: noise(420, 0.02), pressure: noise(45, 0.03), energy: noise(9600, 0.04), utilization: noise(85, 0.02), failureRisk: noise(13, 0.08), vibration: noise(2.8, 0.1) },
  ],
  power: [
    { id: 'g901', name: 'Gas Turbine GT-901', type: 'Turbine', temp: noise(620, 0.02), pressure: noise(18, 0.03), energy: noise(28000, 0.04), utilization: noise(88, 0.02), failureRisk: noise(19, 0.08), vibration: noise(5.2, 0.1) },
    { id: 'st901', name: 'Steam Turbine ST-901', type: 'Turbine', temp: noise(540, 0.02), pressure: noise(40, 0.03), energy: noise(24000, 0.04), utilization: noise(86, 0.02), failureRisk: noise(17, 0.08), vibration: noise(4.6, 0.1) },
  ],
  flare: [
    { id: 'fs001', name: 'Flare Stack FS-001', type: 'Flare', temp: noise(720, 0.03), pressure: noise(1.2, 0.03), energy: noise(5600, 0.04), utilization: noise(12, 0.02), failureRisk: noise(8, 0.08), vibration: noise(1.8, 0.1) },
  ],
  ctrl: [
    { id: 'dcs01', name: 'DCS Server Cluster', type: 'Control System', temp: noise(24, 0.02), pressure: noise(1.0, 0.01), energy: noise(120, 0.04), utilization: noise(55, 0.03), failureRisk: noise(4, 0.08), vibration: noise(0.4, 0.1) },
  ],
};

module.exports = {
  getKPIs,
  getAlerts,
  ADVISORY_TEMPLATES,
  BUILDINGS,
  MACHINES,
  getLiveSensors,
  getUnitSensorSummary,
  getSensorHistory,
  getMachineStatusSummary,
};




