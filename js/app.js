'use strict';

var G = InputGuards;
var calcBtn = document.getElementById('calc-btn');
var results = document.getElementById('results');

function fmt(n) { return '£' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function fmtInt(n) { return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

calcBtn.addEventListener('click', function () {
  var cost          = G.safeFloat(document.getElementById('equip-cost').value, NaN);
  var sessionsDay   = G.safeFloat(document.getElementById('sessions-day').value, NaN);
  var revSession    = G.safeFloat(document.getElementById('revenue-session').value, NaN);
  var consSession   = G.safeFloat(document.getElementById('consumables-session').value, 0);
  var workDays      = G.safeFloat(document.getElementById('work-days').value, 5);
  var annualMaint   = G.safeFloat(document.getElementById('annual-maintenance').value, 0);
  var lifespan      = G.safeFloat(document.getElementById('equip-lifespan').value, 3);

  // ── Validation ──
  var errors = [];
  if (!G.isValid(cost) || cost < 0)       errors.push('Enter a valid purchase cost.');
  if (!G.isValid(sessionsDay) || sessionsDay <= 0) errors.push('Enter sessions per day (minimum 0.5).');
  if (!G.isValid(revSession) || revSession < 0)  errors.push('Enter valid revenue per session.');
  if (sessionsDay > 15) errors.push('Unusual session count — please verify.');

  if (errors.length) {
    results.style.display = '';
    results.innerHTML = G.formatError(errors.join('<br>'));
    return;
  }

  // ── Cross-field: daily net check ──
  var netPerSession = revSession - consSession;
  if (netPerSession <= 0) {
    results.style.display = '';
    results.innerHTML =
      G.formatWarning(
        'Revenue per session does not exceed consumables cost. Equipment never pays for itself at these figures — review your inputs.'
      );
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  // ── Cross-field: maintenance vs cost ──
  var maintRatio = cost > 0 ? annualMaint / cost : 0;
  var maintWarn = '';
  if (maintRatio > 0.5) {
    maintWarn = G.formatWarning('Annual maintenance exceeds 50% of purchase cost — verify this figure.');
  }

  var dailyNet     = netPerSession * sessionsDay;
  var weeklyNet    = dailyNet * workDays;
  var annualNet    = weeklyNet * 52 - annualMaint;
  var lifespanNet  = annualNet * lifespan - cost;

  var sessionsToBreakeven = Math.ceil(cost / netPerSession);
  var daysToPayback    = sessionsToBreakeven / sessionsDay;
  var weeksToPayback   = daysToPayback / workDays;

  var paybackStr;
  if (weeksToPayback < 1) {
    paybackStr = Math.ceil(daysToPayback) + ' day' + (Math.ceil(daysToPayback) === 1 ? '' : 's');
  } else if (weeksToPayback < 8) {
    paybackStr = Math.ceil(weeksToPayback) + ' week' + (Math.ceil(weeksToPayback) === 1 ? '' : 's');
  } else {
    var months = weeksToPayback / 4.33;
    paybackStr = months.toFixed(1) + ' months';
  }

  var roiPct = cost > 0 ? ((lifespanNet / cost) * 100).toFixed(0) + '%' : '—';

  document.getElementById('payback').textContent = paybackStr;
  document.getElementById('breakeven-sessions').textContent = fmtInt(sessionsToBreakeven);
  document.getElementById('annual-profit').textContent = fmt(annualNet);
  document.getElementById('total-roi').textContent = roiPct;

  var rows = [];
  for (var y = 0; y < Math.ceil(lifespan); y++) {
    var yr = y + 1;
    var cumRev = annualNet * yr;
    var cumNet = cumRev - cost;
    var paidOff = cumRev >= cost;
    rows.push('<tr>' +
      '<td>Year ' + yr + '</td>' +
      '<td>' + fmt(annualNet) + '</td>' +
      '<td>' + fmt(cumRev) + '</td>' +
      '<td>' + fmt(cumNet) + '</td>' +
      '<td>' + (paidOff ? '✅ Paid off' : fmt(cost - cumRev) + ' remaining') + '</td>' +
      '</tr>');
  }

  document.getElementById('detail-table').innerHTML =
    maintWarn +
    '<table>' +
    '<thead><tr><th>Year</th><th>Net Income</th><th>Cumulative Revenue</th><th>Net P/L vs Cost</th><th>Status</th></tr></thead>' +
    '<tbody>' + rows.join('') + '</tbody>' +
    '</table>';

  results.style.display = '';
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
