/**
 * Equipment ROI Calculator: V2 Core Application Logic
 * Integrates:
 * 1. Payback period in months with exact crossover month detection
 * 2. Unbudgeted running costs (consumables, power, periodic servicing, replacement parts with known life)
 * 3. Time saved as money (strictly unmonetized unless hourly rate is explicitly supplied)
 * 4. Side-by-side comparison including Option 0: Do Not Buy
 * 5. Printable lender/partner business case with local calendar date
 */
'use strict';

var G = InputGuards;
var t = window.t || function (k, p) { return (window.i18n && window.i18n.t) ? window.i18n.t(k, p) : k; };

// ── Currency Management ──
var CURRENCY_SYMBOLS = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  CAD: '$',
  AUD: '$'
};

var currencySelect = document.getElementById('currency-select');

function getCurrencyCode() {
  return (currencySelect && currencySelect.value) ? currencySelect.value : 'GBP';
}

function getCurrencySymbol() {
  var code = getCurrencyCode();
  return CURRENCY_SYMBOLS[code] || '£';
}

window.getCurrencySymbol = getCurrencySymbol;
window.getCurrencyCode = getCurrencyCode;

function fmt(n) {
  var sym = getCurrencySymbol();
  var prefix = n < 0 ? '-' + sym : sym;
  return prefix + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fmtInt(n) {
  var prefix = n < 0 ? '-' : '';
  return prefix + Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function getLocalDateString() {
  var now = new Date();
  try {
    return now.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {
    var y = now.getFullYear();
    var m = now.getMonth() + 1;
    var d = now.getDate();
    return y + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d);
  }
}

// ── Non-Intrusive Toast Notification System ──
function showToast(title, message, suggestion, type) {
  var container = document.getElementById('toast-container');
  if (!container) return;

  var existing = container.querySelectorAll('.toast-notification');
  if (existing.length >= 2) {
    existing[0].remove();
  }

  var toast = document.createElement('div');
  toast.className = 'toast-notification toast--' + (type || 'warning');
  toast.setAttribute('role', 'alert');

  var header = document.createElement('div');
  header.className = 'toast-header';

  var icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = type === 'error' ? '⚠️' : 'ℹ️';

  var titleEl = document.createElement('strong');
  titleEl.className = 'toast-title';
  titleEl.textContent = title;

  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'toast-close';
  closeBtn.setAttribute('aria-label', t('toast.close_aria'));
  closeBtn.textContent = '×';
  closeBtn.onclick = function () {
    toast.classList.add('toast--hiding');
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 280);
  };

  header.appendChild(icon);
  header.appendChild(titleEl);
  header.appendChild(closeBtn);
  toast.appendChild(header);

  var msgEl = document.createElement('div');
  msgEl.className = 'toast-msg';
  msgEl.textContent = message;
  toast.appendChild(msgEl);

  if (suggestion) {
    var suggEl = document.createElement('div');
    suggEl.className = 'toast-suggestion';
    suggEl.textContent = suggestion;
    toast.appendChild(suggEl);
  }

  container.appendChild(toast);

  setTimeout(function () {
    if (toast.parentNode) {
      toast.classList.add('toast--hiding');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 280);
    }
  }, 8500);
}

// ── LocalStorage Persistence & Field Reset ──
var STORAGE_KEY = 'poli_equipment_roi_inputs';
var TRACKED_FIELDS = [
  'currency-select',
  'equip-name',
  'equip-cost',
  'sessions-day',
  'revenue-session',
  'consumables-session',
  'work-days',
  'annual-maintenance',
  'equip-lifespan',
  'power-cost-month',
  'part-name',
  'part-cost',
  'part-interval',
  'time-saved',
  'hourly-rate',
  'compare-mode',
  'opt-b-name',
  'opt-b-cost',
  'opt-b-rev-session',
  'opt-b-run-month'
];

// Reset clears the form. The tool never puts a number in front of the user that the user did not choose.
var DEFAULT_VALUES = {
  'currency-select': 'GBP',
  'equip-name': '',
  'equip-cost': '',
  'sessions-day': '',
  'revenue-session': '',
  'consumables-session': '',
  'work-days': '',
  'annual-maintenance': '',
  'equip-lifespan': '',
  'power-cost-month': '',
  'part-name': '',
  'part-cost': '',
  'part-interval': '',
  'time-saved': '',
  'hourly-rate': '',
  'compare-mode': 'no_buy',
  'opt-b-name': '',
  'opt-b-cost': '',
  'opt-b-rev-session': '',
  'opt-b-run-month': ''
};

function saveInputs() {
  try {
    if (typeof localStorage === 'undefined') return;
    var data = {};
    for (var i = 0; i < TRACKED_FIELDS.length; i++) {
      var id = TRACKED_FIELDS[i];
      var el = document.getElementById(id);
      if (el) {
        data[id] = el.value;
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    var statusEl = document.getElementById('storage-status');
    if (statusEl) {
      statusEl.textContent = t('status.saved');
      statusEl.classList.add('visible');
      setTimeout(function () {
        statusEl.classList.remove('visible');
      }, 1500);
    }
  } catch (e) {}
}

function restoreInputs() {
  try {
    if (typeof localStorage === 'undefined') return false;
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    var data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return false;

    for (var i = 0; i < TRACKED_FIELDS.length; i++) {
      var id = TRACKED_FIELDS[i];
      if (Object.prototype.hasOwnProperty.call(data, id)) {
        var el = document.getElementById(id);
        if (el) {
          el.value = data[id];
        }
      }
    }

    if (optBFields && compareModeSelect) {
      if (compareModeSelect.value === 'opt_b') {
        optBFields.style.display = '';
      } else {
        optBFields.style.display = 'none';
      }
    }

    if (window.i18n && window.i18n.translateDOM) {
      window.i18n.translateDOM();
    }

    return true;
  } catch (e) {
    return false;
  }
}

var saveTimer = null;
function debouncedSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveInputs, 250);
}

// Option B toggle handling
var compareModeSelect = document.getElementById('compare-mode');
var optBFields = document.getElementById('opt-b-fields');
if (compareModeSelect && optBFields) {
  compareModeSelect.addEventListener('change', function () {
    if (this.value === 'opt_b') {
      optBFields.style.display = '';
    } else {
      optBFields.style.display = 'none';
    }
    debouncedSave();
  });
}

// Currency Selector Change Listener
if (currencySelect) {
  currencySelect.addEventListener('change', function () {
    if (window.i18n && window.i18n.translateDOM) {
      window.i18n.translateDOM();
    }
    if (results && results.style.display !== 'none' && !results.querySelector('.poli-err-card')) {
      calcBtn.click();
    }
    saveInputs();
  });
}

// Global auto-save listeners on form wrapper
var toolWrapper = document.querySelector('.tool-wrapper');
if (toolWrapper) {
  toolWrapper.addEventListener('input', debouncedSave);
  toolWrapper.addEventListener('change', debouncedSave);
}

// Reset All Fields Button
var resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
  resetBtn.addEventListener('click', function () {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {}

    for (var id in DEFAULT_VALUES) {
      var el = document.getElementById(id);
      if (el) {
        el.value = DEFAULT_VALUES[id];
      }
    }

    if (optBFields) optBFields.style.display = 'none';

    if (window.i18n && window.i18n.translateDOM) {
      window.i18n.translateDOM();
    }

    if (results) {
      results.style.display = 'none';
      results.innerHTML = '';
    }

    var statusEl = document.getElementById('storage-status');
    if (statusEl) {
      statusEl.textContent = t('status.reset_done');
      statusEl.classList.add('visible');
      setTimeout(function () {
        statusEl.classList.remove('visible');
        statusEl.textContent = '';
      }, 2500);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ── CSV Export Function ──
function exportResultsAsCsv(d) {
  if (!d) return;

  var sym = getCurrencySymbol();
  var code = getCurrencyCode();
  var now = new Date();
  var localDateStr = getLocalDateString();
  var y = now.getFullYear();
  var m = now.getMonth() + 1;
  var dt = now.getDate();
  var localIsoDate = y + '-' + (m < 10 ? '0' + m : m) + '-' + (dt < 10 ? '0' + dt : dt);

  function esc(val) {
    if (val === null || val === undefined) return '""';
    var str = String(val);
    if (/^[=+\-@]/.test(str)) {
      str = "'" + str;
    }
    return '"' + str.replace(/"/g, '""') + '"';
  }

  var lines = [];
  function row() {
    var cells = Array.prototype.slice.call(arguments);
    lines.push(cells.map(esc).join(','));
  }

  // Metadata
  row(t('csv.meta_tool'), 'Equipment ROI Calculator (Poli International)');
  row(t('csv.meta_date'), localDateStr);
  row(t('csv.meta_currency'), code + ' (' + sym + ')');
  row('');

  // 1. Input Parameters
  row(t('csv.section_inputs'));
  row(t('csv.col_param'), t('csv.col_val'), t('csv.col_unit'));
  row(t('form.equip_name'), d.equipName || t('case.default_asset_name'), '');
  row(t('form.equip_cost', { curr: sym }), d.cost.toFixed(2), code);
  row(t('form.sessions_day'), d.sessionsDay.toFixed(1), t('unit.per_day'));
  row(t('form.rev_session', { curr: sym }), d.revSession.toFixed(2), code);
  row(t('form.consumables_session', { curr: sym }), d.consSession.toFixed(2), code);
  row(t('form.work_days'), d.workDays.toFixed(0), 'days/week');
  row(t('form.annual_maintenance', { curr: sym }), d.annualMaint.toFixed(2), code + '/year');
  row(t('form.equip_lifespan'), d.lifespan.toFixed(0), 'years');
  row(t('form.power_cost', { curr: sym }), d.powerMonth.toFixed(2), code + '/month');
  row(t('form.part_name'), d.partName || 'None', '');
  row(t('form.part_cost', { curr: sym }), d.partCost.toFixed(2), code);
  row(t('form.part_interval'), d.partInterval.toFixed(0), 'months');
  row(t('form.time_saved'), d.timeSavedMins.toFixed(0), 'minutes/session');
  row(t('form.hourly_rate', { curr: sym }), d.hasHourlyRate ? d.hourlyRate.toFixed(2) : t('csv.unmonetized'), d.hasHourlyRate ? code + '/hr' : '');
  row(t('form.compare_against'), d.compareMode === 'opt_b' ? t('form.opt_b_purchase') : t('form.opt_no_buy'), '');
  if (d.compareMode === 'opt_b') {
    row(t('form.opt_b_name'), d.optBName || t('compare.opt_b_default'), '');
    row(t('form.opt_b_cost', { curr: sym }), d.optBCost.toFixed(2), code);
    row(t('form.opt_b_rev_session', { curr: sym }), d.optBRevSession.toFixed(2), code);
    row(t('form.opt_b_run_month', { curr: sym }), d.optBRunMonth.toFixed(2), code + '/month');
  }
  row('');

  // 2. Results
  row(t('csv.section_results'));
  row(t('csv.col_metric'), t('csv.col_val'), t('csv.col_unit'));
  row(t('metric.payback'), d.paybackMonthsStr, 'months');
  row(t('metric.breakeven'), d.sessionsToBreakeven, 'client procedures');
  row(t('metric.annual_net'), d.annualNetCash.toFixed(2), code + '/year');
  row(t('metric.tco_lifespan'), d.totalTco.toFixed(2), code + ' (' + d.lifespan + ' yr lifespan)');
  row(t('compare.row_running_cost'), d.annualRunningCost.toFixed(2), code + '/year');
  row(t('case.monthly_net_contrib'), d.monthlyNetCash.toFixed(2), code + '/month');
  row(t('case.kpi_total_profit'), d.lifespanNetProfit.toFixed(2), code);
  row(t('case.kpi_total_roi'), d.totalRoiPct, '%');
  if (d.timeSavedMins > 0) {
    row(t('csv.time_saved_hours'), d.annualHoursSaved.toFixed(1), 'hours/year');
    if (d.hasHourlyRate && d.hourlyRate > 0) {
      row(t('csv.time_saved_monetized'), d.annualTimeValue.toFixed(2), code + '/year');
    }
  }
  row('');

  // 3. TCO Breakdown
  row(t('csv.section_tco'));
  row('Expense Category', t('csv.col_monthly'), t('csv.col_annual'), t('csv.col_lifespan'), t('csv.col_pct_tco'));
  row(t('chart.lbl_purchase'), '—', '—', d.cost.toFixed(2), ((d.cost / d.totalTco) * 100).toFixed(1) + '%');
  row(t('tco.consumables_lbl'), d.consumablesMonthly.toFixed(2), (d.consumablesMonthly * 12).toFixed(2), d.totalConsumablesLifespan.toFixed(2), ((d.totalConsumablesLifespan / d.totalTco) * 100).toFixed(1) + '%');
  row(t('tco.parts_lbl'), d.partsMonthly.toFixed(2), (d.partsMonthly * 12).toFixed(2), d.totalPartsLifespan.toFixed(2), ((d.totalPartsLifespan / d.totalTco) * 100).toFixed(1) + '%');
  row(t('tco.servicing_lbl'), d.maintenanceMonthly.toFixed(2), d.annualMaint.toFixed(2), d.totalMaintLifespan.toFixed(2), ((d.totalMaintLifespan / d.totalTco) * 100).toFixed(1) + '%');
  row(t('tco.power_lbl'), d.powerMonthly.toFixed(2), (d.powerMonthly * 12).toFixed(2), d.totalPowerLifespan.toFixed(2), ((d.totalPowerLifespan / d.totalTco) * 100).toFixed(1) + '%');
  row(t('metric.tco_lifespan'), d.totalMonthlyRunningCost.toFixed(2), (d.totalMonthlyRunningCost * 12).toFixed(2), d.totalTco.toFixed(2), '100.0%');
  row('');

  // 4. Comparison
  row(t('csv.section_compare'));
  row(t('compare.col_metric'), d.compA.name, d.compB.name, t('compare.col_net_diff'));
  row(t('compare.row_capex'), d.compA.cost.toFixed(2), d.compB.cost.toFixed(2), (d.compA.cost - d.compB.cost).toFixed(2));
  row(t('compare.row_running_cost'), d.compA.annualRunning.toFixed(2), d.compB.annualRunning.toFixed(2), (d.compA.annualRunning - d.compB.annualRunning).toFixed(2));
  row(t('compare.row_net_cash'), d.compA.annualNet.toFixed(2), d.compB.annualNet.toFixed(2), (d.compA.annualNet - d.compB.annualNet).toFixed(2));
  row(t('compare.row_three_year_net'), d.compA.threeYearNet.toFixed(2), d.compB.threeYearNet.toFixed(2), (d.compA.threeYearNet - d.compB.threeYearNet).toFixed(2));
  row(t('compare.row_payback_horizon'), d.compA.paybackMonths, d.compB.paybackMonths, (d.crossoverExact !== null ? d.crossoverExact.toFixed(1) : '—'));
  row('');

  // 5. Sensitivity Analysis
  row(t('csv.section_sensitivity'));
  row(t('case.sens_col_scenario'), t('case.sens_col_volume'), t('case.sens_col_net_cash') + ' (' + code + '/mo)', t('case.sens_col_payback') + ' (months)');
  row(t('case.sens_base_case'), d.sessionsDay.toFixed(1) + ' sessions/day', d.monthlyNetCash.toFixed(2), d.crossoverExact !== null ? d.crossoverExact.toFixed(1) : '>36');
  row(t('case.sens_slowdown'), d.conservativeSessions.toFixed(1) + ' sessions/day', d.conservativeNetMonth.toFixed(2), d.conservativePayback);
  row(t('case.sens_stress'), d.downsideSessions.toFixed(1) + ' sessions/day', d.downsideNetMonth.toFixed(2), d.downsidePayback);

  var csvString = '\uFEFF' + lines.join('\r\n');
  var blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.setAttribute('href', url);
  var safeTitle = (d.equipName || 'equipment').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  link.setAttribute('download', safeTitle + '-roi-' + localIsoDate + '.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 500);
}

// Export functions for testing & global access
if (typeof window !== 'undefined') {
  window.saveInputs = saveInputs;
  window.restoreInputs = restoreInputs;
  window.DEFAULT_VALUES = DEFAULT_VALUES;
  window.exportResultsAsCsv = exportResultsAsCsv;
}

// Calculate Action
var calcBtn = document.getElementById('calc-btn');
var results = document.getElementById('results');
var lastCalcData = null;

calcBtn.addEventListener('click', function () {
  // Option A Inputs
  var equipName       = (document.getElementById('equip-name').value || '').trim();
  var cost            = G.safeFloat(document.getElementById('equip-cost').value, NaN);
  var sessionsDay     = G.safeFloat(document.getElementById('sessions-day').value, NaN);
  var revSession      = G.safeFloat(document.getElementById('revenue-session').value, NaN);
  var consSession     = G.safeFloat(document.getElementById('consumables-session').value, 0);
  var workDays        = G.safeFloat(document.getElementById('work-days').value, NaN);
  var annualMaint     = G.safeFloat(document.getElementById('annual-maintenance').value, 0);
  var lifespan        = G.safeFloat(document.getElementById('equip-lifespan').value, NaN);

  // Unbudgeted Costs
  var powerMonth      = G.safeFloat(document.getElementById('power-cost-month').value, 0);
  var partName        = (document.getElementById('part-name').value || '').trim();
  var partCost        = G.safeFloat(document.getElementById('part-cost').value, 0);
  var partInterval    = G.safeFloat(document.getElementById('part-interval').value, 0);

  // Time Saved as Money
  var timeSavedMins   = G.safeFloat(document.getElementById('time-saved').value, 0);
  var hourlyRateRaw   = document.getElementById('hourly-rate').value.trim();
  var hasHourlyRate   = hourlyRateRaw !== '' && !isNaN(parseFloat(hourlyRateRaw));
  var hourlyRate      = hasHourlyRate ? G.safeFloat(hourlyRateRaw, 0) : null;

  // Compare Option Mode
  var compareMode     = compareModeSelect ? compareModeSelect.value : 'no_buy';
  var optBName        = document.getElementById('opt-b-name') ? document.getElementById('opt-b-name').value.trim() : '';
  var optBCost        = document.getElementById('opt-b-cost') ? G.safeFloat(document.getElementById('opt-b-cost').value, NaN) : NaN;
  var optBRevSession  = document.getElementById('opt-b-rev-session') ? G.safeFloat(document.getElementById('opt-b-rev-session').value, NaN) : NaN;
  var optBRunMonth    = document.getElementById('opt-b-run-month') ? G.safeFloat(document.getElementById('opt-b-run-month').value, 0) : 0;

  // ── 1. Validation ──
  var errors = [];
  if (!G.isValid(cost) || cost < 0) errors.push(t('err.invalid_cost'));
  if (!G.isValid(sessionsDay) || sessionsDay <= 0) errors.push(t('err.invalid_sessions'));
  if (!G.isValid(revSession) || revSession < 0) errors.push(t('err.invalid_revenue'));
  if (sessionsDay > 15) errors.push(t('err.unusual_sessions'));
  // Nothing is assumed for the user: a blank or impossible figure is an error, not a default.
  if (!G.isValid(workDays) || workDays < 1 || workDays > 7) errors.push(t('err.invalid_work_days'));
  if (!G.isValid(lifespan) || lifespan < 1 || lifespan > 30) errors.push(t('err.invalid_lifespan'));
  if (partCost > 0 && (!G.isValid(partInterval) || partInterval < 1 || partInterval > 60)) errors.push(t('err.invalid_part_interval'));
  if (compareMode === 'opt_b' && (!G.isValid(optBCost) || optBCost <= 0 || !G.isValid(optBRevSession) || optBRevSession <= 0)) errors.push(t('err.invalid_opt_b'));

  if (errors.length) {
    results.style.display = '';
    results.innerHTML = G.formatErrorList(errors);
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  // ── 2. Operational Volume ──
  var weeklySessions  = sessionsDay * workDays;
  var annualSessions  = weeklySessions * 52;
  var monthlySessions = annualSessions / 12;

  // ── 3. Unbudgeted Running Cost Calculations ──
  var consumablesMonthly = consSession * monthlySessions;
  var maintenanceMonthly = annualMaint / 12;
  var partsMonthly       = (partInterval > 0 && partCost > 0) ? (partCost / partInterval) : 0;
  var powerMonthly       = powerMonth;

  var totalMonthlyRunningCost = consumablesMonthly + maintenanceMonthly + partsMonthly + powerMonthly;
  var annualRunningCost       = totalMonthlyRunningCost * 12;
  var runningCostPerSession   = monthlySessions > 0 ? (totalMonthlyRunningCost / monthlySessions) : 0;

  // Gross Revenue & Cash Flow
  var monthlyGrossRevenue     = revSession * monthlySessions;
  var annualGrossRevenue      = revSession * annualSessions;
  var monthlyNetCash          = monthlyGrossRevenue - totalMonthlyRunningCost;
  var annualNetCash           = monthlyNetCash * 12;

  // Cross-field: Net cash check
  if (monthlyNetCash <= 0) {
    showToast(
      t('toast.negative_roi_title'),
      t('toast.negative_roi_msg', {
        running: fmt(totalMonthlyRunningCost),
        rev: fmt(monthlyGrossRevenue)
      }),
      t('toast.negative_roi_suggestion'),
      'error'
    );
    results.style.display = '';
    results.innerHTML = G.formatWarning(
      t('warn.never_pays', { rev: revSession.toFixed(2), cost: runningCostPerSession.toFixed(2) })
    );
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  // Cross-field: High maintenance check
  var totalMaintAnnual = annualMaint + (partsMonthly * 12);
  var maintWarn = '';
  if (cost > 0 && (totalMaintAnnual / cost) > 0.5) {
    maintWarn = G.formatWarning(t('warn.high_maint'));
  }

  // ── 4. Time Saved as Money ──
  var annualHoursSaved = (timeSavedMins / 60) * annualSessions;
  var monthlyHoursSaved = annualHoursSaved / 12;
  var timeMonetizedPerSession = (hasHourlyRate && hourlyRate > 0) ? ((timeSavedMins / 60) * hourlyRate) : 0;
  var annualTimeValue = timeMonetizedPerSession * annualSessions;
  var monthlyTimeValue = annualTimeValue / 12;

  // ── 5. Payback Period & Crossover Month Detection ──
  var totalMonths = Math.min(60, Math.ceil(lifespan * 12));
  var monthlySchedule = [];
  var cumulative = -cost;
  var crossoverMonth = null;
  var crossoverExact = null;

  for (var m = 1; m <= totalMonths; m++) {
    var prevCum = cumulative;
    cumulative += monthlyNetCash;

    if (crossoverMonth === null && cumulative >= 0) {
      crossoverMonth = m;
      var fraction = monthlyNetCash > 0 ? (-prevCum / monthlyNetCash) : 0;
      crossoverExact = (m - 1) + fraction;
    }

    monthlySchedule.push({
      month: m,
      year: Math.ceil(m / 12),
      net: monthlyNetCash,
      cumulative: cumulative,
      paidOff: cumulative >= 0
    });
  }

  var paybackMonthsStr = '';
  if (crossoverExact !== null) {
    paybackMonthsStr = crossoverExact < 1
      ? t('payback.less_than_one')
      : t('payback.months_exact', { crossover: crossoverExact.toFixed(1), month: crossoverMonth });

    if (crossoverExact > (lifespan * 12) || crossoverExact > 36) {
      showToast(
        t('toast.long_payback_title'),
        t('toast.long_payback_msg', {
          payback: crossoverExact.toFixed(1),
          lifespan: lifespan
        }),
        t('toast.long_payback_suggestion'),
        'warning'
      );
    }
  } else {
    paybackMonthsStr = t('payback.greater_than_total', { total: totalMonths });
  }

  var sessionsToBreakeven = Math.ceil(cost / (revSession - runningCostPerSession));

  // Total Cost of Ownership (TCO) over lifespan
  var totalConsumablesLifespan = consumablesMonthly * 12 * lifespan;
  var totalPartsLifespan       = partsMonthly * 12 * lifespan;
  var totalMaintLifespan       = maintenanceMonthly * 12 * lifespan;
  var totalPowerLifespan       = powerMonthly * 12 * lifespan;
  var totalTco                 = cost + totalConsumablesLifespan + totalPartsLifespan + totalMaintLifespan + totalPowerLifespan;

  var lifespanNetProfit = (annualNetCash * lifespan) - cost;
  var totalRoiPct = cost > 0 ? ((lifespanNetProfit / cost) * 100).toFixed(0) + '%' : '—';

  // ── 6. Side-by-Side Comparison Computation ──
  var compA = {
    name: equipName || t('compare.opt_a_default'),
    cost: cost,
    annualRunning: annualRunningCost,
    annualNet: annualNetCash,
    threeYearNet: (annualNetCash * 3) - cost,
    paybackMonths: crossoverExact !== null ? crossoverExact.toFixed(1) : '>36'
  };

  var compB = {};
  if (compareMode === 'no_buy') {
    compB = {
      name: t('compare.opt_0_name'),
      cost: 0,
      annualRunning: 0,
      annualNet: 0,
      threeYearNet: 0,
      paybackMonths: 'N/A'
    };
  } else {
    var optBWeekly = sessionsDay * workDays;
    var optBAnnualSessions = optBWeekly * 52;
    var optBGrossAnnual = optBRevSession * optBAnnualSessions;
    var optBRunAnnual = optBRunMonth * 12;
    var optBNetAnnual = optBGrossAnnual - optBRunAnnual;
    var optBPayback = (optBNetAnnual / 12) > 0 ? (optBCost / (optBNetAnnual / 12)).toFixed(1) : '>36';

    compB = {
      name: optBName || t('compare.opt_b_default'),
      cost: optBCost,
      annualRunning: optBRunAnnual,
      annualNet: optBNetAnnual,
      threeYearNet: (optBNetAnnual * 3) - optBCost,
      paybackMonths: optBPayback
    };
  }

  // Save complete state for CSV export
  lastCalcData = {
    equipName: equipName,
    cost: cost,
    sessionsDay: sessionsDay,
    revSession: revSession,
    consSession: consSession,
    workDays: workDays,
    annualMaint: annualMaint,
    lifespan: lifespan,
    powerMonth: powerMonth,
    partName: partName,
    partCost: partCost,
    partInterval: partInterval,
    timeSavedMins: timeSavedMins,
    hasHourlyRate: hasHourlyRate,
    hourlyRate: hourlyRate,
    compareMode: compareMode,
    optBName: optBName,
    optBCost: optBCost,
    optBRevSession: optBRevSession,
    optBRunMonth: optBRunMonth,
    paybackMonthsStr: paybackMonthsStr,
    crossoverMonth: crossoverMonth,
    crossoverExact: crossoverExact,
    sessionsToBreakeven: sessionsToBreakeven,
    annualNetCash: annualNetCash,
    monthlyNetCash: monthlyNetCash,
    totalTco: totalTco,
    annualRunningCost: annualRunningCost,
    runningCostPerSession: runningCostPerSession,
    totalMonthlyRunningCost: totalMonthlyRunningCost,
    lifespanNetProfit: lifespanNetProfit,
    totalRoiPct: totalRoiPct,
    annualHoursSaved: annualHoursSaved,
    annualTimeValue: annualTimeValue,
    consumablesMonthly: consumablesMonthly,
    maintenanceMonthly: maintenanceMonthly,
    partsMonthly: partsMonthly,
    powerMonthly: powerMonthly,
    totalConsumablesLifespan: totalConsumablesLifespan,
    totalPartsLifespan: totalPartsLifespan,
    totalMaintLifespan: totalMaintLifespan,
    totalPowerLifespan: totalPowerLifespan,
    compA: compA,
    compB: compB,
    conservativeSessions: conservativeSessions,
    conservativeNetMonth: conservativeNetMonth,
    conservativePayback: conservativePayback,
    downsideSessions: downsideSessions,
    downsideNetMonth: downsideNetMonth,
    downsidePayback: downsidePayback
  };

  // ── 7. Render Output Dashboard ──
  var html = '';

  // Results Actions Bar (Download CSV & Print Summary)
  html += '<div class="results-actions-bar">';
  html += '  <button id="download-csv-btn" class="secondary-btn download-csv-btn" type="button">' + t('btn.download_csv') + '</button>';
  html += '  <button id="print-summary-btn" class="secondary-btn print-summary-btn" type="button">' + t('btn.print_summary') + '</button>';
  html += '</div>';

  // Warnings if any
  if (maintWarn) html += maintWarn;

  // Primary Metrics Row
  html += '<div class="results-row">';
  html += '  <div class="metric-card">';
  html += '    <div class="metric-label">' + t('metric.payback') + '</div>';
  html += '    <div class="metric-value" id="res-payback">' + paybackMonthsStr + '</div>';
  html += '    <div class="metric-sub">' + (crossoverMonth ? t('metric.crossover_sub', { month: crossoverMonth }) : t('metric.exceeds_sub')) + '</div>';
  html += '  </div>';

  html += '  <div class="metric-card">';
  html += '    <div class="metric-label">' + t('metric.breakeven') + '</div>';
  html += '    <div class="metric-value" id="res-breakeven">' + fmtInt(sessionsToBreakeven) + '</div>';
  html += '    <div class="metric-sub">' + t('metric.total_procedures_sub') + '</div>';
  html += '  </div>';

  html += '  <div class="metric-card">';
  html += '    <div class="metric-label">' + t('metric.annual_net') + '</div>';
  html += '    <div class="metric-value" id="res-annual-net">' + fmt(annualNetCash) + '</div>';
  html += '    <div class="metric-sub">' + t('metric.annual_net_sub') + '</div>';
  html += '  </div>';

  html += '  <div class="metric-card">';
  html += '    <div class="metric-label">' + t('metric.tco_lifespan') + '</div>';
  html += '    <div class="metric-value" id="res-tco">' + fmt(totalTco) + '</div>';
  html += '    <div class="metric-sub">' + t('metric.session_true_cost_sub', { cost: runningCostPerSession.toFixed(2) }) + '</div>';
  html += '  </div>';
  html += '</div>';

  // Feature 1: 24-Month Crossover SVG Chart Card
  html += '<div class="calc-card">';
  html += '  <div class="card-title-row">';
  html += '    <h3>' + t('chart.payback_24m_title') + '</h3>';
  html += '    <span class="badge-tag">' + (crossoverExact !== null && crossoverExact <= 24 ? t('chart.crossover_badge', { month: crossoverExact.toFixed(1) }) : t('chart.crossover_badge', { month: (crossoverMonth || '—') })) + '</span>';
  html += '  </div>';
  html += '  <p class="section-desc">' + t('chart.payback_24m_desc') + '</p>';
  html += '  <div id="crossover-chart-container" class="svg-container"></div>';
  html += '</div>';

  // Feature 2: Unbudgeted Running Costs TCO Card
  html += '<div class="calc-card">';
  html += '  <h3>' + t('tco.heading') + '</h3>';
  html += '  <p class="section-desc">' + t('tco.summary_prose', { lifespan: lifespan, cost: fmtInt(cost), pct: ((cost / totalTco) * 100).toFixed(0) }) + '</p>';
  html += '  <div id="tco-chart-container" class="svg-container"></div>';
  html += '  <div class="tco-details-grid">';
  html += '    <div class="tco-pill"><strong>' + t('tco.consumables_lbl') + '</strong> ' + fmt(totalConsumablesLifespan) + ' (' + ((totalConsumablesLifespan / totalTco) * 100).toFixed(0) + '%)</div>';
  html += '    <div class="tco-pill"><strong>' + t('tco.parts_lbl') + '</strong> ' + fmt(totalPartsLifespan) + ' (' + ((totalPartsLifespan / totalTco) * 100).toFixed(0) + '%)</div>';
  html += '    <div class="tco-pill"><strong>' + t('tco.servicing_lbl') + '</strong> ' + fmt(totalMaintLifespan) + ' (' + ((totalMaintLifespan / totalTco) * 100).toFixed(0) + '%)</div>';
  html += '    <div class="tco-pill"><strong>' + t('tco.power_lbl') + '</strong> ' + fmt(totalPowerLifespan) + ' (' + ((totalPowerLifespan / totalTco) * 100).toFixed(0) + '%)</div>';
  html += '  </div>';
  html += '</div>';

  // Feature 3: Time Saved as Money Section
  html += '<div class="calc-card">';
  html += '  <h3>' + t('time.heading') + '</h3>';
  if (hasHourlyRate && hourlyRate > 0 && timeSavedMins > 0) {
    html += '  <div class="callout callout--success">';
    html += '    <strong>' + t('time.monetized_title') + '</strong> ' + t('time.monetized_prose', {
      mins: timeSavedMins,
      rate: hourlyRate.toFixed(2),
      perSession: fmt(timeMonetizedPerSession),
      annualVal: fmt(annualTimeValue),
      hours: annualHoursSaved.toFixed(0)
    });
    var timeAdjustedMonthlyNet = monthlyNetCash + monthlyTimeValue;
    var timeAdjustedPayback = (cost / timeAdjustedMonthlyNet).toFixed(1);
    html += '    <div class="callout-sub">' + t('time.adjusted_payback_lbl') + ' <strong>' + t('time.months_exact', { months: timeAdjustedPayback }) + '</strong> ' + t('time.compared_to_cash', { cashPayback: (crossoverExact ? crossoverExact.toFixed(1) : '—') }) + '</div>';
    html += '  </div>';
  } else if (timeSavedMins > 0) {
    html += '  <div class="callout callout--neutral">';
    html += '    <strong>' + t('time.unmonetized_title') + '</strong> ' + t('time.unmonetized_prose', {
      mins: timeSavedMins,
      hours: annualHoursSaved.toFixed(0)
    });
    html += '  </div>';
  } else {
    html += '  <p class="section-desc">' + t('time.none_specified') + '</p>';
  }
  html += '</div>';

  // Feature 4: Side-by-Side Comparison
  html += '<div class="calc-card">';
  html += '  <div class="card-title-row">';
  html += '    <h3>' + t('compare.heading') + '</h3>';
  html += '    <span class="badge-tag">' + (compareMode === 'no_buy' ? t('compare.badge_vs_no_buy') : t('compare.badge_vs_opt_b')) + '</span>';
  html += '  </div>';
  html += '  <div id="compare-chart-container" class="svg-container"></div>';

  html += '  <div class="comparison-table-wrapper">';
  html += '    <table class="data-table">';
  html += '      <thead>';
  html += '        <tr>';
  html += '          <th>' + t('compare.col_metric') + '</th>';
  html += '          <th>' + compA.name + '</th>';
  html += '          <th>' + compB.name + '</th>';
  html += '          <th>' + t('compare.col_net_diff') + '</th>';
  html += '        </tr>';
  html += '      </thead>';
  html += '      <tbody>';
  html += '        <tr><td>' + t('compare.row_capex') + '</td><td>' + fmt(compA.cost) + '</td><td>' + fmt(compB.cost) + '</td><td>' + fmt(compA.cost - compB.cost) + '</td></tr>';
  html += '        <tr><td>' + t('compare.row_running_cost') + '</td><td>' + fmt(compA.annualRunning) + '</td><td>' + fmt(compB.annualRunning) + '</td><td>' + fmt(compA.annualRunning - compB.annualRunning) + '</td></tr>';
  html += '        <tr><td>' + t('compare.row_net_cash') + '</td><td>' + fmt(compA.annualNet) + '</td><td>' + fmt(compB.annualNet) + '</td><td>' + (compA.annualNet - compB.annualNet >= 0 ? '+' : '') + fmt(compA.annualNet - compB.annualNet) + '</td></tr>';
  html += '        <tr><td>' + t('compare.row_three_year_net') + '</td><td>' + fmt(compA.threeYearNet) + '</td><td>' + fmt(compB.threeYearNet) + '</td><td>' + (compA.threeYearNet - compB.threeYearNet >= 0 ? '+' : '') + fmt(compA.threeYearNet - compB.threeYearNet) + '</td></tr>';
  html += '        <tr><td>' + t('compare.row_payback_horizon') + '</td><td>' + compA.paybackMonths + ' ' + t('unit.mos') + '</td><td>' + (compB.paybackMonths !== 'N/A' ? compB.paybackMonths + ' ' + t('unit.mos') : t('compare.zero_capex')) + '</td><td>' + (crossoverExact ? (crossoverExact.toFixed(1) + ' ' + t('unit.mos')) : '—') + '</td></tr>';
  html += '      </tbody>';
  html += '    </table>';
  html += '  </div>';

  var deltaAnnual = compA.annualNet - compB.annualNet;
  html += '  <div class="verdict-banner">';
  if (compareMode === 'no_buy') {
    html += '    <strong>' + t('compare.verdict_context_title') + '</strong> ' + t('compare.verdict_no_buy_prose', { delta: fmt(deltaAnnual), payback: paybackMonthsStr });
  } else {
    var winA = compA.threeYearNet >= compB.threeYearNet;
    html += '    <strong>' + t('compare.verdict_opt_b_title') + '</strong> ' + t('compare.verdict_opt_b_prose', {
      winner: (winA ? compA.name : compB.name),
      delta: fmt(Math.abs(compA.threeYearNet - compB.threeYearNet))
    });
  }
  html += '  </div>';
  html += '</div>';

  // Month-by-Month Schedule Accordion
  html += '<div class="calc-card">';
  html += '  <div class="card-title-row">';
  html += '    <h3>' + t('sched.heading') + '</h3>';
  html += '    <button id="toggle-schedule-btn" class="secondary-btn" type="button">' + t('sched.toggle_btn') + '</button>';
  html += '  </div>';
  html += '  <div id="schedule-container" class="detail-table" style="max-height:300px;overflow-y:auto;display:none;">';
  html += '    <table class="data-table">';
  html += '      <thead><tr><th>' + t('sched.col_month') + '</th><th>' + t('sched.col_monthly_net') + '</th><th>' + t('sched.col_cumulative_cash') + '</th><th>' + t('sched.col_status') + '</th></tr></thead>';
  html += '      <tbody>';
  for (var s = 0; s < monthlySchedule.length; s++) {
    var row = monthlySchedule[s];
    var isCross = row.month === crossoverMonth;
    var rowClass = isCross ? ' class="highlight-crossover"' : '';
    var statusText = row.paidOff
      ? (isCross ? t('sched.status_crossover') : t('sched.status_profitable', { amount: fmt(row.cumulative) }))
      : t('sched.status_recovering', { amount: fmt(Math.abs(row.cumulative)) });
    html += '      <tr' + rowClass + '><td>' + t('sched.row_month', { month: row.month }) + '</td><td>' + fmt(row.net) + '</td><td>' + fmt(row.cumulative) + '</td><td>' + statusText + '</td></tr>';
  }
  html += '      </tbody>';
  html += '    </table>';
  html += '  </div>';
  html += '</div>';

  // Feature 5: Printable Business Case for Partner or Lender
  var localDate = getLocalDateString();
  var conservativeSessions = Math.max(0.5, sessionsDay * 0.75);
  var conservativeNetMonth = (revSession - runningCostPerSession) * (conservativeSessions * workDays * 4.333) - (powerMonthly + maintenanceMonthly + partsMonthly);
  var conservativePayback = conservativeNetMonth > 0 ? (cost / conservativeNetMonth).toFixed(1) : '>36';

  var downsideSessions = Math.max(0.5, sessionsDay * 0.5);
  var downsideNetMonth = (revSession - runningCostPerSession) * (downsideSessions * workDays * 4.333) - (powerMonthly + maintenanceMonthly + partsMonthly);
  var downsidePayback = downsideNetMonth > 0 ? (cost / downsideNetMonth).toFixed(1) : '>36';

  html += '<div class="calc-card business-case-card" id="business-case">';
  html += '  <div class="business-case-header">';
  html += '    <div class="case-badge">' + t('case.badge') + '</div>';
  html += '    <h2>' + t('case.doc_title') + '</h2>';
  html += '    <p class="case-subtitle">' + t('case.prepared_for') + '</p>';
  html += '    <div class="case-meta">';
  html += '      <span><strong>' + t('case.date_label') + '</strong> ' + localDate + '</span> | ';
  html += '      <span><strong>' + t('case.item_name') + '</strong> ' + (equipName || t('case.default_asset_name')) + '</span>';
  html += '    </div>';
  html += '  </div>';

  html += '  <div class="case-section">';
  html += '    <h3>' + t('case.investment_summary') + '</h3>';
  html += '    <div class="case-summary-grid">';
  html += '      <div class="case-box"><div class="case-box__lbl">' + t('case.capital_required') + '</div><div class="case-box__val">' + fmt(cost) + '</div></div>';
  html += '      <div class="case-box"><div class="case-box__lbl">' + t('case.expected_payback') + '</div><div class="case-box__val">' + paybackMonthsStr + '</div></div>';
  html += '      <div class="case-box"><div class="case-box__lbl">' + t('case.monthly_net_contrib') + '</div><div class="case-box__val">' + fmt(monthlyNetCash) + '</div></div>';
  html += '      <div class="case-box"><div class="case-box__lbl">' + t('case.annual_net_profit') + '</div><div class="case-box__val">' + fmt(annualNetCash) + '</div></div>';
  html += '    </div>';
  html += '  </div>';

  html += '  <div class="case-section">';
  html += '    <h3>' + t('case.breakdown_title') + '</h3>';
  html += '    <ul class="case-list">';
  html += '      <li>' + t('case.list_capex') + ' <strong>' + fmt(cost) + '</strong></li>';
  html += '      <li>' + t('case.list_consumables', { cost: fmt(consSession) }) + ' <strong>' + fmt(consumablesMonthly) + t('unit.per_month') + '</strong> (' + fmt(consumablesMonthly * 12) + t('unit.per_year') + ')</li>';
  html += '      <li>' + t('case.list_power') + ' <strong>' + fmt(powerMonthly) + t('unit.per_month') + '</strong> (' + fmt(powerMonthly * 12) + t('unit.per_year') + ')</li>';
  html += '      <li>' + t('case.list_maintenance') + ' <strong>' + fmt(maintenanceMonthly) + t('unit.per_month') + '</strong> (' + fmt(annualMaint) + t('unit.per_year') + ')</li>';
  if (partsMonthly > 0) {
    html += '      <li>' + t('case.list_parts', { partName: (partName || t('case.default_part_name')), interval: partInterval }) + ' <strong>' + fmt(partsMonthly) + t('unit.per_month') + '</strong></li>';
  }
  html += '      <li>' + t('case.list_total_overhead') + ' <strong>' + fmt(totalMonthlyRunningCost) + t('unit.per_month') + '</strong></li>';
  html += '      <li>' + t('case.list_breakeven_threshold') + ' <strong>' + fmtInt(sessionsToBreakeven) + ' ' + t('case.total_client_procedures') + '</strong></li>';
  html += '    </ul>';
  html += '  </div>';

  html += '  <div class="case-section">';
  html += '    <h3>' + t('case.sensitivity_title') + '</h3>';
  html += '    <table class="data-table">';
  html += '      <thead><tr><th>' + t('case.sens_col_scenario') + '</th><th>' + t('case.sens_col_volume') + '</th><th>' + t('case.sens_col_net_cash') + '</th><th>' + t('case.sens_col_payback') + '</th></tr></thead>';
  html += '      <tbody>';
  html += '        <tr><td><strong>' + t('case.sens_base_case') + '</strong></td><td>' + sessionsDay.toFixed(1) + t('unit.per_day') + '</td><td>' + fmt(monthlyNetCash) + '</td><td>' + paybackMonthsStr + '</td></tr>';
  html += '        <tr><td><strong>' + t('case.sens_slowdown') + '</strong></td><td>' + conservativeSessions.toFixed(1) + t('unit.per_day') + '</td><td>' + fmt(conservativeNetMonth) + '</td><td>' + conservativePayback + ' ' + t('unit.mos') + '</td></tr>';
  html += '        <tr><td><strong>' + t('case.sens_stress') + '</strong></td><td>' + downsideSessions.toFixed(1) + t('unit.per_day') + '</td><td>' + fmt(downsideNetMonth) + '</td><td>' + downsidePayback + ' ' + t('unit.mos') + '</td></tr>';
  html += '      </tbody>';
  html += '    </table>';
  html += '  </div>';

  html += '  <div class="case-signoff">';
  html += '    <h3>' + t('case.signoff_title') + '</h3>';
  html += '    <div class="signoff-grid">';
  html += '      <div class="signoff-block"><div class="signoff-line"></div><div class="signoff-lbl">' + t('case.owner_sig') + '</div><div class="signoff-sub">' + t('case.sig_date') + ': _________________</div></div>';
  html += '      <div class="signoff-block"><div class="signoff-line"></div><div class="signoff-lbl">' + t('case.partner_sig') + '</div><div class="signoff-sub">' + t('case.sig_date') + ': _________________</div></div>';
  html += '    </div>';
  html += '  </div>';

  html += '  <div class="case-actions">';
  html += '    <button id="print-case-btn" class="primary-btn" type="button">' + t('btn.print_case') + '</button>';
  html += '  </div>';
  html += '</div>';

  results.innerHTML = html;
  results.style.display = '';

  // Render SVG Charts into containers
  Charts.renderPaybackChart(document.getElementById('crossover-chart-container'), {
    cost: cost,
    monthlyNet: monthlyNetCash,
    crossoverMonth: crossoverMonth,
    crossoverExact: crossoverExact,
    monthlyData: monthlySchedule
  });

  Charts.renderTcoChart(document.getElementById('tco-chart-container'), [
    { label: t('chart.lbl_purchase'), value: cost },
    { label: t('chart.lbl_consumables'), value: totalConsumablesLifespan },
    { label: t('chart.lbl_parts'), value: totalPartsLifespan },
    { label: t('chart.lbl_servicing'), value: totalMaintLifespan },
    { label: t('chart.lbl_power'), value: totalPowerLifespan }
  ]);

  Charts.renderComparisonChart(document.getElementById('compare-chart-container'), {
    a: compA,
    b: compB
  });

  // Attach dynamic event listeners
  var toggleSchedBtn = document.getElementById('toggle-schedule-btn');
  var schedContainer = document.getElementById('schedule-container');
  if (toggleSchedBtn && schedContainer) {
    toggleSchedBtn.addEventListener('click', function () {
      if (schedContainer.style.display === 'none') {
        schedContainer.style.display = '';
        this.textContent = t('sched.hide_btn');
      } else {
        schedContainer.style.display = 'none';
        this.textContent = t('sched.toggle_btn');
      }
    });
  }

  var printCaseBtn = document.getElementById('print-case-btn');
  if (printCaseBtn) {
    printCaseBtn.addEventListener('click', function () {
      window.print();
    });
  }

  var printSummaryBtn = document.getElementById('print-summary-btn');
  if (printSummaryBtn) {
    printSummaryBtn.addEventListener('click', function () {
      window.print();
    });
  }

  var downloadCsvBtn = document.getElementById('download-csv-btn');
  if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener('click', function () {
      if (lastCalcData) {
        exportResultsAsCsv(lastCalcData);
      }
    });
  }

  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Accessible Tooltip Click & Keyboard Handlers
document.addEventListener('click', function (e) {
  var btn = e.target.closest('.tooltip-btn');
  if (btn) {
    var wrapper = btn.closest('.tooltip-wrapper');
    if (wrapper) {
      var wasActive = wrapper.classList.contains('is-active');
      var allActive = document.querySelectorAll('.tooltip-wrapper.is-active');
      for (var i = 0; i < allActive.length; i++) {
        allActive[i].classList.remove('is-active');
      }
      if (!wasActive) {
        wrapper.classList.add('is-active');
      }
    }
    return;
  }
  if (!e.target.closest('.tooltip-popover')) {
    var openActive = document.querySelectorAll('.tooltip-wrapper.is-active');
    for (var j = 0; j < openActive.length; j++) {
      openActive[j].classList.remove('is-active');
    }
  }
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    var openActive = document.querySelectorAll('.tooltip-wrapper.is-active');
    for (var k = 0; k < openActive.length; k++) {
      openActive[k].classList.remove('is-active');
    }
  }
});

// ── Initial Page Load Execution ──
// Restore any saved inputs from previous session and auto-calculate if data exists
var hadRestoredData = restoreInputs();
if (hadRestoredData) {
  var initialCost = document.getElementById('equip-cost') ? document.getElementById('equip-cost').value : '';
  if (initialCost && !isNaN(parseFloat(initialCost))) {
    calcBtn.click();
  }
}

/* ── Language switcher ───────────────────────────────────────────
   The dictionaries were shipped without a way to pick one, so only English
   was reachable. The choice is stored under poli_tools_language, the key the
   rest of the tool suite already uses, so a visitor's language follows them
   from tool to tool. Results are re-rendered so a switch does not leave a
   half-translated screen. */
(function () {
  var sel = document.getElementById('language-select');
  if (!sel || !window.i18n) return;
  var stored = null;
  try { stored = localStorage.getItem('poli_tools_language'); } catch (e) { stored = null; }
  var initial = (stored && window.i18n.languages.indexOf(stored) !== -1) ? stored : 'en';
  sel.value = initial;
  if (initial !== 'en') window.i18n.setLanguage(initial);
  sel.addEventListener('change', function () {
    var lang = sel.value;
    if (window.i18n.languages.indexOf(lang) === -1) return;
    window.i18n.setLanguage(lang);
    try { localStorage.setItem('poli_tools_language', lang); } catch (e) {}
    var results = document.getElementById('results');
    var calcBtn = document.getElementById('calc-btn');
    if (results && results.style.display !== 'none' && results.innerHTML.trim() && !results.querySelector('.poli-err-card') && calcBtn) {
      calcBtn.click();
    }
  });
})();
