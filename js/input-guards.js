/**
 * Poli International: Shared Input Validation Guards
 *
 * Cross-tool validation utilities for all calculator UIs.
 * Drop-in: no dependencies, no globals polluting (all namespaced).
 *
 * Usage:
 *   <script src="js/input-guards.js"></script>
 *   const v = InputGuards.safeFloat(el, 0);
 *   if (!InputGuards.isValid(v)) { ... }
 *
 * @overview Centralises NaN guarding, range checks, cross-field warnings,
 *           safe division, and inline error/warning rendering.
 * @since   2026-06-23  Hermes T12: 68-input-validation-spec
 */

'use strict';

var InputGuards = (function () {
  'use strict';

  /* ── HTML escaping (XSS protection) ── */
  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  if (typeof window !== 'undefined' && !window.esc) {
    window.esc = esc;
  }

  /* ── Number parsing ───────────────────────────────────────── */
  /**
   * Parse a numeric value safely. Handles European decimal comma,
   * whitespace, and currency symbols.
   *
   * @param {string|number} raw: value from input.value
   * @param {number}         fallback: returned if NaN (default NaN)
   * @returns {number}
   */
  function safeFloat(raw, fallback) {
    if (raw === null || raw === undefined || raw === '') return arguments.length > 1 ? fallback : NaN;
    var s = String(raw).trim();
    // Strip common currency/unit suffixes
    s = s.replace(/[£€$%\s]|mm$|cm$|in$|ml$|oz$|years?$/gi, '');
    // European decimal comma
    s = s.replace(',', '.');
    var n = parseFloat(s);
    return isNaN(n) ? (arguments.length > 1 ? fallback : NaN) : n;
  }

  /**
   * True when value is a finite number (not NaN, not Infinity).
   * @param {*} v
   * @returns {boolean}
   */
  function isValid(v) {
    return typeof v === 'number' && isFinite(v);
  }

  /* ── Range guards ─────────────────────────────────────────── */
  /**
   * Check whether value is inside [min, max] (inclusive).
   * Returns { ok: boolean, message: string|null }
   */
  function inRange(value, min, max, label) {
    var defLbl = window.t ? window.t('guards.default_label_cap') : 'Value';
    var effectiveLabel = label || defLbl;
    if (!isValid(value)) {
      var msgValid = window.t
        ? window.t('guards.valid_number', { label: effectiveLabel })
        : effectiveLabel + ' must be a valid number.';
      return { ok: false, message: msgValid };
    }
    if (value < min) {
      var msgMin = window.t
        ? window.t('guards.min_val', { label: effectiveLabel, min: min })
        : effectiveLabel + ' must be at least ' + min + '.';
      return { ok: false, message: msgMin };
    }
    if (value > max) {
      var msgMax = window.t
        ? window.t('guards.max_val', { label: effectiveLabel, max: max })
        : effectiveLabel + ' must not exceed ' + max + '.';
      return { ok: false, message: msgMax };
    }
    return { ok: true, message: null };
  }

  /**
   * Check that value is strictly positive (> 0).
   */
  function positive(value, label) {
    if (!isValid(value) || value <= 0) {
      var defLblLower = window.t ? window.t('guards.default_label_lower') : 'value';
      var effectiveLabel = label || defLblLower;
      var msg = window.t
        ? window.t('guards.greater_than_zero', { label: effectiveLabel })
        : 'Enter a ' + effectiveLabel + ' greater than zero.';
      return { ok: false, message: msg };
    }
    return { ok: true, message: null };
  }

  /**
   * Soft warning: value outside expected typical range,
   * but not blocked.
   */
  function unusualRange(value, typicalMin, typicalMax, label) {
    if (!isValid(value)) return null;
    if (value < typicalMin || value > typicalMax) {
      var defMeas = window.t ? window.t('guards.default_measurement') : 'measurement';
      var effectiveLabel = label || defMeas;
      return window.t
        ? window.t('guards.unusual_range', { label: effectiveLabel, min: typicalMin, max: typicalMax })
        : 'Unusual ' + effectiveLabel + ': typical range is ' + typicalMin + ' to ' + typicalMax + '. Verify before proceeding.';
    }
    return null;
  }

  /* ── Safe arithmetic ──────────────────────────────────────── */
  /**
   * Divide, returning fallback when denominator is 0.
   */
  function safeDiv(numerator, denominator, fallback) {
    var fb = arguments.length > 2 ? fallback : NaN;
    if (!isValid(numerator) || !isValid(denominator) || denominator === 0) return fb;
    return numerator / denominator;
  }

  /* ── Error/warning rendering ──────────────────────────────── */
  /**
   * Blocking error (red). Prevents calculation.
   * @param {string} message
   * @returns {string} HTML
   */
  function formatError(message) {
    return '<div class="poli-err-card" role="alert">' + esc(message) + '</div>';
  }

  /**
   * Several blocking errors in one card. Each message is escaped on its own, so the
   * line breaks between them are real breaks and not text the user has to read.
   * @param {string[]} messages
   * @returns {string} HTML
   */
  function formatErrorList(messages) {
    var list = (messages || []).map(function (m) { return esc(String(m)); });
    return '<div class="poli-err-card" role="alert">' + list.join('<br>') + '</div>';
  }

  /**
   * Warning (amber). Allows but flags.
   * @param {string} message
   * @returns {string} HTML
   */
  function formatWarning(message) {
    return '<div class="poli-warn-card" role="alert">' + esc(message) + '</div>';
  }

  /* ── Default CSS injection ────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('poli-input-guards-css')) return;
    var style = document.createElement('style');
    style.id = 'poli-input-guards-css';
    style.textContent =
      '.poli-err-card{background:#451a1a;border-left:4px solid #ef4444;color:#fca5a5;padding:0.75rem 1rem;border-radius:6px;margin-bottom:1rem;font-size:0.95rem;}' +
      '.poli-warn-card{background:#453a1a;border-left:4px solid #f59e0b;color:#fcd34d;padding:0.75rem 1rem;border-radius:6px;margin-bottom:1rem;font-size:0.95rem;}';
    document.head.appendChild(style);
  }

  /* Auto-inject on load */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStyles);
  } else {
    injectStyles();
  }

  /* ── Public API ───────────────────────────────────────────── */
  return {
    esc: esc,
    safeFloat: safeFloat,
    isValid: isValid,
    inRange: inRange,
    positive: positive,
    unusualRange: unusualRange,
    safeDiv: safeDiv,
    formatError: formatError,
    formatErrorList: formatErrorList,
    formatWarning: formatWarning,
  };
})();
