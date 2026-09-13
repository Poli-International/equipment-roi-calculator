/**
 * Shareable result card for Equipment ROI Calculator (PoliShare).
 */
'use strict';

(function () {
  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  function text(id) {
    var el = document.getElementById(id);
    return el ? el.textContent.trim() : '';
  }

  PoliShare.init({
    tool: 'equipment-roi-calculator',
    mount: '#results',

    getState: function () {
      var cost = val('equip-cost');
      if (!cost) return null;
      return {
        'equip-name': val('equip-name'),
        'equip-cost': cost,
        'sessions-day': val('sessions-day'),
        'revenue-session': val('revenue-session'),
        'consumables-session': val('consumables-session'),
        'work-days': val('work-days'),
        'annual-maintenance': val('annual-maintenance'),
        'equip-lifespan': val('equip-lifespan'),
      };
    },

    applyState: function (s) {
      var ids = ['equip-name', 'equip-cost', 'sessions-day', 'revenue-session', 'consumables-session', 'work-days', 'annual-maintenance', 'equip-lifespan'];
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && s[id] !== undefined) el.value = s[id];
      });
      var btn = document.getElementById('calc-btn');
      if (btn) btn.click();
    },

    getCard: function () {
      var results = document.getElementById('results');
      if (!results || results.style.display === 'none') return null;
      var roi = text('total-roi');
      if (!roi) return null;
      var name = val('equip-name') || 'Equipment';
      return {
        t: name + ' ROI: ' + roi + '% return',
        d: [
          ['Equipment', name],
          ['Payback period', text('payback')],
          ['Break-even sessions', text('breakeven-sessions')],
          ['Annual profit', text('annual-profit')],
          ['Total ROI', roi],
        ],
      };
    },
  });
})();
