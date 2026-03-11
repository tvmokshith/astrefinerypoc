// Centralized type definitions
export type UserRole = 'admin' | 'engineer' | 'operator';

export interface User {
    email: string;
    name: string;
    role: UserRole;
    avatar: string;
}

export type KPIStatus = 'normal' | 'warning' | 'critical';

export interface KPI {
    value: number;
    unit: string;
    status: KPIStatus;
    history?: { timestamp: string; value: number }[];
    label?: string;
}

export interface KPIDefinition {
    key: string;
    label: string;
    description: string;
    formula?: string;
    operationalExplanation?: string;
    unit: string;
    greenMin?: number;
    greenMax?: number;
    amberMin?: number;
    amberMax?: number;
    redMin?: number;
    redMax?: number;
    higherIsBetter: boolean;
}

export interface Alert {
    id: string;
    type: 'Equipment' | 'Emission' | 'Energy' | 'Safety';
    message: string;
    severity: 'warning' | 'critical' | 'info';
    unit: string;
    timestamp: string;
    detailedDescription?: string;
    suggestedAction?: string;
    equipment?: string;
    subsystem?: string;
    linkedKpi?: string;
}

export type AlertSeverity = "Critical" | "Warning" | "Normal";
export type WorkOrderPriority = "Critical" | "High" | "Medium" | "Low";
export type WorkOrderStatus = "Pending Approval" | "Approved" | "In Progress" | "Completed";
export type WorkOrderApprovalStatus = "Pending" | "Approved" | "Rejected";

export interface OperationalAlert {
    AlertID: string;
    Subsystem: string;
    Equipment: string;
    Severity: AlertSeverity;
    Timestamp: string;
    DetailedDescription: string;
    SuggestedAction: string;
    LinkedKPI: string | null;
}

export interface EventStreamItem {
    EventID: string;
    Severity: AlertSeverity;
    Priority: WorkOrderPriority;
    Subsystem: string;
    Equipment: string;
    Description: string;
    SuggestedAction?: string;
    Timestamp: string;
    LinkedKPI: string | null;
    LinkedAlertID: string | null;
}

export interface Advisory {
    id: number;
    severity: 'critical' | 'warning' | 'info' | 'normal';
    system?: string;
    title: string;
    message: string;
    impact?: string;
    rootCause?: string;
    solution?: string;
    benefit?: string;
    action: string | null;
    workflow: string | null;
    unitId?: string;
}

export interface SensorLive {
    sensor_id: string;
    unit: string;
    machine_id: string;
    machine_type: string;
    sensor_type: string;
    timestamp: string;
    value: number;
    unitSymbol: string;
    status: KPIStatus;
}

export interface UnitSensorSummary {
    unit: string;
    totalSensors: number;
    criticalSensors: number;
    warningSensors: number;
    avgTemperature: number | null;
    avgPressure: number | null;
    avgFlow: number | null;
}

export interface SensorHistoryPoint {
    sensor_id: string;
    timestamp: string;
    value: number;
    unit: string;
    status: KPIStatus;
}

export interface MachineStatusSummary {
    machine_id: string;
    unit: string;
    machine_type: string;
    healthScore: number;
    failureProbability: number;
    criticalSensors: number;
    warningSensors: number;
    totalSensors: number;
}

export interface RefinerySummary {
    crudeThroughput: number;
    equipmentUptime: number;
    energyIntensityIndex: number;
    emissionCO2: number;
    safetyIndex: number;
    machinesAtRisk: number;
    criticalSensors: number;
    warningSensors: number;
}

export interface Building {
    id: string;
    name: string;
    position: [number, number, number];
    color: string;
    status: KPIStatus;
    zone?: 'DTA' | 'SEZ' | 'Utilities' | 'Terminal';
    unitType?: 'distillation' | 'conversion' | 'tanks' | 'utilities' | 'safety' | 'marine' | 'control' | 'hydrogen';
    lat?: number;
    lon?: number;
    elevation?: number;
    geospatialCluster?: string;
    sensorUnit?: string;
    subsystemPath?: string;
    machines?: Machine[];
    throughput?: number;
    temp?: number;
    pressure?: number;
    capacity?: number;
    power?: number;
    uptime?: number;

    /**
     * URL to a GLTF/GLB model used for rendering. Falls back to simple primitives if absent.
     */
    modelUrl?: string;
    /**
     * Optional scale vector for the imported model (default 1 1 1).
     */
    modelScale?: [number, number, number];
    /**
     * Optional rotation (Euler radians) to apply to imported model.
     */
    modelRotation?: [number, number, number];
}

export interface Machine {
    id: string;
    name: string;
    type: string;
    temp: number;
    pressure: number;
    energy: number;
    utilization: number;
    failureRisk: number;
    vibration?: number;
}

export interface WorkflowResult {
    title: string;
    steps: string[];
    outcomes: { metric: string; value: string; saving: string }[];
    confidence: number;
}

export type Theme = 'light' | 'dark';

export interface WorkOrder {
    WorkOrderID: string;
    Subsystem: string;
    Equipment: string;
    Description: string;
    Priority: WorkOrderPriority;
    Status: WorkOrderStatus;
    AssignedTeam: string;
    CreatedBy: string;
    CreatedDate: string;
    ApprovalStatus: WorkOrderApprovalStatus;
    Source?: string;
    LinkedKPI?: string | null;
    LinkedAlertID?: string | null;
}
