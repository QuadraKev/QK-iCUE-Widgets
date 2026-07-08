#!/usr/bin/env node
// Extracts the pure-math region from QKISSTracker/index.html and unit-tests it.
// Run from repo root: node tools/test-iss-tracker.js
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'widgets', 'QKISSTracker', 'index.html'), 'utf8');
const m = html.match(/\/\/ @testable-start([\s\S]*?)\/\/ @testable-end/);
if (!m) { console.error('FAIL: @testable markers not found in index.html'); process.exit(1); }

const exportNames = ['LAT_MAX', 'projX', 'projY', 'decodeCoastline', 'haversineKm', 'wrapLon',
                     'subsolarPoint', 'isNight', 'slerpPoint', 'splitAtAntimeridian', 'findPassInSamples'];
const fn = new Function(m[1] + '\nreturn {' + exportNames.map(n => n + ': (typeof ' + n + ' !== "undefined" ? ' + n + ' : undefined)').join(',') + '};');
const W = fn();

let failed = 0, ran = 0;
function check(name, cond) {
  ran++;
  if (!cond) { failed++; console.error('FAIL: ' + name); }
  else console.log('ok: ' + name);
}

// --- Task 3 cases: projection + packing + distance ---
check('projX west edge', W.projX(-180, 1000) === 0);
check('projX east edge', W.projX(180, 1000) === 1000);
check('projX greenwich', W.projX(0, 1000) === 500);
check('projY north crop', W.projY(75, 300) === 0);
check('projY south crop', W.projY(-75, 300) === 300);
check('projY equator', W.projY(0, 300) === 150);
check('projY clamps beyond crop', W.projY(90, 300) === 0 && W.projY(-90, 300) === 300);
check('wrapLon wraps east', W.wrapLon(190) === -170);
check('wrapLon wraps west', W.wrapLon(-190) === 170);
check('wrapLon identity', W.wrapLon(45) === 45);

// haversine: London (51.5074,-0.1278) -> Paris (48.8566,2.3522) ≈ 343.5 km
const lp = W.haversineKm(51.5074, -0.1278, 48.8566, 2.3522);
check('haversine London-Paris ~343.5km', Math.abs(lp - 343.5) < 2);
check('haversine zero distance', W.haversineKm(10, 20, 10, 20) === 0);

// decodeCoastline round-trip on a tiny hand-packed fixture:
// 1 ring, 3 points: (0,0), (10.0,5.0), (-10.0,-5.0) quantized x10
// stream: varint(1), varint(3), zz(0),zz(0), zz(100),zz(50), zz(-200),zz(-100)
(function () {
  const zigzag = n => (n << 1) ^ (n >> 31);
  const bytes = [];
  function pv(u) { while (u > 127) { bytes.push((u & 127) | 128); u >>>= 7; } bytes.push(u); }
  pv(1); pv(3);
  [[0, 0], [100, 50], [-200, -100]].forEach(([dx, dy]) => { pv(zigzag(dx)); pv(zigzag(dy)); });
  const b64 = Buffer.from(bytes).toString('base64');
  const rings = W.decodeCoastline(b64);
  check('decode ring count', rings.length === 1);
  check('decode point count', rings[0].length === 6);
  check('decode p0', rings[0][0] === 0 && rings[0][1] === 0);
  check('decode p1', rings[0][2] === 10 && rings[0][3] === 5);
  check('decode p2', rings[0][4] === -10 && rings[0][5] === -5);
})();

console.log(ran + ' checks, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
