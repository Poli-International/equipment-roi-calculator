# Equipment ROI Calculator V2: User Guide

A return on investment (ROI), cash flow crossover, and equipment payback calculator published by Poli International for tattoo artists, body piercers, and studio owners.

---

## 1. Overview

The **Equipment ROI Calculator V2** models whether studio equipment pays for itself, the exact month it crosses over into net profit, unbudgeted operational expenses, monetized time savings, and comparative scenarios against alternative equipment or doing nothing.

Key capabilities:
- **Payback Period in Months & Crossover Detection**: Models month-by-month cash flow and identifies the exact crossover month where cumulative net earnings surpass initial purchase expenditure.
- **The Running Costs Nobody Budgets**: Incorporates consumables per session, continuous electrical overhead, annual servicing, and wear components with defined replacement intervals to compute True Total Cost of Ownership (TCO).
- **Time Saved as Money**: Monetizes procedural efficiency only if the user specifies an explicit hourly rate. Blank rate inputs leave time savings unmonetized in hours only.
- **Side-by-Side Comparison**: Compares the proposed asset against alternative equipment or against **Option 0: Do Not Buy (Status Quo)**.
- **Printable Business Case**: Generates a lender- and partner-ready executive disclosure document dated with the local calendar date, complete with sensitivity scenarios and review sign-off blocks.

All calculations run 100% client-side in your web browser. No financial data leaves your device.

---

## 2. Using the Calculator

### Section 1: Equipment Parameters
- **Equipment Name** *(Optional)*: Model name for identification (e.g., Rotary Tattoo Machine, Precision Autoclave).
- **Purchase Cost (£)**: Initial capital expenditure (CapEx).
- **Sessions Using This Equipment / Day**: Average client procedures per working day using the asset (minimum 0.5).
- **Gross Revenue per Session (£)**: Fee earned per client procedure.
- **Consumables Cost per Session (£)**: Per-session single-use supplies (cartridges, barrier film, disposable grips, skin prep).
- **Working Days per Week**: Operational days per week (1 to 7).
- **Annual Servicing / Calibration (£)** *(Optional)*: Periodic servicing and calibration.
- **Expected Lifespan (Years)**: Operational equipment life (1 to 20 years).

### Section 2: The Running Costs Nobody Budgets
- **Power & Electricity Cost (£/month)** *(Optional)*: Continuous energy draw for power supplies, battery charging, or heating coils.
- **Known Wear Part Name & Cost (£)** *(Optional)*: Drive cams, motor units, battery cells, or autoclave door gaskets.
- **Part Replacement Interval (Months)** *(Optional)*: Expected service life of the replacement part.

### Section 3: Time Saved as Money
- **Time Saved per Session (Minutes)** *(Optional)*: Time saved in setup, execution, or breakdown.
- **Your Hourly Rate (£/hr)** *(Optional)*: Explicit monetary value of your working time.
  - *Strict rule*: If left blank, time savings are tracked in total hours per year, but zero currency value is added to financial payback.

### Section 4: Side-by-Side Comparison
- Select benchmark:
  - **Option 0: Do Not Buy (Status Quo)**: Models the financial trajectory of not buying, showing incremental profits versus zero capital outlay.
  - **Option B: Alternative Equipment Purchase**: Enter purchase price, revenue per session, and monthly running cost to compare side-by-side.

Click **Calculate ROI & Payback** to generate the analysis.

---

## 3. Results Dashboard & Visualizations

1. **Primary Metrics**:
   - **Payback Period**: Duration in months and exact crossover month (e.g., `4.2 mos (Month 5)`).
   - **Break-even Sessions**: Total completed procedures required to pay off capital outlay.
   - **Annual Net Cash Flow**: Net yearly profit after subtracting all consumables, power, servicing, and replacement parts.
   - **Total Cost of Ownership (TCO)**: Complete lifecycle cost (purchase + all operating overheads) and true cost per procedure.

2. **Inline SVG Crossover Trajectory Chart**:
   - Visualizes cash recovery from Month 0 through the equipment lifespan.
   - Distinct £0 Break-even Line and crossover marker badge denoting the exact month cumulative net cash crosses into net profit.

3. **TCO Breakdown Chart**:
   - Stacked visual breakdown showing purchase price versus consumables, replacement parts, maintenance, and power over the asset's lifespan.

4. **Comparative Decision Summary**:
   - Comparative grouped bar chart and numerical variance table showing differences in CapEx, annual running cost, annual net cash, and 3-year cumulative totals.

5. **Month-by-Month Schedule**:
   - Interactive table detailing month, monthly net cash, cumulative balance, and payoff progress.

---

## 4. Printable Lender / Partner Business Case

Click the **Print Financial Proposal / Save PDF** button or trigger browser print (`Ctrl+P` / `Cmd+P`):
- Automatically formatted for high-contrast, black-and-white printing.
- Dated with the user's **local calendar date**.
- Contains executive investment summary, operational overhead breakdown, volume sensitivity analysis (Base 100%, Moderate -25%, Downside -50%), and formal sign-off lines for studio principals and financing partners.

---

## 5. Related Studio Tools

Connect this ROI analysis with related operational and compliance instruments:
- [Machine Maintenance Logbook](https://poliinternational.com/machine-maintenance-logbook/): Service tracking and cleaning records.
- [Machine Voltage Configurator](https://poliinternational.com/machine-voltage-configurator/): Voltage settings and needle stroke calibrations.
- [Tax Deduction Tracker](https://poliinternational.com/tax-deduction-tracker/): Capital allowances and depreciation write-offs.
- [Autoclave Calculator](https://poliinternational.com/autoclave-calculator/): Sterilization cycle cost modelling.

---

## 6. Embedding on Studio Websites

To embed this calculator in an iframe on your studio website or portal, use the following snippet:

```html
<iframe src="https://poliinternational.com/tools/equipment-roi-calculator/index.html" width="100%" height="850" frameborder="0"></iframe>
```
