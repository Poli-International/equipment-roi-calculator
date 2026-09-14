/**
 * Equipment ROI Calculator: Inline SVG Chart Generator
 * Complies with strict SVG constraints:
 * - 100% inline vector graphics (zero canvas, zero bitmaps, zero third-party dependencies).
 * - Colour is NEVER the only carrier of meaning (uses dashed guides, markers, hatch patterns, and explicit textual labels).
 * - Adapts cleanly to dark/light CSS variables and high-contrast print styles.
 */
'use strict';

var Charts = (function () {
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function createSvg(width, height, viewBox) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', viewBox || '0 0 ' + width + ' ' + height);
    svg.setAttribute('role', 'img');
    svg.setAttribute('style', 'display:block;max-width:100%;overflow:visible;');
    return svg;
  }

  function fmtMoney(n) {
    var sym = (typeof window !== 'undefined' && window.getCurrencySymbol && typeof window.getCurrencySymbol === 'function')
      ? window.getCurrencySymbol()
      : '£';
    var prefix = n < 0 ? '-' + sym : sym;
    return prefix + Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Renders the 24-Month Cumulative ROI Line Chart & Crossover Point
   * Pure SVG vector engine: no chart library is shipped or loaded.
   */
  function renderPaybackChart(container, data) {
    if (!container || !data) return;
    container.innerHTML = '';

    var cost = Number(data.cost) || 0;
    var monthlyNet = Number(data.monthlyNet) || 0;
    var crossoverExact = (data.crossoverExact !== undefined && data.crossoverExact !== null) ? Number(data.crossoverExact) : null;
    if (crossoverExact !== null && isNaN(crossoverExact)) crossoverExact = null;

    // Construct 24-month data points (Month 0 to Month 24)
    var points24 = [];
    points24.push({ month: 0, cumulative: -cost });
    var runningCum = -cost;
    for (var m = 1; m <= 24; m++) {
      runningCum += monthlyNet;
      points24.push({ month: m, cumulative: runningCum });
    }

    var w = 680;
    var h = 250;
    var padLeft = 70;
    var padRight = 40;
    var padTop = 32;
    var padBottom = 42;
    var chartW = w - padLeft - padRight;
    var chartH = h - padTop - padBottom;

    var minVal = -cost;
    var maxVal = 0;
    for (var k = 0; k < points24.length; k++) {
      if (points24[k].cumulative < minVal) minVal = points24[k].cumulative;
      if (points24[k].cumulative > maxVal) maxVal = points24[k].cumulative;
    }
    if (maxVal <= 0) {
      maxVal = Math.max(100, Math.abs(minVal) * 0.35);
    }
    // Add 10% breathing room to maxVal
    maxVal = maxVal * 1.1;

    var valRange = maxVal - minVal;
    if (valRange <= 0) valRange = 1;

    var xScale, yScale;
      xScale = function (monthVal) {
        return padLeft + (monthVal / 24) * chartW;
      };
      yScale = function (val) {
        return padTop + chartH - ((val - minVal) / valRange) * chartH;
      };

    var zeroY = yScale(0);

    var svg = createSvg(w, h, '0 0 ' + w + ' ' + h);
    var defs = document.createElementNS(SVG_NS, 'defs');
    defs.innerHTML =
      '<pattern id="lossHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">' +
      '<line x1="0" y1="0" x2="0" y2="8" stroke="var(--border)" stroke-width="1.5" />' +
      '</pattern>';
    svg.appendChild(defs);

    // Accessible description
    var desc = document.createElementNS(SVG_NS, 'desc');
    desc.textContent = window.t ? window.t('chart.payback_24m_desc') : 'Visualizes cumulative net cash flow over the first 24 months with crossover break-even point';
    svg.appendChild(desc);

    // Grid lines for 24 months (every 3 or 4 months: 0, 4, 8, 12, 16, 20, 24)
    var gridStep = 4;
    for (var gm = 0; gm <= 24; gm += gridStep) {
      var gx = xScale(gm);
      var gLine = document.createElementNS(SVG_NS, 'line');
      gLine.setAttribute('x1', gx);
      gLine.setAttribute('x2', gx);
      gLine.setAttribute('y1', padTop);
      gLine.setAttribute('y2', padTop + chartH);
      gLine.setAttribute('stroke', 'var(--border)');
      gLine.setAttribute('stroke-width', '1');
      gLine.setAttribute('stroke-opacity', '0.4');
      svg.appendChild(gLine);

      var gLabel = document.createElementNS(SVG_NS, 'text');
      gLabel.setAttribute('x', gx);
      gLabel.setAttribute('y', padTop + chartH + 18);
      gLabel.setAttribute('text-anchor', 'middle');
      gLabel.setAttribute('fill', 'var(--text-muted)');
      gLabel.setAttribute('font-size', '11');
      gLabel.textContent = 'M' + gm;
      svg.appendChild(gLabel);
    }

    // Y-Axis Labels
    var minLabel = document.createElementNS(SVG_NS, 'text');
    minLabel.setAttribute('x', padLeft - 8);
    minLabel.setAttribute('y', yScale(minVal) + 4);
    minLabel.setAttribute('text-anchor', 'end');
    minLabel.setAttribute('fill', 'var(--text-muted)');
    minLabel.setAttribute('font-size', '11');
    minLabel.textContent = fmtMoney(minVal);
    svg.appendChild(minLabel);

    var maxLabel = document.createElementNS(SVG_NS, 'text');
    maxLabel.setAttribute('x', padLeft - 8);
    maxLabel.setAttribute('y', yScale(maxVal) + 10);
    maxLabel.setAttribute('text-anchor', 'end');
    maxLabel.setAttribute('fill', 'var(--text-muted)');
    maxLabel.setAttribute('font-size', '11');
    maxLabel.textContent = fmtMoney(maxVal);
    svg.appendChild(maxLabel);

    // Zero baseline (Break-even line)
    var zeroLine = document.createElementNS(SVG_NS, 'line');
    zeroLine.setAttribute('x1', padLeft);
    zeroLine.setAttribute('x2', padLeft + chartW);
    zeroLine.setAttribute('y1', zeroY);
    zeroLine.setAttribute('y2', zeroY);
    zeroLine.setAttribute('stroke', 'var(--text-muted)');
    zeroLine.setAttribute('stroke-width', '2');
    zeroLine.setAttribute('stroke-dasharray', '5 4');
    svg.appendChild(zeroLine);

    var zeroText = document.createElementNS(SVG_NS, 'text');
    zeroText.setAttribute('x', padLeft + 6);
    zeroText.setAttribute('y', zeroY - 6);
    zeroText.setAttribute('fill', 'var(--text-muted)');
    zeroText.setAttribute('font-size', '11');
    zeroText.setAttribute('font-weight', '700');
    zeroText.textContent = window.t ? window.t('chart.break_even_line') : 'Break-Even Line';
    svg.appendChild(zeroText);

    // Build 24-Month Trajectory Path
    var pathD = '';
          pathD = 'M ' + xScale(0) + ' ' + yScale(-cost);
      for (var p = 1; p < points24.length; p++) {
        pathD += ' L ' + xScale(points24[p].month) + ' ' + yScale(points24[p].cumulative);
      }

    var trajectory = document.createElementNS(SVG_NS, 'path');
    trajectory.setAttribute('d', pathD);
    trajectory.setAttribute('fill', 'none');
    trajectory.setAttribute('stroke', 'var(--primary)');
    trajectory.setAttribute('stroke-width', '3');
    trajectory.setAttribute('stroke-linecap', 'round');
    trajectory.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(trajectory);

    // Month 0 Initial CapEx Dot
    var startDot = document.createElementNS(SVG_NS, 'circle');
    startDot.setAttribute('cx', xScale(0));
    startDot.setAttribute('cy', yScale(-cost));
    startDot.setAttribute('r', '5');
    startDot.setAttribute('fill', 'var(--text-main)');
    svg.appendChild(startDot);

    // Crossover Indicator & Callout
    if (crossoverExact !== null && crossoverExact >= 0) {
      if (crossoverExact <= 24) {
        var crossX = xScale(crossoverExact);
        var crossY = zeroY;

        // Vertical guide line to break-even point
        var vGuide = document.createElementNS(SVG_NS, 'line');
        vGuide.setAttribute('x1', crossX);
        vGuide.setAttribute('x2', crossX);
        vGuide.setAttribute('y1', padTop);
        vGuide.setAttribute('y2', padTop + chartH);
        vGuide.setAttribute('stroke', 'var(--primary)');
        vGuide.setAttribute('stroke-width', '1.5');
        vGuide.setAttribute('stroke-dasharray', '3 3');
        svg.appendChild(vGuide);

        // Highlighted Crossover Marker (Ring + Dot)
        var outerRing = document.createElementNS(SVG_NS, 'circle');
        outerRing.setAttribute('cx', crossX);
        outerRing.setAttribute('cy', crossY);
        outerRing.setAttribute('r', '9');
        outerRing.setAttribute('fill', 'none');
        outerRing.setAttribute('stroke', 'var(--primary)');
        outerRing.setAttribute('stroke-width', '1.5');
        svg.appendChild(outerRing);

        var crossDot = document.createElementNS(SVG_NS, 'circle');
        crossDot.setAttribute('cx', crossX);
        crossDot.setAttribute('cy', crossY);
        crossDot.setAttribute('r', '5');
        crossDot.setAttribute('fill', 'var(--primary)');
        crossDot.setAttribute('stroke', 'var(--bg-card)');
        crossDot.setAttribute('stroke-width', '2');
        svg.appendChild(crossDot);

        // Callout badge with exact crossover month
        var badgeW = 160;
        var badgeH = 26;
        var badgeX = Math.min(crossX + 10, w - badgeW - 12);
        if (badgeX < padLeft + 10) badgeX = padLeft + 10;
        var badgeY = Math.max(padTop + 6, crossY - 34);

        var badgeBox = document.createElementNS(SVG_NS, 'rect');
        badgeBox.setAttribute('x', badgeX);
        badgeBox.setAttribute('y', badgeY);
        badgeBox.setAttribute('width', badgeW);
        badgeBox.setAttribute('height', badgeH);
        badgeBox.setAttribute('rx', '4');
        badgeBox.setAttribute('fill', 'var(--bg-card)');
        badgeBox.setAttribute('stroke', 'var(--primary)');
        badgeBox.setAttribute('stroke-width', '1.5');
        svg.appendChild(badgeBox);

        var badgeText = document.createElementNS(SVG_NS, 'text');
        badgeText.setAttribute('x', badgeX + 8);
        badgeText.setAttribute('y', badgeY + 17);
        badgeText.setAttribute('fill', 'var(--text-main)');
        badgeText.setAttribute('font-size', '11');
        badgeText.setAttribute('font-weight', '700');
        badgeText.textContent = window.t
          ? window.t('chart.crossover_month_exact', { month: crossoverExact.toFixed(1) })
          : '★ Break-Even: Month ' + crossoverExact.toFixed(1);
        svg.appendChild(badgeText);
      } else {
        // Crossover is beyond 24 months
        var beyondNote = document.createElementNS(SVG_NS, 'text');
        beyondNote.setAttribute('x', padLeft + chartW - 6);
        beyondNote.setAttribute('y', padTop + 16);
        beyondNote.setAttribute('text-anchor', 'end');
        beyondNote.setAttribute('fill', 'var(--text-muted)');
        beyondNote.setAttribute('font-size', '11');
        beyondNote.setAttribute('font-weight', '600');
        beyondNote.textContent = window.t
          ? window.t('chart.payback_beyond_24') + ' (' + crossoverExact.toFixed(1) + 'm)'
          : 'Payback > 24 Months (' + crossoverExact.toFixed(1) + 'm)';
        svg.appendChild(beyondNote);
      }
    } else {
      // Negative ROI / Operating at Loss
      var lossNote = document.createElementNS(SVG_NS, 'text');
      lossNote.setAttribute('x', padLeft + chartW - 6);
      lossNote.setAttribute('y', padTop + 16);
      lossNote.setAttribute('text-anchor', 'end');
      lossNote.setAttribute('fill', 'var(--toast-error)');
      lossNote.setAttribute('font-size', '11');
      lossNote.setAttribute('font-weight', '700');
      lossNote.textContent = 'Operating at Loss: Zero Crossover';
      svg.appendChild(lossNote);
    }

    container.appendChild(svg);
  }

  /**
   * Renders True Cost of Ownership (TCO) Horizontal Stacked Bar
   */
  function renderTcoChart(container, slices) {
    if (!container || !slices || slices.length === 0) return;
    container.innerHTML = '';

    var total = 0;
    for (var i = 0; i < slices.length; i++) {
      total += slices[i].value;
    }
    if (total <= 0) return;

    var w = 680;
    var h = 100;
    var barY = 24;
    var barH = 26;
    var padX = 10;
    var barW = w - padX * 2;

    var svg = createSvg(w, h, '0 0 ' + w + ' ' + h);

    var curX = padX;
    var legendItems = [];

    // Distinct SVG patterns for black & white / print differentiation
    var defs = document.createElementNS(SVG_NS, 'defs');
    defs.innerHTML =
      '<pattern id="pat1" width="6" height="6" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="6" y2="6" stroke="var(--bg-card)" stroke-width="1.5"/></pattern>' +
      '<pattern id="pat2" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1" fill="var(--bg-card)"/></pattern>' +
      '<pattern id="pat3" width="6" height="6" patternUnits="userSpaceOnUse"><line x1="0" y1="6" x2="6" y2="0" stroke="var(--bg-card)" stroke-width="1.5"/></pattern>';
    svg.appendChild(defs);

    var fills = [
      'var(--chart-color-1)',
      'var(--chart-color-2)',
      'var(--chart-color-3)',
      'var(--chart-color-4)',
      'var(--chart-color-5)'
    ];

    for (var s = 0; s < slices.length; s++) {
      var slice = slices[s];
      var pct = slice.value / total;
      var sliceW = Math.max(1, pct * barW);

      var rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', curX);
      rect.setAttribute('y', barY);
      rect.setAttribute('width', sliceW);
      rect.setAttribute('height', barH);
      rect.setAttribute('fill', fills[s % fills.length]);
      rect.setAttribute('stroke', 'var(--bg-card)');
      rect.setAttribute('stroke-width', '1');
      svg.appendChild(rect);

      // Overlay pattern on odd slices for non-color identification
      if (s % 2 === 1) {
        var patRect = document.createElementNS(SVG_NS, 'rect');
        patRect.setAttribute('x', curX);
        patRect.setAttribute('y', barY);
        patRect.setAttribute('width', sliceW);
        patRect.setAttribute('height', barH);
        patRect.setAttribute('fill', 'url(#pat' + ((s % 3) + 1) + ')');
        patRect.setAttribute('opacity', '0.35');
        svg.appendChild(patRect);
      }

      legendItems.push({
        label: slice.label,
        value: slice.value,
        pct: (pct * 100).toFixed(0) + '%',
        color: fills[s % fills.length],
        symbol: ['■', '▲', '●', '◆', '▼'][s % 5]
      });

      curX += sliceW;
    }

    // Render text legend below bar
    var legY = barY + barH + 26;
    var legX = padX;
    for (var l = 0; l < legendItems.length; l++) {
      var item = legendItems[l];
      var legTxt = document.createElementNS(SVG_NS, 'text');
      legTxt.setAttribute('x', legX);
      legTxt.setAttribute('y', legY);
      legTxt.setAttribute('fill', 'var(--text-main)');
      legTxt.setAttribute('font-size', '12');
      legTxt.textContent = item.symbol + ' ' + item.label + ': ' + fmtMoney(item.value) + ' (' + item.pct + ')';
      svg.appendChild(legTxt);
      legX += (barW / legendItems.length);
    }

    container.appendChild(svg);
  }

  /**
   * Renders Side-by-Side Comparison Grouped Bar Chart
   * Compares Total Investment Cost and Projected Savings between Option A and Option B/0.
   */
  function renderComparisonChart(container, comp) {
    if (!container || !comp) return;
    container.innerHTML = '';

    var w = 680;
    var h = 210;
    var padL = 65;
    var padR = 25;
    var padT = 32;
    var padB = 44;
    var chartW = w - padL - padR;
    var chartH = h - padT - padB;

    var metrics = [
      { name: window.t ? window.t('chart.col_total_investment') : 'Total Investment Cost', a: comp.a.cost, b: comp.b.cost },
      { name: window.t ? window.t('chart.col_projected_savings') : 'Projected 3-Yr Savings', a: comp.a.threeYearNet, b: comp.b.threeYearNet },
      { name: window.t ? window.t('chart.col_annual_net_cash') : 'Annual Net Cash', a: comp.a.annualNet, b: comp.b.annualNet }
    ];

    var maxVal = 100;
    for (var i = 0; i < metrics.length; i++) {
      if (metrics[i].a > maxVal) maxVal = metrics[i].a;
      if (metrics[i].b > maxVal) maxVal = metrics[i].b;
    }
    // Headroom for text labels above bars
    maxVal = maxVal * 1.18;

    var svg = createSvg(w, h, '0 0 ' + w + ' ' + h);

    // Hatch pattern for Option B / Option 0 bar texture
    var defs = document.createElementNS(SVG_NS, 'defs');
    defs.innerHTML =
      '<pattern id="optBHatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">' +
      '<line x1="0" y1="0" x2="0" y2="6" stroke="var(--border)" stroke-width="1.5" />' +
      '</pattern>';
    svg.appendChild(defs);

    var desc = document.createElementNS(SVG_NS, 'desc');
    desc.textContent = window.t ? window.t('chart.invest_vs_savings_desc') : 'Bar chart comparing total investment cost and projected savings side-by-side between primary option and selected comparison option';
    svg.appendChild(desc);

    var groupW = chartW / metrics.length;
    var barW = Math.min(34, groupW * 0.32);

    for (var m = 0; m < metrics.length; m++) {
      var met = metrics[m];
      var gx = padL + m * groupW;

      // Group divider line (between groups)
      if (m > 0) {
        var sep = document.createElementNS(SVG_NS, 'line');
        sep.setAttribute('x1', gx);
        sep.setAttribute('x2', gx);
        sep.setAttribute('y1', padT);
        sep.setAttribute('y2', padT + chartH);
        sep.setAttribute('stroke', 'var(--border)');
        sep.setAttribute('stroke-width', '1');
        sep.setAttribute('stroke-opacity', '0.35');
        svg.appendChild(sep);
      }

      // Group label below
      var lbl = document.createElementNS(SVG_NS, 'text');
      lbl.setAttribute('x', gx + groupW / 2);
      lbl.setAttribute('y', padT + chartH + 22);
      lbl.setAttribute('text-anchor', 'middle');
      lbl.setAttribute('fill', 'var(--text-main)');
      lbl.setAttribute('font-size', '12');
      lbl.setAttribute('font-weight', '700');
      lbl.textContent = met.name;
      svg.appendChild(lbl);

      // Bar A (Proposed)
      var valA = Math.max(0, met.a);
      var barHA = (valA / maxVal) * chartH;
      var barA = document.createElementNS(SVG_NS, 'rect');
      barA.setAttribute('x', gx + groupW / 2 - barW - 4);
      barA.setAttribute('y', padT + chartH - barHA);
      barA.setAttribute('width', barW);
      barA.setAttribute('height', Math.max(2, barHA));
      barA.setAttribute('fill', 'var(--primary)');
      barA.setAttribute('rx', '3');
      svg.appendChild(barA);

      var txtA = document.createElementNS(SVG_NS, 'text');
      txtA.setAttribute('x', gx + groupW / 2 - barW / 2 - 4);
      txtA.setAttribute('y', padT + chartH - barHA - 5);
      txtA.setAttribute('text-anchor', 'middle');
      txtA.setAttribute('fill', 'var(--text-main)');
      txtA.setAttribute('font-size', '11.5');
      txtA.setAttribute('font-weight', '700');
      txtA.textContent = fmtMoney(met.a);
      svg.appendChild(txtA);

      // Bar B (Compare / Status Quo)
      var valB = Math.max(0, met.b);
      var barHB = (valB / maxVal) * chartH;
      var barB = document.createElementNS(SVG_NS, 'rect');
      barB.setAttribute('x', gx + groupW / 2 + 4);
      barB.setAttribute('y', padT + chartH - barHB);
      barB.setAttribute('width', barW);
      barB.setAttribute('height', Math.max(2, barHB));
      barB.setAttribute('fill', 'var(--text-muted)');
      barB.setAttribute('rx', '3');
      svg.appendChild(barB);

      // Add textured hatch overlay for Bar B
      if (barHB > 4) {
        var hatchB = document.createElementNS(SVG_NS, 'rect');
        hatchB.setAttribute('x', gx + groupW / 2 + 4);
        hatchB.setAttribute('y', padT + chartH - barHB);
        hatchB.setAttribute('width', barW);
        hatchB.setAttribute('height', Math.max(2, barHB));
        hatchB.setAttribute('fill', 'url(#optBHatch)');
        hatchB.setAttribute('rx', '3');
        svg.appendChild(hatchB);
      }

      var txtB = document.createElementNS(SVG_NS, 'text');
      txtB.setAttribute('x', gx + groupW / 2 + barW / 2 + 4);
      txtB.setAttribute('y', padT + chartH - barHB - 5);
      txtB.setAttribute('text-anchor', 'middle');
      txtB.setAttribute('fill', 'var(--text-muted)');
      txtB.setAttribute('font-size', '11.5');
      txtB.setAttribute('font-weight', '700');
      txtB.textContent = fmtMoney(met.b);
      svg.appendChild(txtB);
    }

    // Baseline line at bottom of bars
    var baseLine = document.createElementNS(SVG_NS, 'line');
    baseLine.setAttribute('x1', padL);
    baseLine.setAttribute('x2', padL + chartW);
    baseLine.setAttribute('y1', padT + chartH);
    baseLine.setAttribute('y2', padT + chartH);
    baseLine.setAttribute('stroke', 'var(--border)');
    baseLine.setAttribute('stroke-width', '1.5');
    svg.appendChild(baseLine);

    // Legend
    var legTxtA = document.createElementNS(SVG_NS, 'text');
    legTxtA.setAttribute('x', padL);
    legTxtA.setAttribute('y', 16);
    legTxtA.setAttribute('fill', 'var(--primary)');
    legTxtA.setAttribute('font-size', '12');
    legTxtA.setAttribute('font-weight', '700');
    legTxtA.textContent = window.t ? window.t('chart.legend_opt_a') : '■ Option A (Proposed)';
    svg.appendChild(legTxtA);

    var legTxtB = document.createElementNS(SVG_NS, 'text');
    legTxtB.setAttribute('x', padL + 180);
    legTxtB.setAttribute('y', 16);
    legTxtB.setAttribute('fill', 'var(--text-muted)');
    legTxtB.setAttribute('font-size', '12');
    legTxtB.setAttribute('font-weight', '700');
    legTxtB.textContent = window.t ? window.t('chart.legend_opt_b', { name: comp.b.name }) : '■ Option B (' + comp.b.name + ')';
    svg.appendChild(legTxtB);

    container.appendChild(svg);
  }

  return {
    renderPaybackChart: renderPaybackChart,
    renderTcoChart: renderTcoChart,
    renderComparisonChart: renderComparisonChart
  };
})();

window.Charts = Charts;
