# Testing Report: Equipment ROI Calculator V2

Date: 2026-09-15. Run by Poli International against the files in this repository, served locally and driven with Playwright (Chromium), plus the repository's own `test.js`. These are the checks that were actually run; nothing below is assumed.

## The repository's own tests

`node test.js`: 19 batteries, all passing. They cover the input guards, the i18n engine and token replacement, payback and crossover arithmetic, total cost of ownership, the comparison table, currency symbol formatting for GBP/USD/EUR/CAD/AUD, localStorage persistence and reset, CSV generation and formula escaping, the share module, the 24-month chart calculation, tooltip ARIA attributes, the toast system and the print stylesheet.

## Arithmetic, checked by hand

| Input | Expected | Result |
|---|---|---|
| 1,200 purchase, 1 session/day, 5 days/week, 30 revenue/session, 50/month electricity, no parts | 21.7 sessions/month, 650 gross, 600 net, payback 2.0 months, crossover in month 2 | 2.0 mos (Month 2) ✓ |
| Same, plus a 45 part every 12 months | Running cost 53.75/month, payback still 2.0, crossover slips to month 3 | 2.0 mos (Month 3) ✓ |
| Time saved 20 min/session, hourly rate blank | Hours reported, no cash value, payback unchanged | "no monetary value is added", 87 hours/year ✓ |
| Same, hourly rate 40 | 13.33/session time value, time-adjusted payback shorter than the cash payback | 13.33, 1.4 vs 2.0 months ✓ |
| Option 0 (do not buy) | Zero on every line for the alternative | ✓ |
| Option B 2,000 cost, 45/session, 80/month running | Higher payback, larger three-year net, verdict names the better option | ✓ |

The monthly volume convention (sessions/day x working days/week x 52 / 12) is stated in the form, since it is why a monthly revenue figure cannot be typed in directly.

## Validation

Rejected with a message, in each of the seven languages: blank purchase cost, blank or zero sessions, blank revenue, working days outside 1-7 (10 was accepted before this release), lifespan outside 1-30 (99 was accepted before), a replacement part cost with no interval, and Option B selected with its cost or revenue missing. Several messages now appear as separate lines; they previously printed as one line containing a literal `<br>`.

## Languages

265 keys in each of English, French, German, Italian, Spanish, Portuguese and Dutch: identical key sets, no value left in English, no placeholder mismatches, no numbers that differ between languages. Checked by parsing the dictionaries, not by reading them. The tool had no language selector before this release, so only English was reachable; the switcher was added and the Dutch run was re-checked end to end (form, validation messages, results, business case).

## Browser behaviour

- No page or console errors in English or Dutch, at 1280px and 390px, and no horizontal overflow.
- Three inline SVG charts render; no chart library is loaded and none is shipped.
- Currency changes the symbol only: the numbers are never converted.
- The printable business case carries the local date (checked as "September 15, 2026"), a sensitivity table at 100%, 75% and 50% of volume, and sign-off lines, which had no styling before this release.
- Reset clears every field instead of restoring the previously hard-coded figures.
- Inputs persist to localStorage under `poli_equipment_roi_inputs`.

## Not tested

- Real printing to paper, and PDF output quality from the browser dialog.
- Screen readers.
- Browsers other than Chromium.
- The share card download, which fetches a PNG from poliinternational.com and therefore needs the live site rather than a local server.
