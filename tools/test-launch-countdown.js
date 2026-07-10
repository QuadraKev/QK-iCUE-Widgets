#!/usr/bin/env node
// Extracts the pure-logic region from QKLaunchCountdown/index.html and unit-tests it.
// Run from repo root: node tools/test-launch-countdown.js
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'widgets', 'QKLaunchCountdown', 'index.html'), 'utf8');
const m = html.match(/\/\/ @testable-start([\s\S]*?)\/\/ @testable-end/);
if (!m) { console.error('FAIL: @testable markers not found in index.html'); process.exit(1); }

const exportNames = ['fmtCountdown', 'fmtRelative', 'pickCurrent', 'shortName'];
const fn = new Function(m[1] + '\nreturn {' + exportNames.map(n => n + ': (typeof ' + n + ' !== "undefined" ? ' + n + ' : undefined)').join(',') + '};');
const W = fn();

let failed = 0, ran = 0;
function check(name, cond) {
  ran++;
  if (!cond) { failed++; console.error('FAIL: ' + name); }
  else console.log('ok: ' + name);
}

// --- fmtCountdown ---
if (W.fmtCountdown) {
  check('fmtCountdown >24h shows day', W.fmtCountdown(90061000) === 'T-1d 01:01:01');
  check('fmtCountdown <24h no day', W.fmtCountdown(3661000) === 'T-01:01:01');
  check('fmtCountdown negative is T+', W.fmtCountdown(-61000) === 'T+00:01:01');
  check('fmtCountdown zero is T-00:00:00', W.fmtCountdown(0) === 'T-00:00:00');
  // Day-collapse boundary is inclusive on the >=24h side: at exactly 86400000ms,
  // totalSec=86400 -> days=Math.floor(86400/86400)=1, so the day component shows
  // (T-1d 00:00:00), not T-24:00:00. Anything below 86400000ms omits the day.
  check('fmtCountdown exactly 24h shows day (inclusive boundary)', W.fmtCountdown(86400000) === 'T-1d 00:00:00');
} else {
  check('fmtCountdown implemented', false);
}

// --- fmtRelative ---
if (W.fmtRelative) {
  check('fmtRelative days+hours', W.fmtRelative(225000000) === '2d 14h');
  check('fmtRelative hours+minutes', W.fmtRelative(9000000) === '2h 30m');
  check('fmtRelative minutes only', W.fmtRelative(300000) === '5m');
} else {
  check('fmtRelative implemented', false);
}

// --- pickCurrent ---
if (W.pickCurrent) {
  var NOW = Date.UTC(2026, 0, 1, 12, 0, 0);
  var iso = function (offsetMs) { return new Date(NOW + offsetMs).toISOString(); };
  var launches = [
    { id: 'old-failure', name: 'Rocket A | Old Failure', net: iso(-3 * 3600000), status: { abbrev: 'Failure' } },
    { id: 'recent-go', name: 'Rocket B | Recent Go', net: iso(-10 * 60000), status: { abbrev: 'Go' } },
    { id: 'recent-failure', name: 'Rocket C | Recent Failure', net: iso(-6 * 60000), status: { abbrev: 'Failure' } },
    { id: 'upcoming-go', name: 'Rocket D | Upcoming Go', net: iso(3600000), status: { abbrev: 'Go' } },
    { id: 'upcoming-tbd', name: 'Rocket E | Upcoming TBD', net: iso(3 * 3600000), status: { abbrev: 'TBD' } }
  ];

  var pickedTPlusOn = W.pickCurrent(launches, NOW, true);
  check('pickCurrent T+ window keeps just-launched Go (tPlus true)', pickedTPlusOn && pickedTPlusOn.id === 'recent-go');

  var pickedTPlusOff = W.pickCurrent(launches, NOW, false);
  check('pickCurrent advances past just-launched Go (tPlus false)', pickedTPlusOff && pickedTPlusOff.id === 'upcoming-go');

  var boundaryLaunches = [
    { id: 'recent-failure', name: 'Rocket C | Recent Failure', net: iso(-6 * 60000), status: { abbrev: 'Failure' } },
    { id: 'upcoming-go', name: 'Rocket D | Upcoming Go', net: iso(3600000), status: { abbrev: 'Go' } }
  ];
  var pickedBoundary = W.pickCurrent(boundaryLaunches, NOW, true);
  check('pickCurrent terminal >5min ago always skipped (even tPlus true)', pickedBoundary && pickedBoundary.id === 'upcoming-go');

  var generalSkip = W.pickCurrent([
    { id: 'old-failure', name: 'Rocket A | Old Failure', net: iso(-3 * 3600000), status: { abbrev: 'Failure' } },
    { id: 'upcoming-tbd', name: 'Rocket E | Upcoming TBD', net: iso(3 * 3600000), status: { abbrev: 'TBD' } }
  ], NOW, true);
  check('pickCurrent skips terminal generally', generalSkip && generalSkip.id === 'upcoming-tbd');

  check('pickCurrent empty array returns null', W.pickCurrent([], NOW, true) === null);

  // Boundary: T+ window is `-deltaMs <= 30 * 60000`, i.e. inclusive at exactly 30:00 ago.
  var boundary30 = W.pickCurrent([
    { id: 'boundary-30', name: 'Rocket F | Boundary 30', net: iso(-30 * 60000), status: { abbrev: 'Go' } }
  ], NOW, true);
  check('pickCurrent keeps entry exactly at 30-min T+ edge (inclusive)', boundary30 && boundary30.id === 'boundary-30');

  // Boundary: terminal-display window is `-deltaMs <= 5 * 60000`, i.e. inclusive at exactly 5:00 ago.
  var boundary5 = W.pickCurrent([
    { id: 'boundary-5', name: 'Rocket G | Boundary 5', net: iso(-5 * 60000), status: { abbrev: 'Failure' } }
  ], NOW, true);
  check('pickCurrent keeps terminal entry exactly at 5-min display edge (inclusive)', boundary5 && boundary5.id === 'boundary-5');
} else {
  check('pickCurrent implemented', false);
}

// --- shortName ---
if (W.shortName) {
  check('shortName strips vehicle prefix', W.shortName('Falcon 9 Block 5 | Starlink Group 10-42') === 'Starlink Group 10-42');
  check('shortName passes through when no pipe', W.shortName('Ariane 6 Debut') === 'Ariane 6 Debut');
} else {
  check('shortName implemented', false);
}

console.log(ran + ' checks, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
