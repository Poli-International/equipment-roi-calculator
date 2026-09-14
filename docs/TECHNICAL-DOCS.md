# Equipment ROI Calculator V2: Technical Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Module Breakdown & File Structure](#module-breakdown--file-structure)
3. [Data Schemas & Input Parameters](#data-schemas--input-parameters)
4. [Calculation & Logic Algorithms](#calculation--logic-algorithms)
5. [Inline SVG Visualizations (charts.js)](#inline-svg-visualizations-chartsjs)
6. [Internationalization Engine (i18n.js)](#internationalization-engine-i18njs)
7. [Printable Business Case & Local Date Handling](#printable-business-case--local-date-handling)
8. [Cross-Tool Integration Guidelines](#cross-tool-integration-guidelines)
9. [Performance, Security & CSP Compliance](#performance-security--csp-compliance)
10. [Version History](#version-history)

---

## Architecture Overview

### Technology Stack
- **HTML5**: Semantic markup with accessible landmarks (`<main>`, `<header>`, `<section>`, `aria-label`).
- **CSS3**: CSS custom properties for dark and light theme switching, responsive grid layouts, and media print overrides.
- **Vanilla JavaScript (ES5)**: Native browser execution, zero external frameworks, zero bundlers, zero runtime compilation.
- **Input Guards Utility (`js/input-guards.js`)**: Robust input sanitization (`G.safeFloat`, `G.isValid`, `G.formatError`, `G.formatWarning`).
- **Charts Utility (`js/charts.js`)**: 100% inline SVG rendering (zero canvas, zero bitmaps, zero third-party dependencies).
- **Internationalization Utility (`js/i18n.js`)**: Centralized translation dictionary and template token substitution.

### File Structure
```
/
├── index.html                    # Root entry point and tool interface
├── css/
│   └── style.css                 # Primary stylesheet and print styling
├── js/
│   ├── app.js                    # V2 calculation engine and event orchestration
│   ├── charts.js                 # Inline SVG diagram generator
│   ├── i18n.js                   # Universal translation dictionary & t() function
│   ├── input-guards.js           # Safe number parsing and validation guards
│   └── share.js                  # Result card and URL serialization
├── tools/
│   └── shared/
│       ├── theme.css             # Base studio theme variables
│       ├── print.css             # Global print rules
│       ├── a11y.css              # Accessibility high-contrast focus rings
│       └── share-card.js         # Result card renderer
└── docs/
    ├── TECHNICAL-DOCS.md         # Comprehensive architecture and API documentation
    └── USER-GUIDE.md             # Studio operator user manual
```

---

## Module Breakdown & File Structure

1. **`index.html`**: Host document. Contains theme synchronization handshake, input panels, output result containers, and related tools navigation.
2. **`js/i18n.js`**: Synchronously loaded dictionary defining all user-visible strings with `{param}` token replacement.
3. **`js/charts.js`**:
   - `renderPaybackChart`: Generates cumulative cash flow curve with £0 break-even baseline, month grid, and crossover marker badge.
   - `renderTcoChart`: Generates horizontal stacked bar chart showing relative CapEx, consumables, parts, servicing, and power shares.
   - `renderComparisonChart`: Generates grouped bar chart comparing Option A vs Option B / Option 0 (Status Quo).
4. **`js/app.js`**: Orchestrates state validation, monthly session volumes, unbudgeted running cost amortization, crossover detection, and business case generation.

---

## Data Schemas & Input Parameters

### Section 1: Equipment Core Parameters
- `equip-name` (string, optional): Equipment brand/model description.
- `equip-cost` (float, required, default `300`): Initial capital expenditure (CapEx) in GBP.
- `sessions-day` (float, required, default `4`): Average client procedures per day (minimum 0.5).
- `revenue-session` (float, required, default `150`): Gross fee charged per procedure in GBP.
- `consumables-session` (float, default `8`): Single-use disposable costs per procedure.
- `work-days` (float, default `5`): Working days per week (1 to 7).
- `annual-maintenance` (float, default `0`): Annual servicing, calibration, and test costs.
- `equip-lifespan` (float, default `3`): Operational lifespan in years (1 to 20).

### Section 2: Unbudgeted Running Costs
- `power-cost-month` (float, default `5`): Monthly electricity consumption in GBP.
- `part-name` (string, optional): Component subject to wear (e.g. drive cam, motor, battery cell).
- `part-cost` (float, default `45`): Unit price of replacement part.
- `part-interval` (float, default `12`): Replacement cycle in months.

### Section 3: Time Saved as Money
- `time-saved` (float, default `0`): Procedural minutes saved per session.
- `hourly-rate` (float, optional, **blank by default**): Value of practitioner time in GBP/hour.
  - **Strict Behavior**: If left empty, time value is strictly £0. Time savings are displayed in annual hours only.

### Section 4: Side-by-Side Comparison
- `compare-mode`: `"no_buy"` (Option 0: Do Not Buy / Status Quo) or `"opt_b"` (Alternative Equipment Purchase).
- `opt-b-cost`, `opt-b-rev-session`, `opt-b-run-month`: Operational parameters for alternative equipment.

---

## Calculation & Logic Algorithms

### 1. Volume & Unbudgeted Overhead
```javascript
weeklySessions = sessionsDay * workDays;
annualSessions = weeklySessions * 52;
monthlySessions = annualSessions / 12;

consumablesMonthly = consSession * monthlySessions;
maintenanceMonthly = annualMaint / 12;
partsMonthly = (partInterval > 0 && partCost > 0) ? (partCost / partInterval) : 0;
powerMonthly = powerCostMonth;

totalMonthlyRunningCost = consumablesMonthly + maintenanceMonthly + partsMonthly + powerMonthly;
annualRunningCost = totalMonthlyRunningCost * 12;
runningCostPerSession = totalMonthlyRunningCost / monthlySessions;
```

### 2. Gross Margin & Cash Flow
```javascript
monthlyGrossRevenue = revSession * monthlySessions;
monthlyNetCash = monthlyGrossRevenue - totalMonthlyRunningCost;
annualNetCash = monthlyNetCash * 12;
```

### 3. Payback Horizon & Crossover Detection
Starting at Month 0 with balance equal to `-cost`:
```javascript
var cumulative = -cost;
var crossoverMonth = null;
var crossoverExact = null;

for (var m = 1; m <= totalMonths; m++) {
  var prev = cumulative;
  cumulative += monthlyNetCash;
  if (crossoverMonth === null && cumulative >= 0) {
    crossoverMonth = m;
    var fraction = -prev / monthlyNetCash;
    crossoverExact = (m - 1) + fraction;
  }
}
```

### 4. Total Cost of Ownership (TCO)
```javascript
totalConsumablesLifespan = consumablesMonthly * 12 * lifespan;
totalPartsLifespan       = partsMonthly * 12 * lifespan;
totalMaintLifespan       = maintenanceMonthly * 12 * lifespan;
totalPowerLifespan       = powerMonthly * 12 * lifespan;
totalTco                 = cost + totalConsumablesLifespan + totalPartsLifespan + totalMaintLifespan + totalPowerLifespan;
```

---

## Inline SVG Visualizations (charts.js)

All diagrams are generated dynamically via DOM SVG APIs (`document.createElementNS('http://www.w3.org/2000/svg', ...)`):
- **Payback Crossover Line**: Plots cumulative net earnings across all months against the zero break-even line. Features a vertical dashed guide, crossover coordinate point, and callout badge.
- **TCO Stacked Bar**: Displays proportional expenditure shares for CapEx and operational categories. Incorporates SVG hatch patterns (`<pattern>`) and distinct geometric marker symbols (`■`, `▲`, `●`, `◆`) so colors are never the sole differentiator.
- **Comparison Grouped Bars**: Displays side-by-side grouped bars for initial investment, annual running cost, annual net cash, and 3-year cumulative profit.

---

## Printable Business Case & Local Date Handling

The printable case is formatted for lenders and equity partners:
- **Date Compliance**: Strictly evaluated using local calendar date APIs (`toLocaleDateString` or local `getFullYear`, `getMonth`, `getDate`). Never utilizes UTC string clipping (`toISOString().slice(0, 10)`).
- **Executive Summary**: Displays CapEx, payback horizon, monthly net contribution, and break-even session count.
- **Sensitivity Table**: Evaluates base case (100%), moderate slowdown (-25%), and severe stress (-50%) volume scenarios.
- **Sign-off Block**: Studio owner signature and lender reviewer endorsement lines.

---

## Performance, Security & CSP Compliance

- **Zero External Resources**: Shipped browser files contain 0 external `<script>`, `<link>`, or `<img>` references, and 0 CDNs.
- **Zero Inline Style Color Literals**: Complies with strict theme segregation; all colors are managed via CSS custom properties.
- **Max File Size**: Every shipped file is below 500 KB (524,288 bytes).
- **Input Sanitization**: All numeric values pass through `InputGuards.safeFloat`.

---

## Version History

### Version 2.0.0
- Added monthly payback period calculation with exact crossover detection and inline SVG trajectory chart.
- Added comprehensive unbudgeted running costs (power, maintenance, wear parts with replacement intervals, and TCO breakdown).
- Added time saved as money module with strict blank-rate unmonetized enforcement.
- Added side-by-side comparison including Option 0: Do Not Buy (Status Quo).
- Added printable partner/lender business case with local calendar date and sensitivity stress test.
- Added internationalization (`i18n.js`) framework with 100% string mapping.
- Added cross-tool navigation links to related Poli International studio tools.
