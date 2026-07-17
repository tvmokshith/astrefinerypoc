const express = require('express');
const cors = require('cors');
const {
    getAlerts,
    ADVISORY_TEMPLATES,
    BUILDINGS,
    MACHINES,
    getLiveSensors,
    getUnitSensorSummary,
    getSensorHistory,
    getMachineStatusSummary,
} = require('./dataGenerator');
const { getCachedKPIs } = require("./kpiCache");
const workOrders = require("./workOrdersStore");
const eventsStore = require("./eventsStore");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4307;
// Bound to loopback by default: nginx is the only thing that should reach it.
const HOST = process.env.HOST || '127.0.0.1';

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// KPIs — returns all or by subsystem
app.get('/api/kpis', (_, res) => {
    const kpis = getCachedKPIs();

    // Automatic work order creation when KPI enters critical.
    // We treat each KPI key-path as a unique LinkedKPI identifier.
    const created = [];
    Object.entries(kpis).forEach(([subsystemKey, group]) => {
        if (!group || typeof group !== "object" || subsystemKey === "_meta") return;
        Object.entries(group).forEach(([kpiKey, kpi]) => {
            if (!kpi || typeof kpi !== "object") return;
            if (kpi.status !== "critical") return;
            const linked = `${subsystemKey}.${kpiKey}`;
            const existing = workOrders.findOpenByLinkedKPI(linked);
            if (existing) return;

            const wo = workOrders.create({
                Subsystem: subsystemKey,
                Equipment: kpi.label || kpiKey,
                Description: `Auto-created: KPI "${kpiKey}" entered CRITICAL threshold (${kpi.value} ${kpi.unit}).`,
                Priority: "Critical",
                Status: "Pending Approval",
                AssignedTeam: "Maintenance",
                CreatedBy: "system",
                CreatedDate: new Date().toISOString(),
                ApprovalStatus: "Pending",
                Source: "kpi-monitor",
                LinkedKPI: linked,
            });
            created.push(wo);
        });
    });

    res.json(kpis);
});
app.get('/api/kpis/:subsystem', (req, res) => {
    const kpis = getCachedKPIs();
    const sub = kpis[req.params.subsystem];
    if (!sub) return res.status(404).json({ error: 'Subsystem not found' });
    res.json(sub);
});

// Alerts
app.get('/api/alerts', (_, res) => {
    const alerts = getAlerts();
    // Feed a stable operational event stream store (priority-sorted on read).
    // Map legacy alerts to richer event objects while keeping /alerts response unchanged for now.
    const events = alerts.map((a) => ({
        LinkedAlertID: a.id,
        Severity: a.severity === "critical" ? "Critical" : a.severity === "warning" ? "Warning" : "Normal",
        Priority: a.severity === "critical" ? "Critical" : a.severity === "warning" ? "High" : "Low",
        Subsystem: a.subsystem || a.type,
        Equipment: a.equipment || a.unit,
        Description: a.detailedDescription || a.message,
        SuggestedAction: a.suggestedAction || null,
        Timestamp: a.timestamp,
        LinkedKPI: a.linkedKpi || null,
    }));
    eventsStore.upsertMany(events);
    res.json(alerts);
});

// Stable event stream (operational)
app.get("/api/events", (_, res) => {
    // Ensure non-empty stream on first load.
    if (eventsStore.list().length === 0) {
        const alerts = getAlerts();
        const seeded = alerts.map((a) => ({
            LinkedAlertID: a.id,
            Severity: a.severity === "critical" ? "Critical" : a.severity === "warning" ? "Warning" : "Normal",
            Priority: a.severity === "critical" ? "Critical" : a.severity === "warning" ? "High" : "Low",
            Subsystem: a.subsystem || a.type,
            Equipment: a.equipment || a.unit,
            Description: a.detailedDescription || a.message,
            SuggestedAction: a.suggestedAction || null,
            Timestamp: a.timestamp,
            LinkedKPI: a.linkedKpi || null,
        }));
        eventsStore.upsertMany(seeded);
    }
    res.json(eventsStore.list());
});

// Work orders (backend-backed)
app.get("/api/work-orders", (req, res) => {
    const { approvalStatus, status } = req.query;
    res.json(workOrders.list({
        approvalStatus: approvalStatus ? String(approvalStatus) : undefined,
        status: status ? String(status) : undefined,
    }));
});

app.post("/api/work-orders", (req, res) => {
    const body = req.body || {};
    const wo = workOrders.create(body);
    res.status(201).json(wo);
});

app.patch("/api/work-orders/:id", (req, res) => {
    const updated = workOrders.patch(req.params.id, req.body || {});
    if (!updated) return res.status(404).json({ error: "Work order not found" });
    res.json(updated);
});

app.post("/api/work-orders/:id/approve", (req, res) => {
    const updated = workOrders.patch(req.params.id, {
        ApprovalStatus: "Approved",
        Status: "Approved",
    });
    if (!updated) return res.status(404).json({ error: "Work order not found" });
    res.json(updated);
});

app.post("/api/work-orders/:id/reject", (req, res) => {
    const updated = workOrders.patch(req.params.id, {
        ApprovalStatus: "Rejected",
        Status: "Completed",
    });
    if (!updated) return res.status(404).json({ error: "Work order not found" });
    res.json(updated);
});

// AI Advisory
app.get('/api/advisory', (_, res) => res.json(ADVISORY_TEMPLATES.global));
app.get('/api/advisory/:subsystem', (req, res) => {
    const adv = ADVISORY_TEMPLATES[req.params.subsystem];
    if (!adv) return res.json(ADVISORY_TEMPLATES.global);
    res.json(adv);
});

// Digital Twin
app.get('/api/digital-twin/buildings', (_, res) => res.json(BUILDINGS));
app.get('/api/digital-twin/machines', (_, res) => res.json(MACHINES));
app.get('/api/digital-twin/buildings/:id', (req, res) => {
    const base = BUILDINGS.find(b => b.id === req.params.id);
    if (!base) return res.status(404).json({ error: 'Building not found' });

    // Lightly randomize building telemetry each request to keep values feeling alive
    const building = {
        ...base,
        temp: base.temp != null ? base.temp + base.temp * (Math.random() - 0.5) * 0.04 : undefined,
        pressure: base.pressure != null ? base.pressure + base.pressure * (Math.random() - 0.5) * 0.06 : undefined,
        throughput: base.throughput != null ? base.throughput + base.throughput * (Math.random() - 0.5) * 0.03 : undefined,
        power: base.power != null ? base.power + base.power * (Math.random() - 0.5) * 0.05 : undefined,
    };

    // Derive machine telemetry fresh on each call so different units feel distinct
    const templates = MACHINES[req.params.id] || [];
    const machines = templates.map(m => ({
        ...m,
        temp: m.temp + m.temp * (Math.random() - 0.5) * 0.05,
        pressure: m.pressure + m.pressure * (Math.random() - 0.5) * 0.08,
        energy: m.energy + m.energy * (Math.random() - 0.5) * 0.06,
        utilization: Math.max(0, Math.min(100, m.utilization + (Math.random() - 0.5) * 4)),
        failureRisk: Math.max(0, Math.min(100, m.failureRisk + (Math.random() - 0.5) * 6)),
        vibration: m.vibration != null ? Math.max(0, m.vibration + (Math.random() - 0.5) * 0.6) : undefined,
    }));

    res.json({ ...building, machines });
});

// Synthetic sensor APIs (5000+ sensor streams)
app.get('/api/sensors/live', (req, res) => {
    const { unit, machineId } = req.query;
    const data = getLiveSensors({
        unit,
        machineId,
    });
    res.json(data);
});
app.get('/api/sensors/live/units', (_, res) => {
    res.json(getUnitSensorSummary());
});

app.get('/api/sensors/history', (req, res) => {
    const { sensorId, days, intervalSeconds } = req.query;
    if (!sensorId) return res.status(400).json({ error: 'sensorId is required' });

    const d = days ? parseInt(days, 10) : 30;
    const interval = intervalSeconds ? parseInt(intervalSeconds, 10) : 60;

    const history = getSensorHistory(sensorId, {
        days: isNaN(d) ? 30 : d,
        intervalSeconds: isNaN(interval) ? 60 : interval,
    });
    res.json(history);
});

// Machine status overview for predictive maintenance views
app.get('/api/machines/status', (_, res) => {
    const machines = getMachineStatusSummary();
    res.json(machines);
});

// High-level refinery summary for landing views
app.get('/api/refinery/summary', (_, res) => {
    const kpis = getCachedKPIs();
    const machines = getMachineStatusSummary();
    const live = getLiveSensors();

    const criticalSensors = live.filter(s => s.status === 'critical').length;
    const warningSensors = live.filter(s => s.status === 'warning').length;

    const summary = {
        crudeThroughput: kpis.crudeProcessing.crudeThroughput.value,
        equipmentUptime: kpis.equipmentHealth.equipmentUptime.value,
        energyIntensityIndex: kpis.energyManagement.energyIntensityIndex.value,
        emissionCO2: kpis.environmental.co2Emissions.value,
        safetyIndex: kpis.safety.pressureSafetyIndex.value,
        machinesAtRisk: machines.filter(m => m.failureProbability > 40).length,
        criticalSensors,
        warningSensors,
    };

    res.json(summary);
});

// Enterprise Services KPIs (simulated)
const enterpriseKPIs = {
    hr: {
        headcount: { value: 2847, unit: 'employees', status: 'normal' },
        turnoverRate: { value: 4.2, unit: '%', status: 'normal' },
        trainingHours: { value: 38.4, unit: 'hrs/employee', status: 'normal' },
        safetyTrainingCompliance: { value: 96.8, unit: '%', status: 'normal' },
        openPositions: { value: 23, unit: 'roles', status: 'warning' },
    },
    finance: {
        operatingCost: { value: 2.84, unit: '$M/day', status: 'normal' },
        revenuePerBarrel: { value: 84.2, unit: '$/bbl', status: 'normal' },
        ebitdaMargin: { value: 18.4, unit: '%', status: 'normal' },
        capexUtilization: { value: 72.1, unit: '%', status: 'warning' },
        cashFlow: { value: 12.4, unit: '$M/month', status: 'normal' },
    },
    procurement: {
        supplierOnTimeDelivery: { value: 94.2, unit: '%', status: 'normal' },
        inventoryTurnover: { value: 8.4, unit: 'x/year', status: 'normal' },
        procurementCycleTime: { value: 12.3, unit: 'days', status: 'warning' },
        contractCompliance: { value: 98.1, unit: '%', status: 'normal' },
        spendUnderManagement: { value: 84.6, unit: '%', status: 'normal' },
    },
    it: {
        systemAvailability: { value: 99.94, unit: '%', status: 'normal' },
        cybersecurityIncidents: { value: 2, unit: 'events/month', status: 'warning' },
        patchCompliance: { value: 97.2, unit: '%', status: 'normal' },
        itTicketResolutionTime: { value: 4.2, unit: 'hrs', status: 'normal' },
        backupSuccessRate: { value: 99.8, unit: '%', status: 'normal' },
    },
    legal: {
        complianceScore: { value: 94.8, unit: '%', status: 'normal' },
        openLegalCases: { value: 7, unit: 'cases', status: 'warning' },
        regulatoryFilingsOnTime: { value: 100, unit: '%', status: 'normal' },
        insuranceCoverage: { value: 98.4, unit: '%', status: 'normal' },
        riskExposure: { value: 18.4, unit: '$M', status: 'warning' },
    },
    esg: {
        carbonIntensity: { value: 18.4, unit: 'kgCO2/bbl', status: 'normal' },
        renewableEnergyShare: { value: 8.2, unit: '%', status: 'warning' },
        waterRecyclingRate: { value: 78.4, unit: '%', status: 'normal' },
        esgScore: { value: 72, unit: '/100', status: 'normal' },
        communityInvestment: { value: 2.4, unit: '$M/year', status: 'normal' },
    },
    facilities: {
        buildingEnergyIndex: { value: 142, unit: 'kWh/m²/yr', status: 'warning' },
        hvacEfficiency: { value: 88.4, unit: '%', status: 'normal' },
        facilityUptime: { value: 99.2, unit: '%', status: 'normal' },
        workspaceUtilization: { value: 74.8, unit: '%', status: 'normal' },
        maintenanceCost: { value: 0.84, unit: '$M/month', status: 'normal' },
    },
    ehs: {
        totalRecordableIncidentRate: { value: 0.42, unit: 'per 200K hrs', status: 'normal' },
        lostTimeInjuryRate: { value: 0.12, unit: 'per 200K hrs', status: 'normal' },
        nearMissReports: { value: 18, unit: 'this month', status: 'normal' },
        safetyObservations: { value: 342, unit: 'this month', status: 'normal' },
        permitToWorkCompliance: { value: 99.1, unit: '%', status: 'normal' },
    },
};

// Consolidated enterprise modules (per requirements)
enterpriseKPIs["operations-safety-management"] = {
    ...enterpriseKPIs.facilities,
    ...enterpriseKPIs.ehs,
};
enterpriseKPIs["sustainability-environmental-impact"] = {
    ...enterpriseKPIs.esg,
};
enterpriseKPIs["governance-risk-management"] = {
    ...enterpriseKPIs.legal,
    ...enterpriseKPIs.it,
};

app.get('/api/enterprise/:module', (req, res) => {
    const mod = enterpriseKPIs[req.params.module];
    if (!mod) return res.status(404).json({ error: 'Module not found' });
    res.json(mod);
});

// Workflow simulation
app.post('/api/workflow/simulate', (req, res) => {
    const { workflowType } = req.body;
    const results = {
        'optimize-process': {
            title: 'Process Optimization Simulation',
            steps: ['Analyzing current process parameters', 'Running optimization model', 'Validating constraints', 'Generating recommendations'],
            outcomes: [
                { metric: 'Energy Cost Reduction', value: '4.2%', saving: '$42,800/month' },
                { metric: 'Throughput Improvement', value: '+1.8%', saving: '1,845 bbl/day' },
                { metric: 'Emission Reduction', value: '-3.1%', saving: '57 t CO2/month' },
            ],
            confidence: 87,
        },
        'schedule-maintenance': {
            title: 'Predictive Maintenance Scheduling',
            steps: ['Reviewing vibration history', 'Assessing failure probability', 'Checking maintenance crew availability', 'Generating work order'],
            outcomes: [
                { metric: 'Failure Risk Reduction', value: '-68%', saving: 'Prevented downtime' },
                { metric: 'Maintenance Cost', value: '-22%', saving: '$18,400/event' },
                { metric: 'Uptime Improvement', value: '+0.8%', saving: '192 hrs/year' },
            ],
            confidence: 94,
        },
        'reduce-emissions': {
            title: 'Emission Reduction Workflow',
            steps: ['Identifying emission sources', 'Modeling scrubber upgrades', 'Evaluating fuel switching options', 'Calculating ROI'],
            outcomes: [
                { metric: 'SOx Reduction', value: '-42%', saving: 'Regulatory compliance secured' },
                { metric: 'CO2 Reduction', value: '-8.4%', saving: '155 t CO2/month' },
                { metric: 'Carbon Credit Value', value: '+$48K', saving: '/month' },
            ],
            confidence: 82,
        },
        'rebalance-crude': {
            title: 'Crude Mix Optimization',
            steps: ['Analyzing crude assay data', 'Running linear program optimizer', 'Evaluating supply chain constraints', 'Generating procurement advisory'],
            outcomes: [
                { metric: 'Distillate Yield', value: '+2.1%', saving: '+$284K/month' },
                { metric: 'Residue Reduction', value: '-1.4%', saving: '+$96K/month' },
                { metric: 'Feed Cost Reduction', value: '-1.8%', saving: '$52K/month' },
            ],
            confidence: 79,
        },
    };
    const result = results[workflowType] || results['optimize-process'];
    // Simulate delay
    setTimeout(() => res.json(result), 800);
});

app.listen(PORT, HOST, () => {
    console.log(`Astrikos Refinery API listening on ${HOST}:${PORT}`);
});



