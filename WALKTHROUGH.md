# Astrikos Walkthrough

This walkthrough is written as a practical guide. It explains how someone uses the application from login to action.

## Quick Tour

If you need the fastest useful tour, follow this order:

1. Sign in
2. Open the dashboard
3. Click a KPI card
4. Open a chart explanation
5. Open AI Advisory
6. Launch a workflow simulation
7. Open Notifications
8. Create a work order
9. Review the work-order lifecycle
10. Open the 3D Digital Twin

## 1. Start The Application

Start the backend first, then the frontend.

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Then open the frontend in the browser.

## 2. Sign In

The app opens on the login page.

Demo accounts:

- `admin@astrikos.ai` / `admin123`
- `engineer@astrikos.ai` / `engineer123`
- `operator@astrikos.ai` / `operator123`

After sign-in, the user is taken into the main application shell.

## 3. Understand The Shell Once

The shell remains consistent across the app.

### Left sidebar

Use it to navigate to:

- Dashboard
- 3D Digital Twin
- Workflow Simulator
- Refinery system pages
- Work Orders
- Enterprise modules
- Reports
- Settings

### Top bar

Use it for:

- search
- AI Advisory
- Notifications
- theme toggle
- user identity

### Global panels

These can be opened from almost anywhere:

- AI advisory panel
- notifications panel
- create-work-order modal

## 4. Start On The Dashboard

The dashboard is the best first stop because it gives the operating picture in one place.

### Top KPI cards

These summarize refinery health across production, reliability, profitability, safety, and environmental performance.

Cards shown:

- Crude Throughput
- Equipment Uptime
- Gross Refining Margin
- Product Yield
- Safety Index
- Environmental Compliance

What to do here:

- click a KPI card to open the KPI modal
- review the definition, formula, thresholds, and operational meaning
- decide whether you need to drill into a subsystem page

### Production Throughput chart

Use this chart to answer:

- are we above or below target
- is the trend stable or deteriorating
- is prediction useful right now

Available actions:

- switch between `6h`, `12h`, and `30h`
- toggle the prediction overlay
- open the chart explanation modal

### Subsystem Health radar

Use this to see whether the refinery is balanced across major operating domains.

Good pattern:

- a broad, even radar shape

Concerning pattern:

- one axis significantly depressed relative to the others

What to do next:

- click the subsystem link below the chart
- open the corresponding subsystem page

### KPI Correlation chart

Use this chart to compare throughput, margin, and yield on the same visual scale.

Typical interpretations:

- all three rising: healthy integrated operation
- throughput stable, yield falling: process inefficiency
- margin falling with steady throughput: economics or slate issue

### Product Slate donut

Use this to understand what the refinery is producing right now.

Watch for:

- residue growing too large
- gasoline or diesel shrinking
- a less favorable commercial slate

### Alerts feed and Digital Twin preview

Use the alerts feed for quick awareness and the twin preview as a jump point into the full 3D view.

## 5. Drill Into A Subsystem Page

Each subsystem page uses the same general structure:

- KPI cards at the top
- charts in the main area
- context panels beside them
- KPI modal support
- chart info buttons for explanation

This consistency matters because users do not need to relearn the UI on each page.

### Crude Processing

Use this page to inspect front-end process performance.

Best questions for this page:

- are we pushing throughput too hard
- is distillation efficiency holding
- is furnace efficiency degrading upstream performance
- is hydrogen consumption signaling feed or treating stress

### Equipment Health

Use this page for reliability and maintenance planning.

Best questions for this page:

- is vibration trending toward failure
- is MTBF declining
- is MTTR too high
- is maintenance backlog accumulating risk

This page is especially actionable because it can lead naturally into work orders.

### Energy Management

Use this page to understand utility load and energy efficiency.

Best questions for this page:

- is power demand too high
- is steam share changing abnormally
- is boiler efficiency falling
- what optimization opportunities exist right now

### Production Yield

Use this page to understand product mix and commercial value.

Best questions for this page:

- are gasoline and diesel yields on target
- is residue growing
- is LPG output stable
- is the slate shifting away from high-value products

### Environmental Monitoring

Use this page when emissions or compliance become a concern.

Best questions for this page:

- are SOx, NOx, or CO2 rising
- are all emissions moving together or not
- is the issue broad combustion behavior or a specific pollutant-control issue
- do we need corrective action or a work order

### Safety Monitoring

Use this page for process safety posture.

Best questions for this page:

- is hazard risk climbing
- are leaks or ESD trips increasing
- is pressure safety integrity degrading
- are interlocks healthy or bypassed

## 6. Use The Explanation Layers

Astrikos is meant to be explainable, not just data-dense.

### KPI modal

Open by clicking a KPI card.

You get:

- KPI name
- definition
- formula
- operational explanation
- thresholds
- current trend context

### Chart description modal

Open by clicking a chart info icon.

You get:

- chart title
- chart type
- what the chart measures
- what each metric means
- how to read it
- one key insight

This is useful because the app is designed for mixed audiences, not only process engineers.

## 7. Open AI Advisory

From the top bar, click `AI Advisory`.

This panel is where the app starts moving from monitoring into recommendation.

Typical use:

1. review critical and warning counts
2. open an advisory card
3. read the short message and impact
4. expand the card
5. review root cause, recommendation, and benefit
6. launch a workflow if available

Use this panel when you want prioritized guidance instead of manually scanning every chart first.

## 8. Run A Workflow Simulation

You can enter the Workflow Simulator from the sidebar or from an advisory action.

The simulator flow is:

1. a selected workflow is loaded, or `optimize-process` is used by default
2. the UI simulates workflow progression
3. the backend returns a structured result
4. the user reviews outcomes and confidence
5. the user conceptually approves execution

Available workflow types:

- process optimization
- predictive maintenance scheduling
- emission reduction
- crude mix rebalancing

Important note:

This is a realistic simulation, not a live DCS-connected optimizer.

## 9. Investigate Alerts In Notifications

From the top bar, click the bell icon.

This is the incident-response surface for alerts.

How it works:

1. view alert severity, type, unit, and timestamp
2. expand an alert for more detail
3. review suggested action
4. create a work order directly from that alert

This makes alerts actionable instead of informational only.

## 10. Manage Work Orders

Open `Work Orders` from the sidebar.

This page is where recommendations become tracked work.

### Typical lifecycle

1. work order is created
2. it starts in `Pending Approval`
3. an authorized user approves it
4. it moves to `Approved`
5. execution moves it to `In Progress`
6. closure marks it `Completed`

### Why this page matters

- filters keep teams focused by subsystem
- search helps retrieve orders quickly
- approval adds governance
- status transitions show progress clearly

### Important background rule

The backend can auto-create a work order when a KPI turns critical and no open linked work order already exists.

## 11. Explore The 3D Digital Twin

Open `3D Digital Twin` from the sidebar.

The twin adds spatial context to refinery behavior.

Typical flow:

1. open the twin
2. select a building or unit
3. fetch detail for that asset
4. review telemetry and machine context
5. correlate location-specific issues with KPIs and alerts

Use the twin when you want to move from abstract KPI trends to physical plant context.

## 12. Review Enterprise Modules

Enterprise modules connect refinery operations to business support functions.

They are useful for:

- HR staffing and training visibility
- finance and cost context
- procurement and supply chain awareness
- governance, legal, and cyber-risk visibility
- ESG and sustainability context
- facilities and safety administration metrics

These views are simpler than the refinery system pages, but they broaden the story beyond the process units.

## 13. Export Reports

Open `Reports` from the sidebar.

This area demonstrates how the platform could package operational intelligence into formal outputs.

Current flow:

1. choose a report type
2. trigger export
3. wait through a short simulated generation step
4. download a placeholder PDF

## 14. Open Settings

Open `Settings` from the sidebar.

Use this page for:

- viewing the current user profile
- signing out
- checking AI integration status UI
- viewing polling slider UI
- reviewing subsystem toggles

Some of these controls are presentational rather than fully wired.

## 15. Understand The End-To-End Workflow

This is the app’s high-level operating loop:

1. backend generates telemetry, alerts, advisories, events, and sensor data
2. frontend starts polling once the shell mounts
3. user reviews dashboard and subsystem KPIs
4. user opens chart or KPI explanations as needed
5. advisories and alerts point to issues worth action
6. user launches workflows or creates work orders
7. work orders move through approval and execution
8. digital twin and enterprise pages add plant and business context

## 16. Best Demo Sequence

If you need to present the app, this is the clearest sequence:

1. sign in with a demo user
2. show dashboard KPIs
3. open one KPI modal
4. open one chart explanation modal
5. open AI Advisory and expand an advisory
6. launch a workflow
7. show Workflow Simulator outcomes
8. open Notifications and create a work order
9. show Work Orders approval and status flow
10. open one subsystem page with the chart variety
11. open the 3D Digital Twin
12. finish with Reports or an Enterprise module

## 17. Scope Notes

This is a realistic prototype, not a production refinery system.

What is simulated:

- telemetry
- AI workflow execution
- alert and advisory logic
- report output
- backend persistence model
- authentication backend

What is simplified:

- reports are placeholders
- settings are partly illustrative
- auth is demo-only and client-side
- there is no live historian, CMMS, ERP, or DCS integration yet

Even with those limits, the application already demonstrates the intended operating model clearly: monitor, interpret, investigate, advise, act, and track execution.
