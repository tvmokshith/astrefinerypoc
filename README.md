# Astrikos Refinery POC

Astrikos is a refinery operations prototype that combines simulated plant telemetry, AI advisory workflows, a 3D digital twin, work-order management, enterprise KPI views, and interactive analytics.

If you only need the essentials, start here:

- `README.md`: product overview, features, KPIs, architecture, and setup
- `WALKTHROUGH.md`: step-by-step user flow through the application
- `frontend/README.md`: frontend-specific run notes

## At A Glance

### What this app does

Astrikos gives operators, engineers, and stakeholders one place to:

- monitor refinery KPIs
- inspect operational charts
- review alerts and advisories
- launch workflow simulations
- create and track work orders
- inspect refinery assets in a 3D twin
- review enterprise support KPIs

### Main capabilities

- Live refinery dashboard
- Detailed subsystem pages
- Explainable KPI and chart modals
- AI advisory side panel
- Notifications panel with alert-to-work-order conversion
- Work-order lifecycle management
- Workflow simulator
- 3D digital twin
- Enterprise KPI modules
- Report export stubs
- Demo authentication with role-based users

### Tech stack

- Frontend: Next.js 16, React 19, TypeScript, Zustand, Recharts, Tailwind CSS
- Backend: Node.js, Express 5
- Data model: simulated in-memory refinery and enterprise data

## Contents

1. Product Structure
2. Main Screens
3. Refinery KPIs
4. Enterprise KPIs
5. Data And Workflow Model
6. API Surface
7. Local Development
8. Scope Notes

## 1. Product Structure

### Frontend

Path: `frontend/`

Responsible for:

- login
- dashboard
- subsystem pages
- AI advisory UI
- notifications UI
- work-order UX
- digital twin UI
- reports and settings
- enterprise modules

### Backend

Path: `backend/`

Responsible for:

- KPI generation and caching
- alerts and advisory responses
- work-order APIs
- event stream generation
- digital twin data
- workflow simulation results
- synthetic sensor APIs
- enterprise KPI APIs

## 2. Main Screens

### Dashboard

Purpose: top-level refinery operating view.

Includes:

- six top KPI cards
- production throughput chart with prediction toggle
- subsystem health radar chart
- KPI correlation chart for throughput, margin, and yield
- product slate donut chart
- digital twin preview
- live alerts feed

Global dashboard KPIs:

| KPI | Meaning | Why it matters |
| --- | --- | --- |
| Crude Throughput | Daily crude processed | Core production signal |
| Equipment Uptime | Availability of critical assets | Directly affects continuity |
| Gross Refining Margin | Margin per barrel | Main profitability indicator |
| Product Yield | Saleable product ratio | Shows conversion effectiveness |
| Safety Index | Composite safety score | Indicates process safety posture |
| Environmental Compliance Index | Composite compliance score | Indicates environmental risk |

### Subsystem Pages

Each subsystem page follows the same pattern:

- KPI cards at the top
- charts in the main area
- context panels on the side
- KPI modal on card click
- chart explanation modal on info click

Chart types used across the app:

- area charts
- line charts
- radar charts
- donut and pie charts
- stacked bar charts
- stacked area charts
- scatter plots
- dual-axis charts

### 3D Digital Twin

Purpose: spatial view of refinery assets.

Capabilities:

- select buildings and units
- fetch detail on selection
- display telemetry and machine context
- correlate physical location with alerts and KPIs

### AI Advisory Panel

Purpose: provide prioritized, explainable recommendations.

Capabilities:

- severity counts
- advisory summaries
- root cause analysis
- recommended actions
- expected benefits
- workflow launch actions

### Notifications Panel

Purpose: convert alert awareness into action.

Capabilities:

- live alert list
- expandable alert detail
- suggested action review
- direct work-order creation

### Work Orders

Purpose: manage corrective action lifecycle.

Capabilities:

- manual create
- subsystem filtering
- search
- approve or reject
- status progression

### Workflow Simulator

Purpose: show how AI-guided scenarios are evaluated.

Supported workflows:

- `optimize-process`
- `schedule-maintenance`
- `reduce-emissions`
- `rebalance-crude`

Each workflow returns:

- title
- step list
- predicted outcomes
- savings or impact statements
- confidence score

### Enterprise Modules

Available modules:

- HR & Workforce
- Finance & Accounting
- Procurement & Supply Chain
- Operations & Safety Management
- Sustainability & Environmental Impact
- Governance & Risk Management

### Reports

Current report categories:

- Operational Performance
- Energy Efficiency
- Maintenance & Reliability
- ESG Compliance

### Settings

Includes:

- user profile
- sign-out
- placeholder AI integration controls
- polling slider UI
- subsystem toggle UI

## 3. Refinery KPIs

### Crude Processing

Purpose: distillation and front-end process performance.

| KPI | Unit | Operational meaning |
| --- | --- | --- |
| Crude Throughput | `bbl/day` | Daily feed rate through CDU/VDU |
| Distillation Efficiency | `%` | Share of valuable distillates recovered |
| Furnace Efficiency | `%` | Process furnace thermal efficiency |
| Hydrogen Consumption | `Nm3/h` | Hydrogen used in treating |
| Column Pressure Stability | `%` | Stability of column operating pressure |
| Product Yield Ratio | `%` | Saleable product ratio vs feed |
| Gross Refining Margin | `$/bbl` | Margin per processed barrel |

Charts and panels:

- dual-axis area chart for throughput and efficiency
- correlation chart for throughput, distillation efficiency, and furnace efficiency
- unit status overview panel

### Equipment Health

Purpose: reliability and maintenance performance.

| KPI | Unit | Operational meaning |
| --- | --- | --- |
| Equipment Uptime | `%` | Availability of critical equipment |
| Mean Time Between Failures | `hrs` | Average run time between failures |
| Mean Time To Repair | `hrs` | Average repair duration |
| Vibration Index | `mm/s` | Rotating equipment vibration severity |
| Maintenance Backlog | `tasks` | Open corrective tasks |

Charts and panels:

- vibration trend area chart
- vibration vs MTBF scatter plot
- reliability correlation chart

### Energy Management

Purpose: energy efficiency and utility performance.

| KPI | Unit | Operational meaning |
| --- | --- | --- |
| Energy Intensity Index | `GJ/bbl` | Energy used relative to throughput |
| Energy Per Barrel | `MJ/bbl` | Energy consumed per barrel |
| Boiler Efficiency | `%` | Utility boiler efficiency |
| Steam Usage | `t/day` | Total steam consumption |
| Power Consumption | `MW` | Total electrical demand |

Charts and panels:

- power demand area chart
- utility mix stacked bar chart
- energy KPI correlation chart
- optimization opportunities panel

### Production Yield

Purpose: output mix and commercial value distribution.

| KPI | Unit | Operational meaning |
| --- | --- | --- |
| Gasoline Yield | `%` | Share converted to gasoline/naphtha |
| Diesel Yield | `%` | Share converted to diesel/distillates |
| Jet Fuel Yield | `%` | Share converted to aviation fuel |
| LPG Output | `t/day` | Daily LPG production |
| Heavy Residue | `%` | Share of low-value bottoms |

Charts and panels:

- yield bar chart
- yield distribution donut chart
- correlation chart across major yield metrics

### Environmental Monitoring

Purpose: emissions and compliance monitoring.

| KPI | Unit | Operational meaning |
| --- | --- | --- |
| CO2 Emissions | `t/day` | Total equivalent carbon emissions |
| SOx Emissions | `t/day` | Sulfur oxide emissions |
| NOx Emissions | `t/day` | Nitrogen oxide emissions |
| Flare Gas Volume | `Nm3/h` | Gas sent to flare |
| Water Discharge Quality | `%` | Effluent compliance quality index |
| Environmental Compliance Index | `%` | Composite environmental compliance score |

Charts and panels:

- SOx trend area chart
- combined emissions stacked area chart
- emissions correlation chart
- compliance watchlist panel

### Safety Monitoring

Purpose: process safety posture and risk exposure.

| KPI | Unit | Operational meaning |
| --- | --- | --- |
| Pressure Safety Index | `%` | Pressure-relief and margin health score |
| Leak Detection Events | `events` | Confirmed hydrocarbon or H2S leaks |
| Emergency Shutdown Events | `events` | Unplanned trip events |
| Hazard Risk Index | `score` | AI-derived operational risk score |

Charts and panels:

- hazard risk area chart
- safety radar chart
- PSI vs hazard risk correlation chart
- safety interlock status panel

## 4. Enterprise KPIs

### HR & Workforce

- Headcount
- Turnover Rate
- Training Hours
- Safety Training Compliance
- Open Positions

### Finance & Accounting

- Operating Cost
- Revenue Per Barrel
- EBITDA Margin
- Capex Utilization
- Cash Flow

### Procurement & Supply Chain

- Supplier On-Time Delivery
- Inventory Turnover
- Procurement Cycle Time
- Contract Compliance
- Spend Under Management

### Governance & Risk Management

- Compliance Score
- Open Legal Cases
- Regulatory Filings On Time
- Insurance Coverage
- Risk Exposure
- System Availability
- Cybersecurity Incidents
- Patch Compliance
- IT Ticket Resolution Time
- Backup Success Rate

### Sustainability & Environmental Impact

- Carbon Intensity
- Renewable Energy Share
- Water Recycling Rate
- ESG Score
- Community Investment

### Operations & Safety Management

- Building Energy Index
- HVAC Efficiency
- Facility Uptime
- Workspace Utilization
- Maintenance Cost
- Total Recordable Incident Rate
- Lost Time Injury Rate
- Near Miss Reports
- Safety Observations
- Permit To Work Compliance

## 5. Data And Workflow Model

### Polling model

The frontend starts polling when the authenticated shell mounts.

- alerts: every 30 seconds
- buildings and machines: every 10 seconds
- advisory: every 10 minutes
- KPIs: every 24 hours

### Backend behavior

The backend includes:

- KPI caching
- threshold-based KPI status generation
- event stream seeding from alerts
- work-order creation and lifecycle updates
- synthetic sensor generation for 5000+ streams

### Automatic work-order behavior

If a KPI enters a critical state and no open work order already exists for that KPI, the backend can auto-create one.

### Work-order lifecycle

1. `Pending Approval`
2. `Approved`
3. `In Progress`
4. `Completed`

### Explainability model

The app has two explanation layers:

- KPI modal on KPI card click
- chart description modal on chart info click

## 6. API Surface

Main API endpoints:

- `GET /api/health`
- `GET /api/kpis`
- `GET /api/kpis/:subsystem`
- `GET /api/alerts`
- `GET /api/events`
- `GET /api/work-orders`
- `POST /api/work-orders`
- `PATCH /api/work-orders/:id`
- `POST /api/work-orders/:id/approve`
- `POST /api/work-orders/:id/reject`
- `GET /api/advisory`
- `GET /api/advisory/:subsystem`
- `GET /api/digital-twin/buildings`
- `GET /api/digital-twin/machines`
- `GET /api/digital-twin/buildings/:id`
- `GET /api/sensors/live`
- `GET /api/sensors/live/units`
- `GET /api/sensors/history`
- `GET /api/machines/status`
- `GET /api/refinery/summary`
- `GET /api/enterprise/:module`
- `POST /api/workflow/simulate`

## 7. Local Development

### Prerequisites

- Node.js 18+
- npm

### Install dependencies

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd frontend
npm install
```

### Run locally

Start backend:

```bash
cd backend
npm run dev
```

Start frontend in another terminal:

```bash
cd frontend
npm run dev
```

Expected local URLs:

- frontend: `http://localhost:3000`
- backend: `http://localhost:3001`

The frontend API client expects the backend at `http://localhost:3001/api`.

## 8. Scope Notes

This is a realistic prototype, not a production refinery deployment.

What is simulated:

- telemetry
- AI workflow orchestration
- alert and advisory logic
- report output
- persistence model
- authentication backend

What is simplified:

- reports are placeholders
- some settings are illustrative UI only
- auth is demo-only and client-side
- there is no live historian, CMMS, ERP, or DCS integration yet

Even with those limits, the product already demonstrates the intended operating model clearly: monitor, interpret, investigate, advise, act, and track execution.
