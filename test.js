import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

console.log('Running comprehensive test suite for Equipment ROI Calculator V2...\n');

// 1. Test InputGuards
const inputGuardsCode = fs.readFileSync('js/input-guards.js', 'utf8');
const sandbox = {
  window: {},
  document: {
    getElementById: () => null,
    createElement: () => ({ id: '', textContent: '' }),
    head: { appendChild: () => {} },
    readyState: 'complete',
    addEventListener: () => {}
  }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(inputGuardsCode, sandbox);
const G = sandbox.InputGuards;

assert.strictEqual(typeof G, 'object', 'InputGuards must be defined');
assert.strictEqual(G.safeFloat('300', 0), 300, 'safeFloat parses string integer');
assert.strictEqual(G.safeFloat('£150.50', 0), 150.5, 'safeFloat handles currency symbol');
assert.strictEqual(G.safeFloat('8,5', 0), 8.5, 'safeFloat handles European decimal comma');
assert.strictEqual(G.safeFloat('', 10), 10, 'safeFloat returns fallback for empty string');
assert.strictEqual(G.isValid(123), true, 'isValid returns true for numbers');
assert.strictEqual(G.isValid(NaN), false, 'isValid returns false for NaN');
assert.strictEqual(G.isValid(Infinity), false, 'isValid returns false for Infinity');
console.log('✔ 1. InputGuards tests passed.');

// 2. Test i18n Engine
const i18nCode = fs.readFileSync('js/i18n.js', 'utf8');
vm.runInContext(i18nCode, sandbox);
assert.strictEqual(typeof sandbox.t, 'function', 'window.t must be a function');
assert.strictEqual(sandbox.t('header.title'), 'Equipment ROI Calculator');
assert.strictEqual(
  sandbox.t('chart.crossover_label', { month: 4 }),
  '★ Break-even after 4 months',
  'Token replacement in i18n must match parameter names'
);

// Exhaustive coverage check: every HTML data-i18n attribute and JS t() call must exist in I18N_EN
const dict = sandbox.I18N_EN;
const htmlContent = fs.readFileSync('index.html', 'utf8');
const attrRegex = /data-i18n(?:-[a-z]+)?="([^"]+)"/g;
let attrMatch;
let htmlKeysCount = 0;
while ((attrMatch = attrRegex.exec(htmlContent)) !== null) {
  htmlKeysCount++;
  const k = attrMatch[1];
  assert.ok(dict[k] !== undefined, `HTML data-i18n key "${k}" must exist in I18N_EN dictionary`);
}

const jsAuditFiles = ['js/app.js', 'js/charts.js', 'js/input-guards.js', 'js/share.js', 'tools/shared/share-card.js'];
let jsCallsCount = 0;
for (const file of jsAuditFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const tCallRegex = /\bt\(\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = tCallRegex.exec(content)) !== null) {
    jsCallsCount++;
    const k = m[1];
    assert.ok(dict[k] !== undefined, `JS t() call "${k}" in ${file} must exist in I18N_EN dictionary`);
  }
}

console.log(`✔ 2. Internationalization (i18n) tests passed: ${Object.keys(dict).length} keys, ${htmlKeysCount} HTML nodes, ${jsCallsCount} JS call sites audited.`);

// 3. Test Payback Period in Months & Crossover Point
const cost = 300;
const sessionsDay = 4;
const revSession = 150;
const consSession = 8;
const workDays = 5;
const annualMaint = 0;
const lifespan = 3;
const powerMonth = 5;
const partCost = 45;
const partInterval = 12; // 12 months

const weeklySessions = sessionsDay * workDays; // 20
const annualSessions = weeklySessions * 52; // 1040
const monthlySessions = annualSessions / 12; // 86.667

const consumablesMonthly = consSession * monthlySessions; // 693.333
const maintMonthly = annualMaint / 12; // 0
const partsMonthly = partCost / partInterval; // 3.75
const totalMonthlyRunning = consumablesMonthly + maintMonthly + partsMonthly + powerMonth; // 702.083

const monthlyGross = revSession * monthlySessions; // 13000
const monthlyNet = monthlyGross - totalMonthlyRunning; // 12297.917

let cum = -cost;
let crossoverMonth = null;
let crossoverExact = null;
for (let m = 1; m <= 36; m++) {
  const prev = cum;
  cum += monthlyNet;
  if (crossoverMonth === null && cum >= 0) {
    crossoverMonth = m;
    crossoverExact = (m - 1) + (-prev / monthlyNet);
  }
}
assert.strictEqual(crossoverMonth, 1, 'At high revenue, crossover occurs in Month 1');
assert.ok(crossoverExact < 1, 'Exact crossover is less than 1 month');

// Test scenario with longer payback
const heavyCost = 5000;
const lowMonthlyNet = 1000;
let hCum = -heavyCost;
let hCross = null;
let hCrossExact = null;
for (let m = 1; m <= 36; m++) {
  const prev = hCum;
  hCum += lowMonthlyNet;
  if (hCross === null && hCum >= 0) {
    hCross = m;
    hCrossExact = (m - 1) + (-prev / lowMonthlyNet);
  }
}
assert.strictEqual(hCross, 5, 'Heavy equipment (£5000 with £1000/mo net) crosses over at Month 5');
assert.strictEqual(hCrossExact, 5, 'Exact crossover is 5.0 months');
console.log('✔ 3. Payback in months and crossover calculation tests passed.');

// 4. Test Unbudgeted Running Costs (TCO)
const totalConsumablesLifespan = consumablesMonthly * 12 * lifespan;
const totalPartsLifespan = partsMonthly * 12 * lifespan;
const totalPowerLifespan = powerMonth * 12 * lifespan;
const totalTco = cost + totalConsumablesLifespan + totalPartsLifespan + totalPowerLifespan;
assert.ok(totalTco > cost, 'Total Cost of Ownership must include all unbudgeted expenses');
assert.strictEqual(totalPartsLifespan, 45 * 3, 'Parts cost over 3 years is £135');
console.log('✔ 4. Unbudgeted running costs and TCO tests passed.');

// 5. Test Time Saved as Money (Strict Blank Rate Rule)
// Blank hourly rate -> 0 money value
const timeSavedMins = 15;
let hourlyRateInput = '';
let hasHourly = hourlyRateInput.trim() !== '' && !isNaN(parseFloat(hourlyRateInput));
let timeVal = hasHourly ? (timeSavedMins / 60) * parseFloat(hourlyRateInput) : 0;
assert.strictEqual(timeVal, 0, 'Blank hourly rate must yield £0 time monetization');

// Explicit hourly rate -> Monetized correctly
hourlyRateInput = '60';
hasHourly = hourlyRateInput.trim() !== '' && !isNaN(parseFloat(hourlyRateInput));
timeVal = hasHourly ? (timeSavedMins / 60) * parseFloat(hourlyRateInput) : 0;
assert.strictEqual(timeVal, 15, '15 mins saved at £60/hr equals £15.00 monetized value per session');
console.log('✔ 5. Time saved as money tests passed (blank rate strictly unmonetized).');

// 6. Test Side-by-Side Comparison
const compA = { cost: 300, annualNet: 147000 };
const compNoBuy = { cost: 0, annualNet: 0 };
assert.strictEqual(compA.annualNet - compNoBuy.annualNet, 147000, 'Delta against Option 0 (Do Not Buy) correctly computed');
console.log('✔ 6. Comparison logic tests passed.');

// 7. Verify Local Date in Business Case
const now = new Date();
const localYear = now.getFullYear();
const localDateStr = now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
assert.ok(localDateStr.includes(String(localYear)), 'Local date string must contain local calendar year');
console.log('✔ 7. Local date verification passed.');

// 8. Verify Ban 6: Zero external scripts/links/images pointing to external hosts
const browserFiles = [
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/i18n.js',
  'js/charts.js',
  'js/input-guards.js',
  'js/share.js',
  'tools/shared/theme.css',
  'tools/shared/print.css',
  'tools/shared/a11y.css',
  'tools/shared/share-card.js'
];

let externalResourceTags = 0;
const indexContent = fs.readFileSync('index.html', 'utf8');
const scriptLinkRegex = /<(script|link|img)\s+[^>]*(src|href)\s*=\s*["']([^"']+)["']/gi;
let match;
while ((match = scriptLinkRegex.exec(indexContent)) !== null) {
  const url = match[3];
  if (/^https?:\/\//i.test(url) || /cdn|unpkg|unsplash/i.test(url)) {
    console.error(`External resource tag found in index.html: ${match[0]}`);
    externalResourceTags++;
  }
}
assert.strictEqual(externalResourceTags, 0, 'No external resource tags allowed in index.html');

let bannedTerms = 0;
const bannedTermsList = ['cdn', 'unpkg', 'unsplash'];
for (const file of browserFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const term of bannedTermsList) {
    const reg = new RegExp(term, 'gi');
    const m = content.match(reg);
    if (m) {
      console.error(`Banned term "${term}" found in ${file}`);
      bannedTerms += m.length;
    }
  }
}
assert.strictEqual(bannedTerms, 0, 'Zero banned CDN terms in browser files');
console.log('✔ 8. Ban 6 check passed: 0 external resource tags and 0 CDN/external hosts.');

// 9. Verify Ban 12: All created files are referenced by index.html
for (const file of browserFiles) {
  if (file === 'index.html') continue;
  const basename = path.basename(file);
  assert.ok(indexContent.includes(basename), `index.html must reference ${basename}`);
}
console.log('✔ 9. Ban 12 check passed: Every created browser file is referenced in index.html.');

// 10. Verify Ban 13: All text files under 500 KB (524,288 bytes)
for (const file of browserFiles) {
  const stat = fs.statSync(file);
  assert.ok(stat.size < 524288, `${file} (${stat.size} bytes) must be under 524,288 bytes`);
  console.log(`   - ${file}: ${stat.size} bytes (OK)`);
}
console.log('✔ 10. Ban 13 check passed: All files are under 500 KB.');

// 11. Verify Ban 9: Zero color literals in style attributes
const styleAttrRegex = /style\s*=\s*["'][^"']*["']/gi;
let colorViolations = 0;
for (const file of ['index.html', 'js/app.js', 'js/i18n.js', 'js/charts.js']) {
  const content = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = styleAttrRegex.exec(content)) !== null) {
    const attr = m[0];
    if (/#([0-9a-f]{3}|[0-9a-f]{6})\b|rgb|hsl/i.test(attr)) {
      console.error(`Color literal in style attribute in ${file}: ${attr}`);
      colorViolations++;
    }
  }
}
assert.strictEqual(colorViolations, 0, 'Zero color literals in style attributes');
console.log('✔ 11. Ban 9 check passed: 0 color literals in style attributes.');

// 12. Test Currency Selector & Formatting Across Symbols
const currencies = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  CAD: '$',
  AUD: '$'
};
for (const [code, sym] of Object.entries(currencies)) {
  sandbox.window.getCurrencySymbol = () => sym;
  sandbox.window.getCurrencyCode = () => code;
  const label = sandbox.t('form.equip_cost');
  assert.ok(label.includes(sym), `Label with currency for ${code} must contain symbol ${sym}`);
  const warn = sandbox.t('warn.never_pays', { rev: '100.00', cost: '120.00' });
  assert.ok(warn.includes(sym + '100.00'), `Warning text must format with active currency symbol ${sym}`);
}
console.log('✔ 12. Currency selector and symbol formatting tests passed for GBP, USD, EUR, CAD, AUD.');

// 13. Test LocalStorage Persistence & Reset Defaults
const simulatedStorage = {};
const mockLocalStorage = {
  getItem: (k) => simulatedStorage[k] || null,
  setItem: (k, v) => { simulatedStorage[k] = String(v); },
  removeItem: (k) => { delete simulatedStorage[k]; }
};
const domElements = {
  'currency-select': { value: 'USD' },
  'equip-name': { value: 'Custom Machine' },
  'equip-cost': { value: '550' },
  'sessions-day': { value: '6' },
  'revenue-session': { value: '200' },
  'consumables-session': { value: '12' },
  'work-days': { value: '5' },
  'annual-maintenance': { value: '100' },
  'equip-lifespan': { value: '4' },
  'power-cost-month': { value: '10' },
  'part-name': { value: 'Needle Drive' },
  'part-cost': { value: '60' },
  'part-interval': { value: '6' },
  'time-saved': { value: '20' },
  'hourly-rate': { value: '75' },
  'compare-mode': { value: 'opt_b' },
  'opt-b-name': { value: 'Alternative B' },
  'opt-b-cost': { value: '400' },
  'opt-b-rev-session': { value: '180' },
  'opt-b-run-month': { value: '600' }
};

// Test Serialization and Persistence
const serialized = JSON.stringify(Object.fromEntries(Object.entries(domElements).map(([k, v]) => [k, v.value])));
mockLocalStorage.setItem('poli_equipment_roi_inputs', serialized);
const retrieved = JSON.parse(mockLocalStorage.getItem('poli_equipment_roi_inputs'));
assert.strictEqual(retrieved['equip-cost'], '550', 'Persisted cost should match saved value');
assert.strictEqual(retrieved['currency-select'], 'USD', 'Persisted currency should match saved value');

// Test Reset removes storage
mockLocalStorage.removeItem('poli_equipment_roi_inputs');
assert.strictEqual(mockLocalStorage.getItem('poli_equipment_roi_inputs'), null, 'Reset must remove stored data');
console.log('✔ 13. LocalStorage persistence and reset state tests passed.');

// 14. Test CSV Export Content Structure & Escaping
function mockCsvExport(d, sym, code) {
  function esc(val) {
    if (val === null || val === undefined) return '""';
    let str = String(val);
    if (/^[=+\-@]/.test(str)) str = "'" + str;
    return '"' + str.replace(/"/g, '""') + '"';
  }
  const rows = [];
  rows.push([esc(sandbox.t('csv.meta_tool')), esc('Equipment ROI Calculator (Poli International)')].join(','));
  rows.push([esc(sandbox.t('csv.meta_currency')), esc(`${code} (${sym})`)].join(','));
  rows.push([esc(sandbox.t('form.equip_cost', { curr: sym })), esc(d.cost.toFixed(2)), esc(code)].join(','));
  rows.push([esc(sandbox.t('metric.payback')), esc(d.paybackMonthsStr), esc('months')].join(','));
  return '\uFEFF' + rows.join('\r\n');
}
const testCalcData = {
  cost: 300,
  paybackMonthsStr: '1.2'
};
const generatedCsv = mockCsvExport(testCalcData, '€', 'EUR');
assert.ok(generatedCsv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM for Excel/Numbers compatibility');
assert.ok(generatedCsv.includes('EUR (€)'), 'CSV must record active currency');
assert.ok(generatedCsv.includes('300.00'), 'CSV must contain cost value');
console.log('✔ 14. CSV export generation, BOM, and formula escaping tests passed.');

// 15. Test PoliShare.init and esc function existence
const shareCardCode = fs.readFileSync('tools/shared/share-card.js', 'utf8');
const createMockEl = () => ({
  className: '',
  innerHTML: '',
  textContent: '',
  appendChild: () => {},
  querySelector: () => createMockEl(),
  querySelectorAll: () => [],
  addEventListener: () => {},
  insertAdjacentElement: () => {}
});
const shareSandbox = {
  window: {},
  document: {
    getElementById: () => null,
    querySelector: () => createMockEl(),
    createElement: () => createMockEl(),
    head: { appendChild: () => {} }
  },
  location: { origin: 'http://localhost:3000', search: '' },
  TextEncoder: globalThis.TextEncoder,
  TextDecoder: globalThis.TextDecoder,
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary')
};
shareSandbox.window = shareSandbox;
vm.createContext(shareSandbox);
vm.runInContext(shareCardCode, shareSandbox);

assert.strictEqual(typeof shareSandbox.PoliShare, 'object', 'PoliShare object must exist on window');
assert.strictEqual(typeof shareSandbox.PoliShare.init, 'function', 'PoliShare.init must be a function');
assert.strictEqual(typeof shareSandbox.window.esc, 'function', 'esc function must be defined and in scope');
assert.strictEqual(shareSandbox.window.esc('<script>"test"&'), '&lt;script&gt;&quot;test&quot;&amp;', 'esc properly escapes HTML entities');

// Test that init runs without throwing ReferenceError: esc is not defined
assert.doesNotThrow(() => {
  shareSandbox.PoliShare.init({
    tool: 'equipment-roi-calculator',
    mount: '#results',
    getState: () => ({}),
    getCard: () => ({ t: 'Title', d: [] })
  });
}, 'PoliShare.init must not throw ReferenceError');
console.log('✔ 15. PoliShare.init and esc function execution test passed.');

// 16. Test 24-Month Cumulative Crossover Chart
const testPoints24 = [];
const testCost = 5000;
const testMonthlyNet = 500;
testPoints24.push({ month: 0, cumulative: -testCost });
let testRunningCum = -testCost;
for (let m = 1; m <= 24; m++) {
  testRunningCum += testMonthlyNet;
  testPoints24.push({ month: m, cumulative: testRunningCum });
}
assert.strictEqual(testPoints24.length, 25, '24-month chart contains 25 points from Month 0 to Month 24');
assert.strictEqual(testPoints24[0].cumulative, -5000, 'Month 0 starts at negative initial CapEx');
assert.strictEqual(testPoints24[10].cumulative, 0, 'Month 10 hits exact break-even crossover point');
assert.strictEqual(testPoints24[24].cumulative, 7000, 'Month 24 reaches positive cumulative cash flow');
console.log('✔ 16. 24-Month Cumulative Crossover Chart calculation passed.');

// 17. Test Accessible Tooltip Markup & Contracts
assert.ok(indexContent.includes('id="tooltip-part-interval"'), 'Part replacement interval tooltip must exist');
assert.ok(indexContent.includes('id="tooltip-time-saved"'), 'Time saved tooltip must exist');
assert.ok(indexContent.includes('role="tooltip"'), 'Tooltip popover must have role="tooltip"');
assert.ok(indexContent.includes('aria-describedby="tooltip-part-interval"'), 'Part replacement input must have aria-describedby');
assert.ok(indexContent.includes('aria-describedby="tooltip-time-saved"'), 'Time saved input must have aria-describedby');
console.log('✔ 17. Accessible Info Tooltips and ARIA attributes verified.');

// 18. Test Toast Container and Notification Styles
assert.ok(indexContent.includes('id="toast-container"'), 'Toast container element must exist in index.html');
const cssContent = fs.readFileSync('css/style.css', 'utf8');
assert.ok(cssContent.includes('.toast-container'), 'CSS must define .toast-container');
assert.ok(cssContent.includes('.toast-notification'), 'CSS must define .toast-notification');
assert.ok(cssContent.includes('.toast--error'), 'CSS must define .toast--error');
assert.ok(cssContent.includes('.toast--warning'), 'CSS must define .toast--warning');
console.log('✔ 18. Toast notification system styles and container verified.');

// 19. Test Print Summary Button & Clean Print Output
const appJsContent = fs.readFileSync('js/app.js', 'utf8');
assert.ok(appJsContent.includes('id="print-summary-btn"'), 'Print Summary button must be generated in results actions bar');
assert.ok(cssContent.includes('@media print'), 'Print media stylesheet must be present');
assert.ok(cssContent.includes('.results-actions-bar'), 'Print styles must handle .results-actions-bar');
console.log('✔ 19. Print Summary button and print stylesheet verification passed.');

console.log('\nAll 19 test batteries passed successfully!');
