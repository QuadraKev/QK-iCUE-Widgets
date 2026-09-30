#!/usr/bin/env node
// Extracts the pure-logic region from QKLavaLamp/index.html and unit-tests it.
// Run from repo root: node tools/test-lava-lamp.js
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'widgets', 'QKLavaLamp', 'index.html'), 'utf8');
const m = html.match(/\/\/ @testable-start([\s\S]*?)\/\/ @testable-end/);
if (!m) { console.error('FAIL: @testable markers not found in index.html'); process.exit(1); }

const exportNames = ['LAVA', 'createSim', 'heatScale', 'waxBudget', 'stirFactor', 'lavaPrng',
  'LAMP_GEOM', 'computeLampLayout', 'computeFillLayout', 'insideBottle', 'mapPointer',
  'PRESETS', 'parseHexColor', 'resolveColors', 'contrastRatio'];
const fn = new Function(m[1] + '\nreturn {' + exportNames.map(n => n + ': (typeof ' + n + ' !== "undefined" ? ' + n + ' : undefined)').join(',') + '};');
const W = fn();

let failed = 0, ran = 0;
function check(name, cond) {
  ran++;
  if (!cond) { failed++; console.error('FAIL: ' + name); }
  else console.log('ok: ' + name);
}

// ---- helpers
const STEP = 1 / 60;
function finiteBlob(b) {
  return ['x', 'y', 'vx', 'vy', 'vol', 'r', 'T', 'stretch', 'mergeCooldown', 'target'].every(k => Number.isFinite(b[k]));
}
function allFinite(sim) {
  return sim.blobs.every(finiteBlob) && Number.isFinite(sim.pool.vol) && Number.isFinite(sim.pool.T) &&
    sim.tails.every(t => Number.isFinite(t.x) && Number.isFinite(t.y) && Number.isFinite(t.r) && Number.isFinite(t.w));
}
function inBounds(sim) {
  return sim.blobs.every(b => b.x >= -b.r && b.x <= sim.width + b.r && b.y >= -b.r && b.y <= 1 + b.r);
}
function snapshot(sim) {
  return JSON.stringify({ blobs: sim.blobs, pool: sim.pool, time: sim.time });
}
// Runs `steps` substeps. Optional per-step hook. Returns stats.
function run(sim, steps, hook) {
  const st = { maxCount: 0, bounds: true, finite: true, maxZeroRun: 0 };
  let zeroRun = 0;
  for (let i = 0; i < steps; i++) {
    if (hook) hook(sim, i);
    sim.step(STEP);
    if (sim.blobs.length > st.maxCount) st.maxCount = sim.blobs.length;
    if (!inBounds(sim)) st.bounds = false;
    if (i % 60 === 0 && !allFinite(sim)) st.finite = false;
    if (sim.time > 20) {
      if (sim.blobs.length === 0) { zeroRun += STEP; if (zeroRun > st.maxZeroRun) st.maxZeroRun = zeroRun; }
      else zeroRun = 0;
    }
  }
  if (!allFinite(sim)) st.finite = false;
  return st;
}
// Moves every blob into the pool (volume conserved). For white-box setups.
function clearToPool(sim) {
  sim.pool.vol = sim.total();
  sim.blobs.length = 0;
}
// Takes `vol` from the pool into a new blob (volume conserved).
function addBlob(sim, x, y, vol, T) {
  sim.pool.vol -= vol;
  const b = { id: 90000 + sim.blobs.length, x: x, y: y, vx: 0, vy: 0, vol: vol, r: Math.sqrt(vol / Math.PI),
              T: T, stretch: 1, mergeCooldown: 0, target: 0 };
  sim.blobs.push(b);
  return b;
}
function findById(sim, id) { return sim.blobs.find(b => b.id === id); }
// Half the interior width at height y for a tapered sim (mirrors halfW in index.html).
function taperHalfW(width, taper, y) {
  return (width / 2) * (1 - (1 - taper) * Math.min(1, Math.max(0, y)));
}

// The reference run: seed 1, aspect 2.43, wax 5, 20000 substeps at the given heat.
// It tracks every bud's spawn-to-descent time (the first descent after it passes
// y = 0.5) and the longest hover (|vy| < 0.01 inside 0.3 < y < 0.8 after 20 s).
// The hooks only read state, so the run is the same as a plain run. Memoized per heat.
const seed1Runs = {};
function seed1Run(heat) {
  if (seed1Runs[heat]) return seed1Runs[heat];
  const sim = W.createSim({ seed: 1, aspect: 2.43, heat: heat, waxAmount: 5 });
  const buds = new Map(), rises = [], hover = new Map();
  let maxHover = 0;
  sim.onBud = function (b) { buds.set(b.id, { t0: sim.time, done: false }); };
  const st = run(sim, 20000, function (s) {
    for (const b of s.blobs) {
      const rec = buds.get(b.id);
      if (rec && !rec.done && b.y > 0.5 && b.vy < 0) { rec.done = true; rises.push(s.time - rec.t0); }
    }
    if (s.time <= 20) return;
    for (const b of s.blobs) {
      if (Math.abs(b.vy) < 0.01 && b.y > 0.3 && b.y < 0.8) {
        const h = (hover.get(b.id) || 0) + STEP; hover.set(b.id, h); if (h > maxHover) maxHover = h;
      } else hover.delete(b.id);
    }
  });
  rises.sort((a, b) => a - b);
  const median = rises.length ? rises[rises.length >> 1] : NaN;
  seed1Runs[heat] = { sim: sim, st: st, tracked: rises.length, median: median, maxHover: maxHover };
  return seed1Runs[heat];
}

// ================= Task 2: simulation =================
if (W.createSim) {
  // Heat and budget helpers
  check('heatScale(5) is 1', Math.abs(W.heatScale(5) - 1) < 1e-12);
  check('heatScale(1) is HEAT_LO', Math.abs(W.heatScale(1) - W.LAVA.HEAT_LO) < 1e-12);
  check('heatScale(10) is HEAT_HI', Math.abs(W.heatScale(10) - W.LAVA.HEAT_HI) < 1e-12);
  check('heatScale rises monotonically', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].every((h, i, a) => i === 0 || W.heatScale(h) > W.heatScale(a[i - 1])));
  check('heatScale of a string uses the number', W.heatScale('7') === W.heatScale(7));
  check('heatScale of garbage falls back to 5', W.heatScale('abc') === 1 && W.heatScale(undefined) === 1);
  const bHM = W.waxBudget(1.21, 5, 64);
  check('waxBudget HM wax 5: N = 20', bHM.N === 20);
  check('waxBudget HM wax 5: V = f * A', Math.abs(bHM.V - (0.25 + 0.1 * 4 / 9) * 1.21) < 1e-12);
  check('waxBudget clamps N to 48', W.waxBudget(3.64, 10, 64).N === 48);
  check('waxBudget clamps N to at least 2', W.waxBudget(0.42, 1, 64).N === 2);
  check('waxBudget Lamp slice 10 limits N to 7', W.waxBudget(0.42, 10, 10).N === 7);
  check('waxBudget Vb = V / N', Math.abs(bHM.Vb - bHM.V / bHM.N) < 1e-12);

  // Determinism
  const d1 = W.createSim({ seed: 42, aspect: 2.43, heat: 5, waxAmount: 5 });
  const d2 = W.createSim({ seed: 42, aspect: 2.43, heat: 5, waxAmount: 5 });
  run(d1, 3000); run(d2, 3000);
  check('determinism: same seed gives the same state', snapshot(d1) === snapshot(d2));
  const d3 = W.createSim({ seed: 43, aspect: 2.43, heat: 5, waxAmount: 5 });
  run(d3, 3000);
  check('determinism: another seed gives another state', snapshot(d1) !== snapshot(d3));

  // Long runs: conservation, NaN, bounds, count, all behaviors
  [5, 10].forEach(function (heat) {
    const r = seed1Run(heat), sim = r.sim, st = r.st;
    check('heat ' + heat + ': volume conserved within 1e-6', Math.abs(sim.total() - sim.V) < 1e-6);
    check('heat ' + heat + ': no NaN', st.finite);
    check('heat ' + heat + ': blobs stay in bounds', st.bounds);
    check('heat ' + heat + ': count never exceeds the cap', st.maxCount <= sim.cap);
    check('heat ' + heat + ': count never stays at zero for more than 3 s', st.maxZeroRun <= 3);
    check('heat ' + heat + ': buds, merges and absorptions happen', sim.events.buds > 0 && sim.events.merges > 0 && sim.events.absorbs > 0);
  });

  // Splits happen at Heat 5
  check('heat 5: rising blobs split', seed1Run(5).sim.events.splits > 0);

  // Lamp-style slice: cap 10
  const lampSim = W.createSim({ seed: 3, aspect: 0.42, heat: 5, waxAmount: 10, cap: 10 });
  const lst = run(lampSim, 20000);
  check('lamp slice: count never exceeds 10', lst.maxCount <= 10);
  check('lamp slice: volume conserved', Math.abs(lampSim.total() - lampSim.V) < 1e-6);
  check('lamp slice: cycle keeps budding', lampSim.events.buds > 20 && lampSim.events.absorbs > 0);

  // Tapered walls (Lamp style): every blob center stays inside the narrowing walls.
  // Each seeded blob starts at the straight wall on its side, moving outward, so
  // straight walls would fail the check.
  const TAPER = 0.8;
  const tp = W.createSim({ seed: 3, aspect: 0.42, heat: 10, waxAmount: 10, cap: 10, taper: TAPER });
  for (const b of tp.blobs) {
    if (b.x < tp.width / 2) { b.x = 0; b.vx = -0.5; } else { b.x = tp.width; b.vx = 0.5; }
  }
  let tpInside = true, tpSeen = 0;
  for (let i = 0; i < 1200; i++) {
    tp.step(STEP);
    const cx = tp.width / 2;
    for (const b of tp.blobs) {
      if (Math.abs(b.x - cx) > taperHalfW(tp.width, TAPER, b.y) + 1e-9) tpInside = false;
      tpSeen++;
    }
  }
  check('taper keeps blobs inside the narrowing walls', tpInside && tpSeen > 0);

  // Wall force: a blob outside the left wall gets pushed back in. The bound is the
  // largest velocity that convection alone can add in one substep.
  const CONV_BOUND = 1.5 * W.LAVA.KCONV * STEP;
  const wf = W.createSim({ seed: 7, aspect: 2.43, heat: 5, waxAmount: 5, taper: 1 });
  clearToPool(wf);
  const wb = addBlob(wf, -0.05, 0.5, wf.Vb, 0.5);
  wf.step(1 / 60);
  const wbAfter = findById(wf, wb.id);
  check('wall force pushes an outside blob back in', !!wbAfter && wbAfter.vx > CONV_BOUND);

  // Tapered wall force: at y = 0.9 the blob is inside the clamp and right of r, but
  // left of the tapered force limit cx - halfW + r. Only a tapered force pushes it.
  const tf = W.createSim({ seed: 7, aspect: 0.42, heat: 5, waxAmount: 5, taper: TAPER });
  clearToPool(tf);
  const tfb = addBlob(tf, 0.06, 0.9, Math.PI * 0.05 * 0.05, 0.5);
  tf.step(STEP);
  const tfAfter = findById(tf, tfb.id);
  check('tapered wall force pushes a blob in below the straight-wall limit', !!tfAfter && tfAfter.vx > CONV_BOUND);

  // taper 0 clamps to the 0.5 minimum: a blob at x = 0 near the top ends on the 0.5 wall
  const t0s = W.createSim({ seed: 7, aspect: 0.42, heat: 5, waxAmount: 5, taper: 0 });
  clearToPool(t0s);
  const t0b = addBlob(t0s, 0, 0.99, Math.PI * 0.05 * 0.05, 0.5);
  t0s.step(STEP);
  const t0After = findById(t0s, t0b.id);
  check('taper 0 clamps to the 0.5 minimum', !!t0After &&
    Math.abs(t0After.x - (t0s.width / 2 - taperHalfW(t0s.width, 0.5, t0After.y))) < 1e-9);

  // Split children stay inside the tapered walls: a blob primed to split sits on the
  // left clamp limit and rises, so one child lands past the wall unless it is clamped.
  const sc = W.createSim({ seed: 7, aspect: 0.42, heat: 5, waxAmount: 5, taper: TAPER });
  clearToPool(sc);
  const scb = addBlob(sc, sc.width / 2 - taperHalfW(sc.width, TAPER, 0.5), 0.5, 2.5 * sc.Vb, 0.9);
  scb.vy = 0.3;
  sc.step(STEP);
  check('split children stay inside the tapered walls', sc.events.splits === 1 &&
    sc.blobs.every(b => Math.abs(b.x - sc.width / 2) <= taperHalfW(sc.width, TAPER, b.y) + 1e-9));

  // Cap gate: with the count at the cap, a primed blob neither splits nor drips.
  // Each setup is 1 primed blob plus 9 small fillers (10 blobs). The control at
  // cap 11 proves the blob is primed.
  function capSetup(cap, seed, primedY, primedVol, primedT) {
    const sim = W.createSim({ seed: seed, aspect: 2.43, heat: 5, waxAmount: 5, cap: cap });
    clearToPool(sim);
    const primed = addBlob(sim, 1.2, primedY, primedVol * sim.Vb, primedT);
    for (let k = 0; k < 9; k++) addBlob(sim, 0.15 + 0.25 * k, 0.3, 0.05 * sim.Vb, 0.45).mergeCooldown = 1;
    return { sim: sim, primed: primed };
  }
  function capSplit(cap) {
    const c = capSetup(cap, 7, 0.5, 2.5, 0.9);
    c.primed.vy = 0.3;
    c.sim.step(STEP);
    return c.sim;
  }
  const cs10 = capSplit(10), cs11 = capSplit(11);
  check('cap gate: no split at the cap', cs10.blobs.length === 10 && cs10.events.splits === 0 &&
    cs10.events.drips === 0 && cs11.events.splits === 1);
  // Drip is a 0.3 per second random event, so this runs 20 s with every blob pinned.
  function capDrip(cap) {
    const c = capSetup(cap, 5, 0.95, 3, 0.3);
    const pins = new Map(c.sim.blobs.map(b => [b.id, { y: b.y, T: b.T }]));
    const st = run(c.sim, 1200, function (sim) {
      for (const b of sim.blobs) {
        const p = pins.get(b.id);
        if (p) { b.y = p.y; b.vy = 0; b.T = p.T; b.mergeCooldown = 1; }
      }
    });
    return { sim: c.sim, st: st };
  }
  const cd10 = capDrip(10), cd11 = capDrip(11);
  check('cap gate: no drip at the cap', cd10.st.maxCount <= 10 && cd10.sim.blobs.length === 10 &&
    cd10.sim.events.drips === 0 && cd10.sim.events.splits === 0 && cd11.sim.events.drips >= 1);

  // Very tall fill (VXL) keeps cycling
  const vxl = W.createSim({ seed: 2, aspect: 0.27, heat: 5, waxAmount: 5 });
  run(vxl, 20000);
  check('VXL fill: cycle keeps budding', vxl.events.buds > 10 && vxl.events.absorbs > 0);

  // Drip: pin a big cold blob at the ceiling
  const dr = W.createSim({ seed: 5, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(dr);
  const parent = addBlob(dr, 1.2, 0.95, 4 * dr.Vb, 0.3);
  const pid = parent.id;
  run(dr, 1200, function (sim) {
    const p = findById(sim, pid);
    if (p) { p.y = 0.95; p.vy = 0; p.T = 0.3; }
  });
  check('drip: a cold blob at the ceiling drips', dr.events.drips >= 1);
  check('drip: volume conserved', Math.abs(dr.total() - dr.V) < 1e-9);

  // Cycle time at Heat 5, aspect 2.43: spawn -> first descent after it passes y = 0.5
  const cy = seed1Run(5), median = cy.median;
  console.log('   cycle: ' + cy.tracked + ' tracked buds, median ' + median.toFixed(1) + ' s');
  check('cycle: at least 10 tracked buds', cy.tracked >= 10);
  check('cycle: median spawn-to-descent is 10 to 20 s at Heat 5', median >= 10 && median <= 20);

  // Pace order: Heat 1 slower than Heat 5 slower than Heat 10
  const m1 = seed1Run(1).median, m10 = seed1Run(10).median;
  console.log('   pace: Heat 1 ' + m1.toFixed(1) + ' s, Heat 5 ' + median.toFixed(1) + ' s, Heat 10 ' + m10.toFixed(1) + ' s');
  check('pace: Heat 1 > Heat 5 > Heat 10', m1 > median && median > m10);

  // No hover: after warm-up no blob keeps |vy| < 0.01 inside 0.3 < y < 0.8 for more than 10 s
  const maxHover = seed1Run(5).maxHover;
  console.log('   hover: longest ' + maxHover.toFixed(1) + ' s');
  check('no hover longer than 10 s', maxHover <= 10);

  // Settings and resize keep the budget
  const rs = W.createSim({ seed: 9, aspect: 2.43, heat: 5, waxAmount: 5 });
  run(rs, 600);
  rs.setWaxAmount(10);
  check('setWaxAmount: total equals the new V', Math.abs(rs.total() - rs.V) < 1e-9 && Math.abs(rs.V - 0.35 * 2.43) < 1e-12);
  rs.resize(1.21);
  check('resize: width follows the aspect', rs.width === 1.21);
  check('resize: total equals the new V', Math.abs(rs.total() - rs.V) < 1e-9 && Math.abs(rs.V - 0.35 * 1.21) < 1e-12);
  check('resize: blobs stay in bounds', inBounds(rs));

  // Review Focus: strings, garbage and degenerate inputs
  const rf = W.createSim({ seed: 11, aspect: 2.43, heat: '7', waxAmount: '5' });
  rf.setHeat('abc'); rf.setWaxAmount(undefined);
  run(rf, 600);
  check('review: string and garbage settings keep the state finite', allFinite(rf) && Math.abs(rf.total() - rf.V) < 1e-9);
  const t0 = rf.time;
  rf.step(30);
  check('review: a 30 s frame gap advances at most 0.1 s', rf.time - t0 <= 0.1 + STEP + 1e-9);
  const t1 = rf.time;
  rf.step(-1); rf.step(NaN); rf.step(Infinity);
  check('review: negative, NaN and Infinity dt do not explode', rf.time - t1 <= 0.1 + STEP + 1e-9 && allFinite(rf));
  const t2 = rf.time;
  for (let i = 0; i < 30; i++) rf.step(STEP);
  check('review: normal frames advance the time again after bad dt', Math.abs(rf.time - t2 - 0.5) <= 0.02);
  rf.resize(0); rf.resize(NaN); rf.resize(-3);
  check('review: resize(0), resize(NaN), resize(-3) keep the state finite', allFinite(rf) && rf.width > 0 && Math.abs(rf.total() - rf.V) < 1e-9);
} else {
  check('createSim implemented', false);
}

console.log(ran + ' checks, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
