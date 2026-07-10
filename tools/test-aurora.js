#!/usr/bin/env node
// Extracts the pure-logic region from QKAurora/index.html and unit-tests it.
// Run from repo root: node tools/test-aurora.js
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'widgets', 'QKAurora', 'index.html'), 'utf8');
const m = html.match(/\/\/ @testable-start([\s\S]*?)\/\/ @testable-end/);
if (!m) { console.error('FAIL: @testable markers not found in index.html'); process.exit(1); }

const exportNames = [
  'geomagLat', 'boundaryLat', 'requiredKp', 'formatRequiredKp',
  'verdict', 'VERDICT_OVERHEAD', 'VERDICT_HORIZON', 'VERDICT_NOT_VISIBLE',
  'stormLabel', 'parseKpForecast', 'selectForecastDays'
];
const fn = new Function(m[1] + '\nreturn {' + exportNames.map(n => n + ': (typeof ' + n + ' !== "undefined" ? ' + n + ' : undefined)').join(',') + '};');
const W = fn();

let failed = 0, ran = 0;
function check(name, cond) {
  ran++;
  if (!cond) { failed++; console.error('FAIL: ' + name); }
  else console.log('ok: ' + name);
}
function approx(a, b, tol) { return Math.abs(a - b) <= tol; }

// --- geomagLat ---
// Dipole pole (IGRF-13, epoch ~2025): 80.8N, 72.7W. Pinned in the plan.
if (W.geomagLat) {
  check('geomagLat pole itself -> ~90', approx(W.geomagLat(80.8, -72.7), 90, 0.01));
  // Equator directly below the pole's meridian: exact identity asin(cos(phi0)) = 90 - phi0 = 9.2.
  check('geomagLat equator at pole longitude -> 9.2 exactly', approx(W.geomagLat(0, -72.7), 9.2, 0.01));
  // Southern-hemisphere sign sanity: Sydney is far from the north geomagnetic pole and
  // south of the (antipodal) south geomagnetic pole's influence -> must come out negative.
  check('geomagLat Sydney (southern sign check) is negative', W.geomagLat(-33.8688, 151.2093) < 0);

  // City fixtures verified against the USGS Geomagnetism Program's published observatory
  // coordinates (IGRF as of 2015 epoch), fetched live during this build 2026-07-10:
  //   - College Observatory (CMO), Fairbanks AK: https://www.usgs.gov/programs/geomagnetism/science/college-cmo
  //     geographic 64.8742N, 147.8597W -> published geomagnetic latitude 65.46N
  //   - Newport Observatory (NEW), WA: https://www.usgs.gov/programs/geomagnetism/science/newport-new
  //     geographic 48.2649N, 117.1231W -> published geomagnetic latitude 54.45N
  //   - Honolulu Observatory (HON), HI: https://www.usgs.gov/programs/geomagnetism/science/honolulu-hon
  //     geographic 21.3166N, 157.9996W -> published geomagnetic latitude 21.65N
  // Tolerance +-1.5 deg per plan (centered-dipole approximation vs USGS's own IGRF-derived
  // value -- actual deltas came out under 0.2 deg for all three, see task2 report).
  check('geomagLat Fairbanks AK (CMO) within 1.5deg of USGS 65.46N',
    approx(W.geomagLat(64.8742, -147.8597), 65.46, 1.5));
  check('geomagLat Newport WA (NEW) within 1.5deg of USGS 54.45N',
    approx(W.geomagLat(48.2649, -117.1231), 54.45, 1.5));
  check('geomagLat Honolulu HI (HON) within 1.5deg of USGS 21.65N',
    approx(W.geomagLat(21.3166, -157.9996), 21.65, 1.5));
} else {
  check('geomagLat implemented', false);
}

// --- boundaryLat / requiredKp ---
if (W.boundaryLat && W.requiredKp) {
  check('boundaryLat(5) === 56.25', W.boundaryLat(5) === 56.25);
  check('requiredKp(66.5) === 0 (clamp low)', W.requiredKp(66.5) === 0);
  check('requiredKp(45) === 9 (clamp high, raw >9)', W.requiredKp(45) === 9);
  check('requiredKp(56.3) ~= 4.98', approx(W.requiredKp(56.3), 4.98, 0.01));
} else {
  check('boundaryLat/requiredKp implemented', false);
}

if (W.formatRequiredKp) {
  check('formatRequiredKp(0) -> any', W.formatRequiredKp(0) === 'any');
  check('formatRequiredKp(9) -> extremely rare', W.formatRequiredKp(9) === '≥ 9 (extremely rare)');
  check('formatRequiredKp(4.98) -> ≥ 5.0', W.formatRequiredKp(4.98) === '≥ 5.0');
} else {
  check('formatRequiredKp implemented', false);
}

// --- verdict tier boundaries ---
if (W.verdict) {
  var boundary5 = W.boundaryLat(5); // 56.25
  check('verdict exactly-at-boundary -> overhead',
    W.verdict(boundary5, 5) === W.VERDICT_OVERHEAD);
  check('verdict boundary-5deg -> horizon (inclusive)',
    W.verdict(boundary5 - 5, 5) === W.VERDICT_HORIZON);
  check('verdict boundary-5.1deg -> not visible',
    W.verdict(boundary5 - 5.1, 5) === W.VERDICT_NOT_VISIBLE);
  check('verdict uses abs() -- southern-hemisphere boundary matches',
    W.verdict(-boundary5, 5) === W.VERDICT_OVERHEAD);
} else {
  check('verdict implemented', false);
}

// --- stormLabel ---
if (W.stormLabel) {
  check('stormLabel(1.3) -> "" (below storm threshold)', W.stormLabel(1.3) === '');
  check('stormLabel(5.0) -> G1', W.stormLabel(5.0) === 'G1');
  check('stormLabel(7.7) -> G3', W.stormLabel(7.7) === 'G3');
  check('stormLabel(9.0) -> G5', W.stormLabel(9.0) === 'G5');
} else {
  check('stormLabel implemented', false);
}

// --- parseKpForecast / selectForecastDays ---
// NOTE on the checks replaced here: the pre-fix parseKpForecast chunked the flat bin list
// by index (`j += 8`), so its old tests fed 24 same-day rows (varying only the hour) and
// asserted "3 groups of 8" purely from index arithmetic -- that was never really testing
// calendar-day grouping, just row-count division. Those pinned expectations were artifacts
// of the broken chunking: with calendar-date grouping, 24 rows on a single date is ONE
// group, not three. Replaced with fixtures that span real distinct calendar dates instead
// (see aurora-task3 review finding 1, and aurora-task4-report.md's ship-state screenshot,
// which mistakenly signed off on the resulting stretched 1-bin bar as "correct").
function pad2(n) { return (n < 10 ? '0' : '') + n; }
// Raw NOAA payload rows (live object shape) for `count` 3-hour bins on one calendar date.
function makeDayRows(date, count) {
  var rows = [];
  for (var k = 0; k < count; k++) {
    rows.push({ time_tag: date + 'T' + pad2(k * 3) + ':00:00', kp: (k % 9), observed: 'predicted', noaa_scale: null });
  }
  return rows;
}
// Already-parsed {time, kp} bins (parseKpForecast's output shape) for synthetic date-groups
// passed directly to selectForecastDays without going through parseKpForecast.
function makeBins(date, count) {
  var bins = [];
  for (var k = 0; k < count; k++) {
    bins.push({ time: date + 'T' + pad2(k * 3) + ':00:00', kp: (k % 9) });
  }
  return bins;
}

if (W.parseKpForecast) {
  // Legacy array-of-arrays shape (row 0 = header) -- the shape pinned in the plan.
  // Clean 3-day payload (multiple of 8 per day): regression baseline for normal grouping.
  var legacyRows = [['time_tag', 'kp', 'observed', 'noaa_scale']];
  ['2026-07-10', '2026-07-11', '2026-07-12'].forEach(function (date) {
    for (var h = 0; h < 24; h += 3) {
      legacyRows.push([date + 'T' + pad2(h) + ':00:00', (h / 3 % 9).toFixed(2), 'predicted', null]);
    }
  });
  var legacyGroups = W.parseKpForecast(legacyRows);
  check('parseKpForecast (legacy, clean 3-day payload) -> 3 date-groups', legacyGroups.length === 3);
  check('parseKpForecast (legacy) groups keyed by calendar date, in order',
    legacyGroups.map(function (g) { return g.date; }).join(',') === '2026-07-10,2026-07-11,2026-07-12');
  check('parseKpForecast (legacy) groups are 8 bins each',
    legacyGroups.every(function (g) { return g.bins.length === 8; }));
  check('parseKpForecast (legacy) header row skipped (first kp numeric, not NaN)',
    !isNaN(legacyGroups[0].bins[0].kp) && legacyGroups[0].bins[0].kp === 0);
  check('parseKpForecast (legacy) values are numeric', typeof legacyGroups[0].bins[0].kp === 'number');

  // Live shape: NOAA actually serves an array of objects (no header row) as of 2026-07-10,
  // contradicting the plan's pinned "array-of-arrays" shape -- verified via curl against the
  // real endpoint during this build (see task2 report). parseKpForecast must handle both.
  var liveRows = [].concat(makeDayRows('2026-07-10', 8), makeDayRows('2026-07-11', 8), makeDayRows('2026-07-12', 8));
  var liveGroups = W.parseKpForecast(liveRows);
  check('parseKpForecast (live object shape, clean 3-day payload) -> 3 date-groups', liveGroups.length === 3);
  check('parseKpForecast (live shape) values numeric', typeof liveGroups[0].bins[0].kp === 'number');

  check('parseKpForecast empty input -> []', W.parseKpForecast([]).length === 0);

  // --- Live-data reproduction: the exact shape that broke index-based chunking ---
  // Reproduces the real NOAA payload pulled live during this fix (2026-07-10, via curl
  // against the production endpoint): 81 rows total, 10 calendar dates with a clean 8 bins
  // each (2026-07-03..2026-07-12) followed by a trailing stub day of exactly 1 bin
  // (2026-07-13T00:00:00). 81 is not a multiple of 8: the old `j += 8` index chunking put
  // the boundary between calendar days out of sync with the last (1-bin) day, so
  // `groups.slice(-3)` grabbed 07-11/07-12/the 1-bin stub -- silently dropping TODAY
  // (07-10) and rendering the stub as one bar stretched full-width (flex 1 1 0).
  var reproDates = ['2026-07-03', '2026-07-04', '2026-07-05', '2026-07-06', '2026-07-07',
    '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12'];
  var reproRows = [];
  reproDates.forEach(function (date) { reproRows = reproRows.concat(makeDayRows(date, 8)); });
  reproRows.push({ time_tag: '2026-07-13T00:00:00', kp: 2.33, observed: 'predicted', noaa_scale: null });
  var reproGroups = W.parseKpForecast(reproRows);
  check('parseKpForecast (live reproduction, 81 rows, not a multiple of 8) -> 11 date-groups',
    reproRows.length === 81 && reproGroups.length === 11);
  check('parseKpForecast (live reproduction) trailing stub day is its own 1-bin group',
    reproGroups[10].date === '2026-07-13' && reproGroups[10].bins.length === 1);
  check('parseKpForecast (live reproduction) today (07-10) keeps its full 8 bins',
    reproGroups[7].date === '2026-07-10' && reproGroups[7].bins.length === 8);

  // --- selectForecastDays: today + next 2 by calendar date, not "last 3 groups" ---
  if (W.selectForecastDays) {
    var todayNow = new Date(2026, 6, 10, 12, 0, 0); // 2026-07-10 noon local
    var picked = W.selectForecastDays(reproGroups, todayNow);
    check('selectForecastDays picks today+2 by date, not the last 3 groups',
      picked.map(function (g) { return g.date; }).join(',') === '2026-07-10,2026-07-11,2026-07-12');
    check('selectForecastDays does NOT drop today (the bug: old .slice(-3) dropped 07-10)',
      picked[0].date === '2026-07-10' && picked[0].bins.length === 8);
    check('selectForecastDays excludes the 1-bin phantom day (07-13) entirely',
      picked.every(function (g) { return g.date !== '2026-07-13'; }));
    check('selectForecastDays per-day bin counts are [8,8,8] here (no malformed group)',
      picked.map(function (g) { return g.bins.length; }).join(',') === '8,8,8');

    var afterPayloadNow = new Date(2026, 6, 20); // 2026-07-20: after the whole payload
    var fallbackLast = W.selectForecastDays(reproGroups, afterPayloadNow);
    check('selectForecastDays falls back to the last 3 days when today is past the payload',
      fallbackLast.map(function (g) { return g.date; }).join(',') === '2026-07-11,2026-07-12,2026-07-13');

    var beforePayloadNow = new Date(2026, 5, 20); // 2026-06-20: before the whole payload
    var fallbackFirst = W.selectForecastDays(reproGroups, beforePayloadNow);
    check('selectForecastDays falls back to the first 3 days when today is before the payload',
      fallbackFirst.map(function (g) { return g.date; }).join(',') === '2026-07-03,2026-07-04,2026-07-05');

    var partialToday = [
      { date: '2026-08-01', bins: makeBins('2026-08-01', 2) },
      { date: '2026-08-02', bins: makeBins('2026-08-02', 8) },
      { date: '2026-08-03', bins: makeBins('2026-08-03', 8) }
    ];
    var partialPicked = W.selectForecastDays(partialToday, new Date(2026, 7, 1, 12, 0, 0));
    check('selectForecastDays keeps a genuinely partial today at its real bin count (no padding/stretch)',
      partialPicked[0].date === '2026-08-01' && partialPicked[0].bins.length === 2);

    check('selectForecastDays empty input -> []', W.selectForecastDays([], new Date()).length === 0);
  } else {
    check('selectForecastDays implemented', false);
  }
} else {
  check('parseKpForecast implemented', false);
}

console.log(ran + ' checks, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
