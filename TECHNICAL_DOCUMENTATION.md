# Equipment ROI Calculator - Technical Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Schemas](#data-schemas)
3. [Calculation / Logic Algorithms](#calculation--logic-algorithms)
4. [API Reference](#api-reference)
5. [Integration Guide](#integration-guide)
6. [Customization](#customization)
7. [Performance](#performance)
8. [Browser Compatibility](#browser-compatibility)
9. [Security](#security)
10. [Version History](#version-history)
11. [Support and Contact](#support-and-contact)

## Architecture Overview

### Technology Stack

- **HTML5** - Semantic markup with ARIA-compatible structure
- **CSS3** - Single stylesheet (`/tools/equipment-roi-calculator/css/style.css`)
- **Vanilla JavaScript (ES5)** - No frameworks, libraries, or dependencies
- **Input Guards Utility** - Shared validation module (`/js/input-guards.js`)

### File Structure

```
/tools/equipment-roi-calculator/
├── index.html          # Main tool interface
├── css/
│   └── style.css       # Tool-specific styles
└── js/
    └── app.js          # Core calculation logic and UI handling
```

### Component Breakdown

The tool consists of three logical components:

1. **Input Form** - 8 fields for equipment parameters
2. **Calculation Engine** - Pure JavaScript functions in `app.js`
3. **Results Display** - Dynamic DOM elements for metrics and year-by-year table

### Iframe Detection

The tool includes automatic dark theme detection when embedded in an iframe:

```javascript
if (window.self !== window.top) {
  document.documentElement.setAttribute('data-theme', 'dark');
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'poli-theme') {
      document.documentElement.setAttribute('data-theme', e.data.light ? 'light' : 'dark');
    }
  });
}
```

## Data Schemas

### Input Fields

| Field ID | Type | Default | Min | Max | Step | Description |
|----------|------|---------|-----|-----|------|-------------|
| `equip-name` | text | empty | - | - | - | Equipment name (optional) |
| `equip-cost` | number | 300 | 0 | - | 10 | Purchase cost in GBP |
| `sessions-day` | number | 4 | 0.5 | - | 0.5 | Sessions using equipment per day |
| `revenue-session` | number | 150 | 0 | - | 10 | Revenue per session in GBP |
| `consumables-session` | number | 8 | 0 | - | 1 | Consumables cost per session in GBP |
| `work-days` | number | 5 | 1 | 7 | - | Working days per week |
| `annual-maintenance` | number | 0 | 0 | - | 10 | Annual maintenance cost in GBP (optional) |
| `equip-lifespan` | number | 3 | 1 | 20 | - | Expected lifespan in years |

### Internal Variables (app.js)

```javascript
var cost          = G.safeFloat(...)  // Purchase cost
var sessionsDay   = G.safeFloat(...)  // Sessions per day
var revSession    = G.safeFloat(...)  // Revenue per session
var consSession   = G.safeFloat(...)  // Consumables per session
var workDays      = G.safeFloat(...)  // Working days per week
var annualMaint   = G.safeFloat(...)  // Annual maintenance cost
var lifespan      = G.safeFloat(...)  // Equipment lifespan in years
```

### Derived Variables

```javascript
var netPerSession    = revSession - consSession
var dailyNet         = netPerSession * sessionsDay
var weeklyNet        = dailyNet * workDays
var annualNet        = weeklyNet * 52 - annualMaint
var lifespanNet      = annualNet * lifespan - cost
var sessionsToBreakeven = Math.ceil(cost / netPerSession)
var daysToPayback    = sessionsToBreakeven / sessionsDay
var weeksToPayback   = daysToPayback / workDays
```

### Results Display Elements

| Element ID | Content | Format |
|------------|---------|--------|
| `payback` | Payback period string | "X days/weeks/months" |
| `breakeven-sessions` | Sessions to break even | Integer with comma formatting |
| `annual-profit` | Net profit per year | Currency with comma formatting |
| `total-roi` | ROI percentage over lifespan | "X%" or ", " |

## Calculation / Logic Algorithms

### Formatting Functions

#### `fmt(n)`
- **Purpose**: Format number as currency with comma separators
- **Input**: Number
- **Output**: String like "£1,234.56"
- **Logic**: Uses regex `/\B(?=(\d{3})+(?!\d))/g` for thousand separators

#### `fmtInt(n)`
- **Purpose**: Format integer with comma separators
- **Input**: Number
- **Output**: String like "1,234"
- **Logic**: Same regex as `fmt()` but uses `toFixed(0)`

### Main Calculation Handler

#### `calcBtn.addEventListener('click', function() {...})`

**Step 1: Input Collection**
- Retrieves all 8 field values using `G.safeFloat()` (except equipment name)
- Default values: consumables=0, workDays=5, annualMaint=0, lifespan=3

**Step 2: Validation**
- Checks purchase cost is valid and non-negative
- Checks sessions per day is valid and > 0
- Checks revenue per session is valid and non-negative
- Warns if sessions per day > 15
- Displays error message if any validation fails

**Step 3: Cross-field Validation**
- **Net Profit Check**: If `revSession - consSession <= 0`, displays warning that equipment never pays for itself
- **Maintenance Ratio Check**: If `annualMaint / cost > 0.5`, displays warning about high maintenance costs

**Step 4: Core Calculations**

```
netPerSession    = revenuePerSession - consumablesPerSession
dailyNet         = netPerSession * sessionsPerDay
weeklyNet        = dailyNet * workingDaysPerWeek
annualNet        = weeklyNet * 52 - annualMaintenance
lifespanNet      = annualNet * lifespan - purchaseCost
sessionsToBreakeven = ceil(purchaseCost / netPerSession)
daysToPayback    = sessionsToBreakeven / sessionsPerDay
weeksToPayback   = daysToPayback / workingDaysPerWeek
```

**Step 5: Payback Period Formatting**
- If weeks < 1: Display in days (rounded up)
- If weeks < 8: Display in weeks (rounded up)
- Otherwise: Display in months (weeks / 4.33, one decimal)

**Step 6: ROI Calculation**
```
roiPct = ((lifespanNet / purchaseCost) * 100).toFixed(0) + '%'
```
Returns ", " if purchase cost is 0.

**Step 7: Year-by-Year Table Generation**
- Iterates for `ceil(lifespan)` years
- Each row shows: Year number, Net Income, Cumulative Revenue, Net P/L vs Cost, Status (Paid off / Remaining)
- Status shows "✅ Paid off" when cumulative revenue >= purchase cost

## API Reference

### Public Functions

#### `fmt(n)`
- **Parameters**: `n` (Number) - Value to format
- **Returns**: String - Formatted as "£X,XXX.XX"
- **Scope**: Global within `app.js`

#### `fmtInt(n)`
- **Parameters**: `n` (Number) - Value to format
- **Returns**: String - Formatted as "X,XXX"
- **Scope**: Global within `app.js`

### Event Handlers

#### `calcBtn.addEventListener('click', handler)`
- **Trigger**: Click on "Calculate ROI" button
- **Behavior**: Validates inputs, performs calculations, updates results display
- **Side Effects**: Shows/hides results div, scrolls to results, generates table HTML

### External Dependencies

#### `InputGuards` Object (from `/js/input-guards.js`)

| Method | Purpose |
|--------|---------|
| `G.safeFloat(value, fallback)` | Safely parse float from input, return fallback if invalid |
| `G.isValid(value)` | Check if value is a valid number (not NaN, not null) |
| `G.formatError(message)` | Return HTML string for error display |
| `G.formatWarning(message)` | Return HTML string for warning display |

## Integration Guide

### Standalone Embedding

The tool can be embedded in any webpage using an iframe:

```html
<iframe 
  src="https://poliinternational.com/tools/equipment-roi-calculator/"
  width="100%"
  height="800"
  frameborder="0"
  allowtransparency="true"
  title="Equipment ROI Calculator">
</iframe>
```

### Theme Control (Iframe Only)

When embedded in an iframe, the tool supports theme control via `postMessage`:

```javascript
// Set light theme
document.querySelector('iframe').contentWindow.postMessage({
  type: 'poli-theme',
  light: true
}, '*');

// Set dark theme
document.querySelector('iframe').contentWindow.postMessage({
  type: 'poli-theme',
  light: false
}, '*');
```

### Dependencies

The tool is dependency-free. It requires:
- `/tools/equipment-roi-calculator/css/style.css`
- `/js/input-guards.js`
- `/tools/equipment-roi-calculator/js/app.js`

All paths are relative to the domain root.

## Customization

### Styling

The tool uses CSS classes with BEM-like naming:
- `.tool-wrapper` - Main container
- `.tool-header` - Header section
- `.calc-card` - Input form container
- `.form-grid` - Input field grid
- `.form-field` - Individual field wrapper
- `.input-field` - Input elements
- `.primary-btn` - Calculate button
- `.results-row` - Results metrics row
- `.metric-card` - Individual metric display
- `.detail-table` - Year-by-year table

Override these classes in your own stylesheet when embedding.

### Default Values

Modify the `value` attributes in `index.html` to change defaults:
- Purchase Cost: 300
- Sessions/Day: 4
- Revenue/Session: 150
- Consumables/Session: 8
- Work Days/Week: 5
- Annual Maintenance: 0
- Lifespan: 3

## Performance

- **Zero external requests** - All assets are self-hosted
- **No JavaScript frameworks** - Vanilla JS only, minimal overhead
- **Single DOM update** - Results are rendered in one operation
- **No animations or transitions** - Instant feedback on calculation
- **Total payload**: ~5KB (HTML + CSS + JS combined)

## Browser Compatibility

The tool uses:
- ES5 JavaScript (no arrow functions, no `let`/`const`, no template literals)
- Standard DOM API (`getElementById`, `addEventListener`)
- CSS2.1 and basic CSS3

Compatible with:
- Internet Explorer 9+
- All modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Android Chrome)

## Security

### Input Handling

All user inputs are sanitized through `InputGuards.safeFloat()`:
- Returns `NaN` for non-numeric input
- Returns fallback value for empty fields
- Prevents injection of HTML or JavaScript

### XSS Prevention

- No `innerHTML` used for user-supplied values
- All user input displayed via `textContent` property
- Error/warning messages use `G.formatError()` and `G.formatWarning()` which create DOM elements safely
- Equipment name field is display-only and not used in calculations

### Validation

- Client-side validation prevents negative values where inappropriate
- Cross-field validation catches logical errors (e.g., revenue < consumables)
- Warning thresholds prevent unrealistic inputs (e.g., sessions > 15/day)

## Version History

### Version 1.0.0 (Current)
- Initial release
- Core ROI calculation with 8 input fields
- Payback period in days, weeks, or months
- Break-even session count
- Annual net profit calculation
- Year-by-year projection table
- Iframe embedding support with theme control
- Input validation and cross-field warnings

## Support and Contact

For technical support, feature requests, or bug reports:

- **Email**: support@poliinternational.com
- **Website**: https://poliinternational.com
- **Tool URL**: https://poliinternational.com/tools/equipment-roi-calculator/

---

*Documentation generated from source code version 1.0.0*
