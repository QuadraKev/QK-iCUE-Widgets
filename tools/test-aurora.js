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
  'stormLabel', 'parseKpForecast'
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

// --- parseKpForecast ---
if (W.parseKpForecast) {
  // Legacy array-of-arrays shape (row 0 = header) -- the shape pinned in the plan.
  var legacyRows = [['time_tag', 'kp', 'observed', 'noaa_scale']];
  for (var i = 0; i < 24; i++) {
    legacyRows.push(['2026-07-10T' + (i % 24) + ':00:00', (i % 9).toFixed(2), 'predicted', null]);
  }
  var legacyGroups = W.parseKpForecast(legacyRows);
  check('parseKpForecast (legacy, 25 rows incl header) -> 3 groups', legacyGroups.length === 3);
  check('parseKpForecast (legacy) groups are 8 bins each',
    legacyGroups.every(function (g) { return g.length === 8; }));
  check('parseKpForecast (legacy) header row skipped (first kp numeric, not NaN)',
    !isNaN(legacyGroups[0][0].kp) && legacyGroups[0][0].kp === 0);
  check('parseKpForecast (legacy) values are numeric', typeof legacyGroups[0][0].kp === 'number');

  // Live shape: NOAA actually serves an array of objects (no header row) as of 2026-07-10,
  // contradicting the plan's pinned "array-of-arrays" shape -- verified via curl against the
  // real endpoint during this build (see task2 report). parseKpForecast must handle both.
  var liveRows = [];
  for (var j = 0; j < 24; j++) {
    liveRows.push({ time_tag: '2026-07-10T' + (j % 24) + ':00:00', kp: (j % 9), observed: 'predicted', noaa_scale: null });
  }
  var liveGroups = W.parseKpForecast(liveRows);
  check('parseKpForecast (live object-array shape, 24 rows, no header) -> 3 groups', liveGroups.length === 3);
  check('parseKpForecast (live shape) values numeric', typeof liveGroups[0][0].kp === 'number');

  check('parseKpForecast empty input -> []', W.parseKpForecast([]).length === 0);
} else {
  check('parseKpForecast implemented', false);
}

console.log(ran + ' checks, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
