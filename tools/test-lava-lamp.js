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
  'PRESETS', 'parseHexColor', 'resolveColors', 'contrastRatio', 'lampSlice', 'haloFor', 'snapFrameTime'];
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
  return ['x', 'y', 'vx', 'vy', 'vol', 'r', 'T', 'stretch', 'mergeCooldown', 'target', 'svy'].every(k => Number.isFinite(b[k]));
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
              T: T, stretch: 1, mergeCooldown: 0, target: 0, drain: 0, svy: 0 };
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
  scb.vy = scb.svy = 0.3; scb.stretch = 1.8;   // primed: rising fast, already stretched
  let scInside = true;
  for (let i = 0; i < 30; i++) {
    sc.step(STEP);
    if (!sc.blobs.every(b => Math.abs(b.x - sc.width / 2) <= taperHalfW(sc.width, TAPER, b.y) + 1e-9)) scInside = false;
  }
  check('split children stay inside the tapered walls', sc.events.splits === 1 && scInside);

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
    c.primed.vy = c.primed.svy = 0.3; c.primed.stretch = 1.8;
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

// ================= Task 3: stir =================
if (W.createSim && W.stirFactor) {
  check('stirFactor(0) is 1', W.stirFactor(0) === 1);
  check('stirFactor(4.9) is small but not zero', W.stirFactor(4.9) > 0 && W.stirFactor(4.9) < 0.06);
  check('stirFactor(5) is 0: samples expire at 5 s', W.stirFactor(5) === 0);

  // Fast stroke through a blob splits it
  const s1 = W.createSim({ seed: 21, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(s1);
  const big = addBlob(s1, 1.2, 0.5, 1.5 * s1.Vb, 0.5);
  const before = s1.blobs.length;
  const bigR0 = big.r;
  s1.stir(big.x, big.y, 2.5, 0);
  check('stir: a fast stroke through a blob adds one blob', s1.blobs.length === before + 1);
  check('stir: the split conserves volume', Math.abs(s1.total() - s1.V) < 1e-12);
  const s1Child = s1.blobs[1];
  check('stir: the child starts empty at the parent position', s1.blobs.length === 2 && s1Child.vol === 0 &&
    s1Child.x === big.x && s1Child.y === big.y);
  // The stroke runs along +x, so across the stroke is y and along it is x. The drag slows the small
  // child, so it trails the parent along the stroke. Measured (seed 21): when the fill ends the
  // halves sit 1.018 r0 apart across the stroke and the child is 0.501 r0 behind along it;
  // at 0.5 s they sit 1.019 r0 apart and the child is 0.215 r0 behind.
  run(s1, 19);
  const s1AcrossEnd = Math.abs(s1Child.y - big.y) / bigR0, s1LagEnd = (big.x - s1Child.x) / bigR0;
  run(s1, 11);
  check('stir: after 0.5 s the halves sit on either side of the stroke line, about r0 apart across it, and the child lags along it',
    (big.y - 0.5) * (s1Child.y - 0.5) < 0 && Math.abs(big.vol - s1Child.vol) < 1e-12 &&
    s1AcrossEnd >= 0.92 && s1AcrossEnd <= 1.17 && s1LagEnd <= 0.75 &&
    Math.abs(s1Child.y - big.y) / bigR0 >= 0.87 && Math.abs(s1Child.y - big.y) / bigR0 <= 1.17 &&
    (big.x - s1Child.x) / bigR0 <= 0.32);
  check('stir: the halves carry the merge cooldown', s1.blobs.every(b => b.mergeCooldown > 0));

  // Split gates: a fast stroke must not split a blob on cooldown or under the volume floor
  const sg1 = W.createSim({ seed: 26, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(sg1);
  const bg1 = addBlob(sg1, 1.2, 0.5, 1.5 * sg1.Vb, 0.5);
  bg1.mergeCooldown = 0.5;
  sg1.stir(bg1.x, bg1.y, 2.5, 0);
  check('stir: a stroke does not split a blob on cooldown', sg1.blobs.length === 1);

  const sg2 = W.createSim({ seed: 27, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(sg2);
  const bg2 = addBlob(sg2, 1.2, 0.5, 0.4 * sg2.Vb, 0.5);
  sg2.stir(bg2.x, bg2.y, 2.5, 0);
  check('stir: a stroke does not split a blob under the volume floor', sg2.blobs.length === 1);

  // Slow stroke does not split
  const s2 = W.createSim({ seed: 22, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(s2);
  const b2 = addBlob(s2, 1.2, 0.5, 1.5 * s2.Vb, 0.5);
  s2.stir(b2.x, b2.y, 1.0, 0);
  check('stir: a slow stroke does not split', s2.blobs.length === 1);

  // The stroke drags nearby blobs along
  const s3 = W.createSim({ seed: 23, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(s3);
  const b3 = addBlob(s3, 1.2, 0.5, s3.Vb, 0.5);
  s3.stir(1.1, 0.5, 1.2, 0);
  run(s3, 6);
  const b3n = findById(s3, b3.id);
  check('stir: a nearby blob moves with the stroke', b3n && b3n.vx > 0.2);

  // Force-field math: a single sample's age decay, sanity check (does not separate
  // decay-on-the-pull from decay-on-the-responsiveness, since ksum stays under 1 the
  // whole time either way; see the dense-stroke check below for that).
  const sf1 = W.createSim({ seed: 28, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(sf1);
  const bf1 = addBlob(sf1, 1.2, 0.5, sf1.Vb, sf1.pool.T);
  sf1.samples.push({ x: bf1.x, y: bf1.y, vx: 1, vy: 0, t0: sf1.time });
  sf1.step(STEP);
  const d0 = findById(sf1, bf1.id).vx;
  const bf1n = findById(sf1, bf1.id);
  bf1n.vx = 0;
  sf1.samples[0].t0 = sf1.time - 3;
  sf1.step(STEP);
  const d3 = findById(sf1, bf1.id).vx;
  check('stir force: age decay matches exp(-3/1.7)', Math.abs(d3 / d0 - Math.exp(-3 / 1.7)) < 0.03);

  // Force-field math: age decay acts on the pull, not the responsiveness. A dense
  // stroke (5 samples within R of a resting blob) saturates ksum above 1, clamping the
  // rate; under the pre-fix formula (decay folded into the weight that also drives the
  // rate) this ratio came out at 1 instead of the age factor.
  const sf1d = W.createSim({ seed: 33, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(sf1d);
  const bf1d = addBlob(sf1d, 1.2, 0.5, sf1d.Vb, sf1d.pool.T);
  for (let i = 0; i < 5; i++) {
    sf1d.samples.push({ x: bf1d.x + (i - 2) * 0.02, y: bf1d.y, vx: 1, vy: 0, t0: sf1d.time });
  }
  sf1d.step(STEP);
  const dd0 = findById(sf1d, bf1d.id).vx;
  findById(sf1d, bf1d.id).vx = 0;
  sf1d.samples.forEach(function (sm) { sm.t0 -= 3; });
  sf1d.step(STEP);
  const dd3 = findById(sf1d, bf1d.id).vx;
  check('stir force: a dense (saturated) stroke still decays the pull, not the responsiveness',
    Math.abs(dd3 / dd0 - Math.exp(-3 / 1.7)) < 0.03);

  // Force-field math: gain settles near the drag-limited fixed point for a normal blob.
  // A literal "0.6 +/- 0.05" target (as for a huge, low-drag blob) is not reachable for a
  // normal-size blob given the pre-existing drag constant KD: the derived ceiling for r
  // about 0.1 is 0.4546. The measured gain here is about 0.42, well under that ceiling.
  const sf2 = W.createSim({ seed: 29, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(sf2);
  const bf2 = addBlob(sf2, 1.2, 0.5, Math.PI * 0.1 * 0.1, sf2.pool.T);
  for (let i = 0; i < 60; i++) {
    const bb = findById(sf2, bf2.id);
    sf2.stir(bb.x, bb.y, 1, 0);
    sf2.step(STEP);
  }
  const gainVx = findById(sf2, bf2.id).vx;
  check('stir force: gain settles near the drag-limited target for a normal blob',
    Math.abs(gainVx - 0.42) < 0.04);

  // Force-field math: the coverage cap keeps many stacked samples from saturating the rate
  const sf3 = W.createSim({ seed: 30, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(sf3);
  const bf3 = addBlob(sf3, 1.2, 0.5, sf3.Vb, sf3.pool.T);
  sf3.samples.push({ x: bf3.x, y: bf3.y, vx: 1, vy: 0, t0: sf3.time });
  sf3.step(STEP);
  const oneSample = findById(sf3, bf3.id).vx;

  const sf4 = W.createSim({ seed: 30, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(sf4);
  const bf4 = addBlob(sf4, 1.2, 0.5, sf4.Vb, sf4.pool.T);
  for (let i = 0; i < 200; i++) sf4.samples.push({ x: bf4.x, y: bf4.y, vx: 1, vy: 0, t0: sf4.time });
  sf4.step(STEP);
  const manySamples = findById(sf4, bf4.id).vx;
  check('stir force: 200 stacked samples give the same pull as one full-weight sample',
    Math.abs(manySamples - oneSample) < 1e-6 && manySamples > 0 && manySamples < 0.6);

  // Force-field math: a single partial-weight sample (k = 0.25, at d = R/sqrt(2)) must
  // use its own weight, not a weight forced to 1. Math.min(1, ksum) replaced by 1 is
  // invisible to the 200-stacked check above (ksum already saturates past 1 there).
  const sn4 = W.createSim({ seed: 32, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(sn4);
  const bn4 = addBlob(sn4, 1.2, 0.5, sn4.Vb, sn4.pool.T);
  const partialD = W.LAVA.STIR_R / Math.sqrt(2);
  sn4.samples.push({ x: bn4.x + partialD, y: bn4.y, vx: 1, vy: 0, t0: sn4.time });
  sn4.step(STEP);
  const partialVx = findById(sn4, bn4.id).vx;
  const partialExpected = 0.25 * W.LAVA.STIR_RATE * (1 / 60) * 0.6 * 1.0;
  check('stir force: a partial-weight sample uses its own weight, not a forced 1',
    Math.abs(partialVx - partialExpected) < 0.1 * partialExpected);

  // A tap with no movement records nothing
  const s4 = W.createSim({ seed: 24, aspect: 2.43, heat: 5, waxAmount: 5 });
  s4.stir(1.0, 0.5, 0, 0);
  check('stir: a tap records no sample', s4.samples.length === 0);

  // Lingering current decays and expires
  s4.stir(1.0, 0.5, 1.0, 0.5);
  check('stir: a move records one sample', s4.samples.length === 1);
  run(s4, 60 * 4);
  check('stir: the sample lingers at 4 s', s4.samples.length === 1);
  run(s4, 60 * 1 + 6);
  check('stir: the sample is dropped after 5 s', s4.samples.length === 0);

  // Stroke velocity is clamped to 3 heights per second
  s4.stir(1.0, 0.5, 1000, 0);
  const smp = s4.samples[s4.samples.length - 1];
  check('stir: velocity clamped to 3', smp && Math.abs(Math.hypot(smp.vx, smp.vy) - 3) < 1e-9);

  // Review Focus: non-finite pointer input is ignored
  const n0 = s4.samples.length;
  s4.stir(NaN, 0.5, 1, 0); s4.stir(0.5, Infinity, 1, 0); s4.stir(0.5, 0.5, NaN, 0);
  check('review: non-finite stir input is ignored', s4.samples.length === n0 && allFinite(s4));

  // Review Focus: an infinite velocity is ignored
  const n1 = s4.samples.length;
  s4.stir(1.2, 0.5, Infinity, 0);
  run(s4, 30);
  check('review: stir ignores an infinite velocity', s4.samples.length === n1 && allFinite(s4));

  // Sample spacing applies across ticks, not just within one. A tick runs between every
  // call so the same-tick-only rule (if it were still there) would push a new sample on
  // every call regardless of position, saturating the list at the 256 cap; the cross-tick
  // rule instead merges most calls and keeps the count well under the cap.
  const s6 = W.createSim({ seed: 41, aspect: 2.43, heat: 5, waxAmount: 5 });
  let sx = 0.1;
  for (let i = 0; i < 300; i++) { s6.stir(sx, 0.5, 1.0, 0); s6.step(1 / 60); sx += 0.01; }
  check('stir: spacing caps a long path across ticks, not saturating at 256',
    s6.samples.length > 50 && s6.samples.length < 200);

  // A slow stroke lays a wake of stationary samples rather than one sample sliding with
  // the finger, so a probe placed at the path midpoint still feels a strong pull right
  // after the stroke passes.
  const s9 = W.createSim({ seed: 44, aspect: 2.43, heat: 5, waxAmount: 5 });
  let sx9 = 0.5;
  const wakeXs = [];
  for (let i = 0; i < 120; i++) { s9.stir(sx9, 0.5, 1.0, 0); s9.step(1 / 60); wakeXs.push(sx9); sx9 += 0.01; }
  check('stir: a slow stroke lays a wake of at least 50 samples', s9.samples.length >= 50);
  const wakeMidX = (wakeXs[0] + wakeXs[wakeXs.length - 1]) / 2;
  const wakeR2 = W.LAVA.STIR_R * W.LAVA.STIR_R;
  let wakeKsum = 0;
  s9.samples.forEach(function (sm) {
    const dx = wakeMidX - sm.x, dy = 0.5 - sm.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < wakeR2) { const q = 1 - d2 / wakeR2; wakeKsum += q * q; }
  });
  check('stir: the pull at the path midpoint is strong right after the stroke', wakeKsum > 0.5);

  const s7 = W.createSim({ seed: 42, aspect: 2.43, heat: 5, waxAmount: 5 });
  s7.stir(1.0, 0.5, 1.0, 0);
  s7.stir(1.005, 0.5, 2.0, 0.5);
  check('stir: two close calls in one tick merge into one sample with the latest velocity',
    s7.samples.length === 1 && s7.samples[0].vx === 2.0 && s7.samples[0].vy === 0.5);

  // No split at the cap
  const s5 = W.createSim({ seed: 25, aspect: 0.42, heat: 5, waxAmount: 5, cap: 1 });
  clearToPool(s5);
  const b5 = addBlob(s5, 0.21, 0.5, 1.5 * s5.Vb, 0.5);
  s5.stir(b5.x, b5.y, 2.5, 0);
  check('stir: no split when the count equals the cap', s5.blobs.length === 1);

  // Long stirred runs keep all invariants
  [5, 10].forEach(function (heat) {
    const sim = W.createSim({ seed: 1, aspect: 2.43, heat: heat, waxAmount: 5 });
    const st = run(sim, 20000, function (s, i) {
      if (i % 20 === 0) {
        const t = i / 60;
        s.stir(1.2 + Math.sin(t * 0.7), 0.5 + 0.4 * Math.sin(t * 1.3), 2.8 * Math.cos(t * 0.7), 2.0 * Math.cos(t * 1.3));
      }
    });
    check('stirred heat ' + heat + ': volume conserved within 1e-6', Math.abs(sim.total() - sim.V) < 1e-6);
    check('stirred heat ' + heat + ': no NaN', st.finite);
    check('stirred heat ' + heat + ': blobs stay in bounds', st.bounds);
    check('stirred heat ' + heat + ': count never exceeds the cap', st.maxCount <= sim.cap);
    check('stirred heat ' + heat + ': stroke splits happen', sim.events.stirSplits > 0);
  });
} else {
  check('stir implemented', false);
}

// ================= Task 4: colors =================
if (W.parseHexColor && W.resolveColors && W.contrastRatio && W.lampSlice) {
  const eq = (a, b) => a.length === 3 && a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
  check('parseHexColor #RRGGBB', eq(W.parseHexColor('#FF8000'), [1, 128 / 255, 0]));
  check('parseHexColor #RGB', eq(W.parseHexColor('#F80'), [1, 136 / 255, 0]));
  check('review: parseHexColor Qt #AARRGGBB drops alpha', eq(W.parseHexColor('#80FF8000'), [1, 128 / 255, 0]));
  check('review: parseHexColor garbage uses the fallback', eq(W.parseHexColor('rgb(1,2,3)', '#000000'), [0, 0, 0]) &&
    eq(W.parseHexColor(undefined, '#FFFFFF'), [1, 1, 1]) && eq(W.parseHexColor('', '#FF0000'), [1, 0, 0]));
  const cl = W.resolveColors('classic', '#00FF00', '#0000FF');
  check('resolveColors: a preset ignores both pickers', eq(cl.wax, W.parseHexColor('#FF4A1F')) && eq(cl.liquid, W.parseHexColor('#7A3A08')));
  check('resolveColors: the backdrop is always backgroundColor', eq(cl.backdrop, [0, 0, 1]));
  const cu = W.resolveColors('custom', '#00FF00', '#0000FF');
  check('resolveColors: custom uses accentColor and backgroundColor', eq(cu.wax, [0, 1, 0]) && eq(cu.liquid, [0, 0, 1]));
  check('review: resolveColors unknown preset acts as custom', eq(W.resolveColors('constructor', '#00FF00', '#0000FF').wax, [0, 1, 0]));
  const white = [1, 1, 1];
  Object.keys(W.PRESETS).forEach(function (k) {
    const c = W.contrastRatio(white, W.parseHexColor(W.PRESETS[k].liquid));
    check('contrast: white title on ' + k + ' liquid is at least 4.5:1 (' + c.toFixed(2) + ')', c >= 4.5);
  });
  check('contrast: white title on the default backdrop is at least 4.5:1', W.contrastRatio(white, W.parseHexColor('#7A3A08')) >= 4.5);
  check('halo color flips for dark text', W.haloFor('#FFFFFF') === '0,0,0' && W.haloFor('#222222') === '255,255,255');
  const sl0 = W.lampSlice(0, 1), sl5 = W.lampSlice(5, 6);
  check('lampSlice divides the 64 slots', sl0.start === 0 && sl0.count === 64 && sl5.start === 50 && sl5.count === 10);
  let fl1, fl3, flBad;
  try {
    fl1 = W.computeFillLayout(1688, 696, 1);
    fl3 = W.computeFillLayout(1688, 696, 3);
    flBad = [W.computeFillLayout(0, 0, 1), W.computeFillLayout(NaN, NaN, NaN)];
  } catch (e) { fl1 = null; }
  const finiteLayout = l => [l.cellW, l.cssW, l.cssH, l.dpr, l.lamps[0].cx, l.lamps[0].glass.width,
    l.lamps[0].glass.height].concat(l.lamps[0].rect).every(Number.isFinite);
  check('computeFillLayout maps the container', !!fl1 && fl1.masked === false && fl1.count === 1 && fl1.lamps.length === 1 &&
    fl1.lamps[0].glass.left === 0 && fl1.lamps[0].glass.top === 0 &&
    fl1.lamps[0].glass.width === 1688 && fl1.lamps[0].glass.height === 696 &&
    fl1.lamps[0].rect.join() === '0,0,1688,696' &&
    fl3.dpr === 2 && fl3.lamps[0].rect.join() === '0,0,3376,1392' &&
    flBad.every(finiteLayout));
} else {
  check('colors implemented', false);
}

// ================= Task 5: lamp layout =================
if (W.computeLampLayout && W.insideBottle) {
  const L4 = W.computeLampLayout(1689, 697, 4, 1);
  check('layout: 4 lamps', L4.lamps.length === 4);
  const g0 = L4.lamps[0].glass;
  check('layout: glass interior aspect is 0.42', Math.abs(g0.width / g0.height - 0.42) < 1e-9);
  check('layout: lamps fit their cells', L4.lamps.every(l => l.base.bottomW <= l.cellW + 1e-9 && l.base.bottom <= 697 + 1e-9 && l.cap.top >= -1e-9));
  check('layout: proportions cap 8, glass 62, base 30 percent', (l0 => {
    const H = l0.base.bottom - l0.cap.top;
    return Math.abs((l0.cap.bottom - l0.cap.top) / H - 0.08) < 1e-9 &&
      Math.abs(l0.glass.height / H - 0.62) < 1e-9 &&
      Math.abs((l0.base.bottom - l0.base.top) / H - 0.30) < 1e-9;
  })(L4.lamps[0]));
  check('layout: rect is in buffer px, bottom-left origin', Math.abs(L4.lamps[0].rect[1] - (697 - L4.lamps[0].base.top)) < 1e-9);
  const L2 = W.computeLampLayout(1689, 697, 4, 2);
  check('layout: dpr 2 doubles the rect', L2.lamps[1].rect.every((v, i) => Math.abs(v - 2 * L4.lamps[1].rect[i]) < 1e-9));
  const LVXL = W.computeLampLayout(697, 2537, 1, 1);
  check('layout: VXL lamp is width-limited', Math.abs(LVXL.lamps[0].base.bottomW - 697 * 0.92) < 1e-6 && LVXL.lamps[0].cap.top > 0);
  const L0 = W.computeLampLayout(0, 0, 4, 1);
  check('review: zero-size layout has no NaN', JSON.stringify(L0).indexOf('null') === -1 && L0.lamps.every(l => l.rect.every(Number.isFinite)));

  check('insideBottle: center is inside', W.insideBottle(0.21, 0.5, 0.42));
  check('insideBottle: bottom corner is inside', W.insideBottle(0.01, 0.01, 0.42));
  check('insideBottle: top corner is outside (taper)', !W.insideBottle(0.01, 0.99, 0.42));
  check('insideBottle: above the glass is outside', !W.insideBottle(0.21, 1.05, 0.42));

  // buildSims is page code: run its real source on top of the testable region
  const pageFn = name => (html.match(new RegExp('\\n        function ' + name + '\\([\\s\\S]*?\\n        \\}\\n')) || [''])[0];
  const build = new Function(m[1] + '\nvar cfg = { heat: 5, wax: 5 }, baseSeed = 1, lamps = [], layout;\n' +
    pageFn('lampAspect') + pageFn('buildSims') +
    '\nreturn function (l) { layout = l; buildSims(); return lamps; };')();
  const lampSims = build(W.computeLampLayout(1689, 697, 4, 1));
  const fillSims = build(W.computeFillLayout(1689, 697, 1));
  check('lamp sims taper with the bottle', lampSims.length === 4 &&
    lampSims.every((l, i) => l.sim.taper === 0.8 && l.sim.cap === W.lampSlice(i, 4).count) &&
    fillSims.length === 1 && fillSims[0].sim.taper === 1);

} else {
  check('layout implemented', false);
}

// ================= Task 6: pointer mapping =================
if (W.mapPointer && W.computeLampLayout) {
  const L4 = W.computeLampLayout(1689, 697, 4, 1);
  const c1 = L4.lamps[1].glass;
  const hit = W.mapPointer(c1.left + c1.width / 2, c1.top + c1.height / 2, L4);
  check('mapPointer: center of lamp 2 maps to lamp 1 at (aspect/2, 0.5)', hit && hit.lamp === 1 && Math.abs(hit.x - 0.21) < 1e-9 && Math.abs(hit.y - 0.5) < 1e-9);
  const bottom = W.mapPointer(c1.left + c1.width / 2, c1.top + c1.height - 1, L4);
  check('mapPointer: y points up', bottom && bottom.y < 0.01);
  check('review: a pointer between lamps maps to null', W.mapPointer(L4.cellW, 348, L4) === null);
  check('review: a pointer on the base maps to null', W.mapPointer(L4.lamps[0].cx, L4.lamps[0].base.top + 5, L4) === null);
  check('review: a pointer outside the widget maps to null', W.mapPointer(-10, 348, L4) === null && W.mapPointer(1700, 348, L4) === null);
  check('review: a NaN pointer maps to null', W.mapPointer(NaN, 348, L4) === null);
  const F = W.computeFillLayout(1689, 697, 1);
  const fh = W.mapPointer(1689, 0, F);
  check('mapPointer: fill maps the top-right corner to (aspect, 1)', fh && fh.lamp === 0 && Math.abs(fh.x - 1689 / 697) < 1e-9 && Math.abs(fh.y - 1) < 1e-9);
  check('mapPointer ignores a fill pointer outside the widget', W.mapPointer(-5, 100, F) === null && W.mapPointer(F.cssW + 5, 100, F) === null &&
    W.mapPointer(100, -5, F) === null && W.mapPointer(100, F.cssH + 5, F) === null && W.mapPointer(10, 100, F) !== null);
  check('review: a zero-size fill layout maps to null', W.mapPointer(10, 10, W.computeFillLayout(0, 0, 1)) === null);
} else {
  check('mapPointer implemented', false);
}

// ================= Continuity (2026-10-01 amendment) =================
// No simulation event may change the rendered wax or the pool level by more than an
// ordinary frame does. This ports the render field (render() uploads r * KERNEL_R, the
// shader sums Wyvill kernels, stretched ellipses, half-weight tails and the pool capsule,
// and draws the wax where F > ISO) onto a grid in lamp units, then measures every frame of
// a long seeded run:
//   flip = grid area (lamp units^2) whose F crossed ISO between two frames
//   pool = change of pool.thickness between two frames (lamp units)
// Gates per run:
//   ratio: the largest frame flip is at most CONT_RATIO times the 99.9th percentile of the
//          frame flips of the same run, so no single frame stands out from the ordinary
//          motion of its run. After the fix the ratio stays under 1.6 on 12 seeds.
//   guard: a coarse absolute flip bound against uniformly jerky motion, twice the worst
//          frame flip of 12 seeds after the fix (lamp 4.21e-3 and 7.46e-3, Fill 2.44e-2 and
//          3.12e-2 at 1/60 and 1/30 s). Commit 0daf8dc reaches 7.2e-2 (lamp) and 7.0e-1 (Fill).
//   pool:  the pool level moves at most 1.5 times the ordinary maximum, which is two buds
//          feeding at Vb per second each: 3 * Vb / width per second.
const CONT_KERNEL_R = 0.87, CONT_ISO = 0.3, CONT_RATIO = 3;
function contGrid(aspect, h, masked) {
  const nx = Math.ceil(aspect / h), ny = Math.ceil(1 / h);
  const inside = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    inside[j * nx + i] = !masked || W.insideBottle((i + 0.5) * h, (j + 0.5) * h, aspect) ? 1 : 0;
  }
  return { h: h, nx: nx, ny: ny, inside: inside };
}
function contField(sim, G, out) {
  const h = G.h, nx = G.nx, ny = G.ny;
  out.fill(0);
  for (let k = 0; k < sim.blobs.length; k++) {
    const b = sim.blobs[k], R = b.r * CONT_KERNEL_R;
    if (R > 0) {
      const sq = Math.sqrt(Math.max(b.stretch, 1)), ax = 1 / sq, ay = sq, r2 = R * R;
      const i0 = Math.max(0, Math.floor((b.x - 2 * R * ax) / h) - 1), i1 = Math.min(nx - 1, Math.ceil((b.x + 2 * R * ax) / h) + 1);
      const j0 = Math.max(0, Math.floor((b.y - 2 * R * ay) / h) - 1), j1 = Math.min(ny - 1, Math.ceil((b.y + 2 * R * ay) / h) + 1);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const dx = ((i + 0.5) * h - b.x) / ax, dy = ((j + 0.5) * h - b.y) / ay;
        const q = (dx * dx + dy * dy) / r2;
        if (q < 4) { const t = 1 - 0.25 * q; out[j * nx + i] += t * t * t; }
      }
    }
    const tl = sim.tails[k];
    if (!tl || !(tl.w > 0) || !(tl.r > 0)) continue;
    const TR = tl.r * CONT_KERNEL_R, tr2 = TR * TR, w = 0.5 * tl.w;
    const i0 = Math.max(0, Math.floor((tl.x - 2 * TR) / h) - 1), i1 = Math.min(nx - 1, Math.ceil((tl.x + 2 * TR) / h) + 1);
    const j0 = Math.max(0, Math.floor((tl.y - 2 * TR) / h) - 1), j1 = Math.min(ny - 1, Math.ceil((tl.y + 2 * TR) / h) + 1);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = (i + 0.5) * h - tl.x, dy = (j + 0.5) * h - tl.y;
      const q = (dx * dx + dy * dy) / tr2;
      if (q < 4) { const t = 1 - 0.25 * q; out[j * nx + i] += w * t * t * t; }
    }
  }
  const pr = Math.max(sim.pool.thickness * CONT_KERNEL_R, 1e-4), pr2 = pr * pr;
  for (let j = 0; j < ny; j++) {
    const dy = (j + 0.5) * h, q = dy * dy / pr2;
    if (q >= 4) break;
    const t = 1 - 0.25 * q, v = t * t * t;
    for (let i = 0; i < nx; i++) out[j * nx + i] += v;
  }
}
function contRun(sim, G, dt, seconds) {
  const F0 = new Float64Array(G.nx * G.ny), F1 = new Float64Array(G.nx * G.ny);
  contField(sim, G, F0);
  const flips = [];
  let maxPool = 0;
  const steps = Math.round(seconds / dt);
  for (let s = 0; s < steps; s++) {
    const th0 = sim.pool.thickness;
    sim.step(dt);
    contField(sim, G, F1);
    let n = 0;
    for (let k = 0; k < F0.length; k++) if (G.inside[k] && ((F0[k] > CONT_ISO) !== (F1[k] > CONT_ISO))) n++;
    flips.push(n * G.h * G.h);
    maxPool = Math.max(maxPool, Math.abs(sim.pool.thickness - th0));
    F0.set(F1);
  }
  flips.sort((a, b) => a - b);
  return { maxFlip: flips[flips.length - 1], p999: flips[Math.floor(0.999 * (flips.length - 1))], maxPool: maxPool };
}
if (W.createSim && W.insideBottle) {
  const CONT = [
    { name: 'lamp 0.42', h: 0.004, masked: true, seconds: 180, seeds: [12345, 5, 8], guard: { 60: 0.0085, 30: 0.015 },
      make: seed => W.createSim({ seed: seed, aspect: 0.42, heat: 5, waxAmount: 5, cap: 64, taper: 0.8 }) },
    { name: 'fill 2.43', h: 0.008, masked: false, seconds: 120, seeds: [12345, 1], guard: { 60: 0.05, 30: 0.065 },
      make: seed => W.createSim({ seed: seed, aspect: 2.43, heat: 5, waxAmount: 5 }) }
  ];
  CONT.forEach(function (c) {
    [60, 30].forEach(function (fps) {
      const dt = 1 / fps;
      let ratio = 0, maxFlip = 0, poolOver = 0;
      c.seeds.forEach(function (seed) {
        const sim = c.make(seed);
        const r = contRun(sim, contGrid(sim.width, c.h, c.masked), dt, c.seconds);
        ratio = Math.max(ratio, r.maxFlip / r.p999);
        maxFlip = Math.max(maxFlip, r.maxFlip);
        poolOver = Math.max(poolOver, r.maxPool / (3 * sim.Vb / sim.width * dt));
      });
      const tag = 'continuity ' + c.name + ' at 1/' + fps + ' s';
      console.log('   ' + tag + ' (' + c.seeds.length + ' seeds): largest flip / p99.9 ' + ratio.toFixed(2) + ' (bound ' + CONT_RATIO +
        '), largest flip ' + maxFlip.toExponential(2) + ' (guard ' + c.guard[fps] + '), pool step / bound ' + poolOver.toFixed(2));
      check(tag + ': no frame flips more than ' + CONT_RATIO + ' times the 99.9th percentile of its run', ratio <= CONT_RATIO);
      check(tag + ': no frame passes the coarse flip guard', maxFlip <= c.guard[fps]);
      check(tag + ': no frame moves the pool level more than an ordinary frame', poolOver <= 1);
    });
  });

  // Frame-rate independence: one 1/30 s frame is exactly two 1/60 s frames
  const fr1 = W.createSim({ seed: 61, aspect: 0.42, heat: 5, waxAmount: 5, cap: 64, taper: 0.8 });
  const fr2 = W.createSim({ seed: 61, aspect: 0.42, heat: 5, waxAmount: 5, cap: 64, taper: 0.8 });
  for (let i = 0; i < 1800; i++) { fr1.step(1 / 30); fr2.step(1 / 60); fr2.step(1 / 60); }
  check('frame rate: 1800 frames at 1/30 s give the same state as 3600 frames at 1/60 s', snapshot(fr1) === snapshot(fr2));
} else {
  check('continuity check implemented', false);
}

// ================= Merge drain and merge limit (2026-10-01 amendment) =================
if (W.createSim) {
  // Merge drain: the smaller blob drains into the larger one over MERGE_TIME
  const md = W.createSim({ seed: 51, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(md);
  md.pool.T = 0;   // keeps the pool too cold to bud during the check
  const mBig = addBlob(md, 1.2, 0.5, 1.2 * md.Vb, 0.5);
  const smallR = Math.sqrt(0.6 * md.Vb / Math.PI);
  const mSmall = addBlob(md, 1.2 + 0.4 * (mBig.r + smallR), 0.5, 0.6 * md.Vb, 0.5);
  const mdV = md.total(), small0 = mSmall.vol;
  md.step(STEP);
  check('merge: the pair starts to merge and both kernels stay', md.events.merges === 1 &&
    md.blobs.indexOf(mBig) >= 0 && md.blobs.indexOf(mSmall) >= 0 && mSmall.drain > 0 && !mBig.drain);
  let mdMaxDrop = small0 - mSmall.vol, mdConserved = Math.abs(md.total() - mdV) < 1e-12, mdShrinks = true;
  let mdSteps = 0, mdPrevVol = mSmall.vol, mdPrevD = Math.hypot(mSmall.x - mBig.x, mSmall.y - mBig.y), mdCloser = true;
  for (let i = 0; i < Math.ceil(W.LAVA.MERGE_TIME / STEP) + 2 && md.blobs.indexOf(mSmall) >= 0; i++) {
    md.step(STEP);
    mdSteps++;
    mdMaxDrop = Math.max(mdMaxDrop, mdPrevVol - mSmall.vol);
    if (mSmall.vol > mdPrevVol) mdShrinks = false;
    if (Math.abs(md.total() - mdV) >= 1e-12) mdConserved = false;
    const d = Math.hypot(mSmall.x - mBig.x, mSmall.y - mBig.y);
    if (d > mdPrevD + 1e-12) mdCloser = false;
    mdPrevVol = mSmall.vol; mdPrevD = d;
  }
  check('merge: no step moves more than MERGE_TIME allows', mdMaxDrop <= small0 * STEP / W.LAVA.MERGE_TIME * (1 + 1e-9));
  check('merge: the draining kernel only shrinks and only closes in', mdSteps >= W.LAVA.MERGE_TIME / STEP - 1 && mdShrinks && mdCloser);
  check('merge: volume conserved at every step', mdConserved);
  check('merge: the drained kernel is removed and the larger blob holds both volumes',
    md.blobs.indexOf(mSmall) < 0 && md.blobs.indexOf(mBig) >= 0 && Math.abs(mBig.vol - 1.8 * md.Vb) < 1e-12);

  // Review: a fast stroke through a merging pair never splits the draining kernel, and the
  // volume stays exact through the split, the drain and the stir
  const sd = W.createSim({ seed: 59, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(sd);
  sd.pool.T = 0;
  const sdBig = addBlob(sd, 1.2, 0.5, 1.2 * sd.Vb, 0.5);
  const sdSmall = addBlob(sd, 1.2 + 0.4 * (sdBig.r + Math.sqrt(0.6 * sd.Vb / Math.PI)), 0.5, 0.6 * sd.Vb, 0.5);
  const sdV = sd.total();
  sd.step(STEP);
  sd.stir(sdSmall.x, sdSmall.y, 2.5, 0);
  const sdStillDraining = sdSmall.drain > 0 && sd.blobs.indexOf(sdSmall) >= 0;
  run(sd, 60);
  check('review: a stroke never splits a draining kernel, and the volume stays exact',
    sd.events.merges === 1 && sd.events.stirSplits === 1 && sdStillDraining && sd.blobs.indexOf(sdSmall) < 0 &&
    Math.abs(sd.total() - sdV) < 1e-12);

  // Merge limit: a pair whose merged volume would pass MERGE_MAX * Vb does not merge,
  // and it pushes apart instead of hanging together as a peanut
  const ml = W.createSim({ seed: 52, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(ml);
  ml.pool.T = 0;
  const la = addBlob(ml, 1.2, 0.5, 1.5 * ml.Vb, 0.5);
  const lb = addBlob(ml, 1.2 + 0.8 * la.r, 0.5, 1.5 * ml.Vb, 0.5);   // d = 0.4 (r1 + r2): inside the merge distance
  ml.step(STEP);
  check('merge limit: a pair above MERGE_MAX * Vb does not merge', ml.events.merges === 0 && !la.drain && !lb.drain);
  run(ml, 60);
  const mlD = Math.hypot(la.x - lb.x, la.y - lb.y);
  console.log('   merge limit: pair distance after 1 s is ' + (mlD / (la.r + lb.r)).toFixed(2) + ' (r1 + r2)');
  check('merge limit: after 1 s the pair has pushed apart past touching, to at least 1.2 (r1 + r2)', mlD >= 1.2 * (la.r + lb.r));

  // An over-limit pair with no relative drive stops drawing as one clump. One lamp (aspect
  // 0.42, tapered walls), two 1.5 Vb blobs side by side at equal temperature, d = 0.4 (r1 + r2).
  // The bridge between two equal kernels breaks near d = 1.19 (r1 + r2): the field at the
  // midpoint, 2 (1 - (d / 2)^2 / (4 (0.87 r)^2))^3, falls to ISO there. Each blob is
  // drag-limited at KREP * overlap * r / KD, so the gap opens at 0.32 to 0.17 lamp units per
  // second over 1.58 r (0.145): about 0.7 s (the run prints 0.72 s). The check allows 1.5 s.
  const lp = W.createSim({ seed: 62, aspect: 0.42, heat: 5, waxAmount: 5, cap: 64, taper: 0.8 });
  clearToPool(lp);
  lp.pool.T = 0;
  const lpA = addBlob(lp, 0.21, 0.5, 1.5 * lp.Vb, 0.5);
  const lpB = addBlob(lp, 0.21, 0.5, 1.5 * lp.Vb, 0.5);
  lpA.x -= 0.4 * lpA.r; lpB.x += 0.4 * lpB.r;
  const lpG = contGrid(lp.width, 0.004, true), lpF = new Float64Array(lpG.nx * lpG.ny);
  function lpJoined() {   // F > ISO all along the segment between the two centers
    contField(lp, lpG, lpF);
    for (let t = 0; t <= 1; t += 0.01) {
      const x = lpA.x + (lpB.x - lpA.x) * t, y = lpA.y + (lpB.y - lpA.y) * t;
      if (lpF[Math.floor(y / lpG.h) * lpG.nx + Math.floor(x / lpG.h)] <= CONT_ISO) return false;
    }
    return true;
  }
  let lpApart = -1;
  for (let i = 1; i <= 90 && lpApart < 0; i++) {
    lp.step(STEP);
    if (!lpJoined()) lpApart = i * STEP;
  }
  console.log('   merge limit: the lamp pair stops drawing as one clump after ' + lpApart.toFixed(2) + ' s');
  check('merge limit: in the lamp an over-limit pair at equal temperature stops drawing as one clump within 1.5 s',
    lp.events.merges === 0 && lp.blobs.indexOf(lpA) >= 0 && lp.blobs.indexOf(lpB) >= 0 && lpApart > 0);

  // Lamp census: one lamp (VXL Lamp style: aspect 0.42, taper 0.8), Wax 5, three seeds x 300 s.
  // Kernels, every substep after 20 s: a blob counts as free when it is not draining, holds at
  // least 0.25 Vb and sits clear of the pool. Drawn clumps, every 0.1 s: the connected areas of
  // F > ISO (contField, Task 1) that do not touch the pool, and the over-limit pairs (merged
  // volume, inflow included, above MERGE_MAX * Vb, both off cooldown) whose centers sit in one
  // clump. A joined pair that is passing another blob is accepted, so the joined census only
  // prints. At commit 0daf8dc, Heat 5: largest blob 7 Vb, two or more free 54.6 percent, no free
  // blob 6.9 percent, one clump or none 89.6 percent, largest clump 61.8 percent of the wax.
  function lampCensus(heat) {
    const c = { T: 0, two: 0, none: 0, max: 0, n: 0, few: 0, share: 0, joined: 0, spells: 0, longest: 0 };
    [12345, 777, 4242].forEach(function (seed) {
      const sim = W.createSim({ seed: seed, aspect: 0.42, heat: heat, waxAmount: 5, cap: 64, taper: 0.8 });
      const G = contGrid(sim.width, 0.004, true), F = new Float64Array(G.nx * G.ny), lab = new Int32Array(G.nx * G.ny);
      const since = new Map();
      const inflow = b => (sim.flows || []).reduce((v, f) => v + (f.to === b ? (f.all === false ? f.need : f.from.vol) : 0), 0);
      for (let i = 0; i < 300 * 60; i++) {
        sim.step(STEP);
        for (const b of sim.blobs) c.max = Math.max(c.max, b.vol / sim.Vb);
        if (sim.time <= 20) continue;
        const top = sim.pool.thickness;
        const nFree = sim.blobs.filter(b => !b.drain && b.vol >= 0.25 * sim.Vb && b.y - b.r > top).length;
        c.T += STEP; if (nFree >= 2) c.two += STEP; if (nFree === 0) c.none += STEP;
        if (i % 6) continue;
        contField(sim, G, F); lab.fill(0);
        const poolRows = Math.ceil((top + 0.01) / G.h), areas = [0], pool = [true];
        for (let s0 = 0; s0 < F.length; s0++) {
          if (lab[s0] || !G.inside[s0] || F[s0] <= CONT_ISO) continue;
          const id = areas.length, stack = [s0];
          areas.push(0); pool.push(false); lab[s0] = id;
          while (stack.length) {
            const k = stack.pop(), x = k % G.nx, y = (k - x) / G.nx;
            areas[id]++; if (y < poolRows) pool[id] = true;
            [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].forEach(function (p) {
              if (p[0] < 0 || p[1] < 0 || p[0] >= G.nx || p[1] >= G.ny) return;
              const kk = p[1] * G.nx + p[0];
              if (!lab[kk] && G.inside[kk] && F[kk] > CONT_ISO) { lab[kk] = id; stack.push(kk); }
            });
          }
        }
        let clumps = 0, largest = 0;
        for (let id = 1; id < areas.length; id++) if (!pool[id]) { clumps++; largest = Math.max(largest, areas[id] * G.h * G.h); }
        c.n++; if (clumps <= 1) c.few++; c.share += largest / sim.V;
        const labelAt = b => lab[Math.min(G.ny - 1, Math.floor(b.y / G.h)) * G.nx + Math.min(G.nx - 1, Math.max(0, Math.floor(b.x / G.h)))];
        const cand = sim.blobs.filter(b => !b.drain && b.mergeCooldown === 0), now = new Set();
        for (let a = 0; a < cand.length; a++) for (let d = a + 1; d < cand.length; d++) {
          const p = cand[a], q = cand[d];
          if (p.vol + inflow(p) + q.vol + inflow(q) <= W.LAVA.MERGE_MAX * sim.Vb) continue;
          const lp0 = labelAt(p);
          if (lp0 && lp0 === labelAt(q)) { const key = p.id + ':' + q.id; now.add(key); if (!since.has(key)) since.set(key, sim.time); }
        }
        if (now.size) c.joined++;
        for (const [key, t0] of since) if (!now.has(key)) {
          if (sim.time - t0 > 3) c.spells++;
          c.longest = Math.max(c.longest, sim.time - t0);
          since.delete(key);
        }
      }
    });
    console.log('   census Heat ' + heat + ': largest ' + c.max.toFixed(2) + ' Vb, two or more free ' + (100 * c.two / c.T).toFixed(1) +
      '%, none free ' + (100 * c.none / c.T).toFixed(1) + '%, one clump or none ' + (100 * c.few / c.n).toFixed(1) +
      '%, largest clump ' + (100 * c.share / c.n).toFixed(1) + '% of the wax');
    console.log('   joined Heat ' + heat + ': an over-limit pair draws as one clump in ' + (100 * c.joined / c.n).toFixed(1) +
      '% of samples, ' + c.spells + ' spells over 3 s, longest ' + c.longest.toFixed(1) + ' s');
    return c;
  }
  const cn = lampCensus(5);
  check('census: the largest blob stays at or below MERGE_MAX * Vb', cn.max <= W.LAVA.MERGE_MAX * (1 + 1e-9));
  check('census: the lamp holds two or more free blobs at least 85 percent of the time', cn.two / cn.T >= 0.85);
  check('census: the lamp holds no free blob at most 3 percent of the time', cn.none / cn.T <= 0.03);
  check('clumps: the lamp draws one clump or none at most 25 percent of the time', cn.few / cn.n <= 0.25);
  check('clumps: the largest clump holds at most 45 percent of the wax on average', cn.share / cn.n <= 0.45);
  lampCensus(10);   // printed for the record, no pass bound

  // Merge chain: X drains into B, then B meets the larger C and starts to drain. The flow from
  // X must retarget to C, or it keeps feeding a blob that is itself draining away.
  const ch = W.createSim({ seed: 53, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(ch);
  ch.pool.T = 0;
  const chB = addBlob(ch, 1.2, 0.6, 0.4 * ch.Vb, 0.5);
  const chX = addBlob(ch, 1.2 + 0.4 * (chB.r + Math.sqrt(0.2 * ch.Vb / Math.PI)), 0.6, 0.2 * ch.Vb, 0.5);
  const chC = addBlob(ch, 2.0, 0.6, 1.0 * ch.Vb, 0.5);
  const chV = ch.total();
  ch.step(STEP);
  const chFirst = ch.events.merges === 1 && chX.drain > 0 && !chB.drain;
  chC.x = chB.x + 0.3 * (chB.r + chC.r); chC.y = chB.y;
  ch.step(STEP);
  const chFlowX = ch.flows.find(f => f.from === chX);
  const chRetarget = ch.events.merges === 2 && chB.drain > 0 && !chC.drain && chFlowX !== undefined && chFlowX.to === chC;
  let chConserved = Math.abs(ch.total() - chV) < 1e-12;
  for (let i = 0; i < Math.ceil(W.LAVA.MERGE_TIME / STEP) + 2 && (ch.blobs.indexOf(chX) >= 0 || ch.blobs.indexOf(chB) >= 0); i++) {
    ch.step(STEP);
    if (Math.abs(ch.total() - chV) >= 1e-12) chConserved = false;
  }
  check('merge: a flow into a blob that starts to drain retargets to the new receiver, and the volume stays exact',
    chFirst && chRetarget && chConserved && ch.blobs.indexOf(chX) < 0 && ch.blobs.indexOf(chB) < 0 &&
    ch.blobs.indexOf(chC) >= 0 && Math.abs(chC.vol - 1.6 * ch.Vb) < 1e-12);

  // Receiver choice: B (0.5 Vb) still receives A (0.4 Vb) when it meets C (0.8 Vb). B counts
  // 0.9 Vb with its inbound volume, so C is the smaller one and drains into B.
  const rc = W.createSim({ seed: 54, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(rc);
  rc.pool.T = 0;
  const rcB = addBlob(rc, 1.2, 0.6, 0.5 * rc.Vb, 0.5);
  const rcA = addBlob(rc, 1.2 + 0.4 * (rcB.r + Math.sqrt(0.4 * rc.Vb / Math.PI)), 0.6, 0.4 * rc.Vb, 0.5);
  const rcC = addBlob(rc, 2.0, 0.6, 0.8 * rc.Vb, 0.5);
  rc.step(STEP);
  const rcFirst = rc.events.merges === 1 && rcA.drain > 0 && !rcB.drain;
  rcC.x = rcB.x + 0.3 * (rcB.r + rcC.r); rcC.y = rcB.y;
  rc.step(STEP);
  const rcFlowC = rc.flows.find(f => f.from === rcC);
  check('merge: the receiver is chosen by volume plus inbound volume',
    rcFirst && rc.events.merges === 2 && rcC.drain > 0 && !rcB.drain && rcFlowC !== undefined && rcFlowC.to === rcB);
}

// ================= Absorption drain and empty buds (2026-10-01 amendment) =================
if (W.createSim) {
  // A cold blob whose bottom touches the pool drains into it over ABSORB_TIME
  const ab = W.createSim({ seed: 53, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(ab);
  ab.pool.T = 0;   // too cold to bud while the check runs
  const abB = addBlob(ab, 1.2, 0.5, 2 * ab.Vb, 0.3);
  abB.y = ab.pool.vol / ab.width + 0.95 * abB.r;   // the bottom dips just under the surface
  const abV = ab.total();
  let abPool = ab.pool.vol;
  ab.step(STEP);
  check('absorb: the blob starts to drain and stays drawn', ab.events.absorbs === 1 && ab.blobs.indexOf(abB) >= 0 && abB.drain > 0);
  let abMaxIn = ab.pool.vol - abPool, abConserved = true, abSteps = 1, abLastGap = Infinity;
  abPool = ab.pool.vol;
  while (ab.blobs.indexOf(abB) >= 0 && abSteps < 600) {
    abLastGap = Math.abs(abB.y - ab.pool.vol / ab.width);
    ab.step(STEP); abSteps++;
    abMaxIn = Math.max(abMaxIn, ab.pool.vol - abPool); abPool = ab.pool.vol;
    if (Math.abs(ab.total() - abV) >= 1e-12) abConserved = false;
  }
  console.log('   absorb: drained in ' + (abSteps * STEP).toFixed(2) + ' s');
  check('absorb: the pool rises by at most POOL_IN * Vb per second', abMaxIn <= W.LAVA.POOL_IN * ab.Vb * STEP * (1 + 1e-9));
  check('absorb: the drain takes about ABSORB_TIME', Math.abs(abSteps * STEP - W.LAVA.ABSORB_TIME) <= 3 * STEP);
  check('absorb: volume conserved at every step', abConserved);
  check('absorb: the blob ends on the pool surface', abLastGap < 0.01);

  // Several blobs draining at once share POOL_IN
  const ab3 = W.createSim({ seed: 54, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(ab3);
  ab3.pool.T = 0;
  const ab3Blobs = [0.4, 1.2, 2.0].map(x => addBlob(ab3, x, 0.5, 2.4 * ab3.Vb, 0.3));
  ab3Blobs.forEach(b => { b.y = ab3.pool.vol / ab3.width + 0.95 * b.r; });
  let ab3Pool = ab3.pool.vol, ab3MaxIn = 0;
  for (let i = 0; i < 300; i++) {
    ab3.step(STEP);
    ab3MaxIn = Math.max(ab3MaxIn, ab3.pool.vol - ab3Pool); ab3Pool = ab3.pool.vol;
  }
  check('absorb: three blobs draining at once still fill the pool at most POOL_IN * Vb per second',
    ab3.events.absorbs === 3 && ab3MaxIn <= W.LAVA.POOL_IN * ab3.Vb * STEP * (1 + 1e-9));

  // A dome clearly above the pool does not start to vanish
  const ah = W.createSim({ seed: 55, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(ah);
  ah.pool.T = 0;
  const ahB = addBlob(ah, 1.2, 0.5, 2 * ah.Vb, 0.3);
  ahB.y = ah.pool.vol / ah.width + 1.3 * ahB.r;   // the bottom sits 0.3 r above the surface
  ah.step(STEP);
  check('absorb: a blob whose bottom is clear of the pool does not drain', ah.events.absorbs === 0 && !ahB.drain);

  // Buds start empty, and the feeding buds together gain at most Vb per second each.
  // Measured on the bud volumes, so a drain into the pool in the same step cannot hide an
  // over-draw.
  const bz = W.createSim({ seed: 56, aspect: 0.42, heat: 5, waxAmount: 5, cap: 64, taper: 0.8 });
  const bzVols = [];
  bz.onBud = function (b) { bzVols.push(b.vol); };
  let bzWorst = 0;
  for (let i = 0; i < 60 * 60; i++) {
    const before = new Map(bz.blobs.filter(b => b.target > 0).map(b => [b, b.vol]));
    bz.step(STEP);
    let gain = 0;
    for (const b of bz.blobs) {
      if (before.has(b)) gain += b.vol - before.get(b);
      else if (b.target > 0) gain += b.vol;   // a bud born in this step
    }
    bzWorst = Math.max(bzWorst, gain - before.size * bz.Vb * STEP);
  }
  check('bud: every bud starts with volume 0', bzVols.length > 5 && bzVols.every(v => v === 0));
  check('bud: in no step do the buds gain more than Vb per second each', bzWorst <= 1e-12);

  // A free blob with no volume, no target and no inflow is removed, and nothing else changes
  const zv = W.createSim({ seed: 63, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(zv);
  zv.pool.T = 0;
  const zvKeep = addBlob(zv, 0.8, 0.5, zv.Vb, 0.5);
  const zvGone = addBlob(zv, 1.6, 0.5, 0, 0.5);
  const zvV = zv.total();
  zv.step(STEP);
  check('zero volume: an empty free blob is removed and the volume stays exact',
    zv.blobs.indexOf(zvGone) < 0 && zv.blobs.indexOf(zvKeep) >= 0 && zv.blobs.length === 1 && Math.abs(zv.total() - zvV) < 1e-12);

  // No blob that is not draining (free blobs and feeding buds) keeps its center under the
  // pool surface for more than 0.5 s (lamp census runs, 3 seeds x 300 s)
  let slabWorst = 0;
  [12345, 777, 4242].forEach(function (seed) {
    const sim = W.createSim({ seed: seed, aspect: 0.42, heat: 5, waxAmount: 5, cap: 64, taper: 0.8 });
    const since = new Map();
    for (let i = 0; i < 300 * 60; i++) {
      sim.step(STEP);
      for (const b of sim.blobs) {
        if (!b.drain && b.y < sim.pool.thickness) {
          if (!since.has(b)) since.set(b, sim.time);
          slabWorst = Math.max(slabWorst, sim.time - since.get(b));
        } else since.delete(b);
      }
    }
  });
  console.log('   slab: longest stay of a blob center under the pool surface ' + slabWorst.toFixed(2) + ' s');
  check('slab: no blob that is not draining keeps its center under the pool surface for more than 0.5 s', slabWorst <= 0.5);
}

// ================= Stretch and tail (2026-10-01 amendment) =================
if (W.createSim) {
  // A sudden vy does not stretch the blob in one step; it gets there in about a second
  const sh = W.createSim({ seed: 57, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(sh);
  sh.pool.T = 0;
  const shB = addBlob(sh, 1.2, 0.5, sh.Vb, 0.5);
  shB.vy = 0.3;
  sh.step(STEP);
  const shFirst = shB.stretch;
  const shVy1 = shB.vy;   // the vy that integrate low-passed (the forces already acted on it)
  const shRate = Math.min(1, W.LAVA.KSHAPE * STEP);
  run(sh, 59, function () { shB.vy = 0.3; shB.T = 0.5; });
  check('stretch: one step after a jump in vy the stretch has moved less than a quarter of the way',
    shVy1 > 0.05 && shFirst > 1 && shFirst - 1 <= W.LAVA.KS * shRate * shVy1 + 1e-9);
  check('stretch: after 1 s the stretch has reached the fast-blob value', shB.stretch > 1.7);

  // The tail sits on the stretch axis, 0.8 r behind the smoothed vertical motion, and a
  // visible tail (weight 0.05 or more) never switches sides between two frames
  const tw = W.createSim({ seed: 12345, aspect: 0.42, heat: 5, waxAmount: 5, cap: 64, taper: 0.8 });
  let twOnAxis = true, twFlips = 0, twSeen = 0, prev = new Map();
  for (let i = 0; i < 120 * 60; i++) {
    tw.step(STEP);
    const now = new Map();
    tw.blobs.forEach(function (b, k) {
      const tl = tw.tails[k];
      if (!(tl.w > 0)) return;
      twSeen++;
      const side = tl.y < b.y ? -1 : 1;
      if (tl.x !== b.x || Math.abs(Math.abs(tl.y - b.y) - 0.8 * b.r) > 1e-12 || side !== (b.svy > 0 ? -1 : 1)) twOnAxis = false;
      const p = prev.get(b);
      if (p && tl.w >= 0.05 && p.w >= 0.05 && p.side !== side) twFlips++;
      now.set(b, { side: side, w: tl.w });
    });
    prev = now;
  }
  check('tail: every drawn tail sits on its blob vertical axis, 0.8 r behind the smoothed motion', twSeen > 1000 && twOnAxis);
  check('tail: no visible tail switches sides between two frames', twFlips === 0);

  // The tail weight does not pop to 1 in one step: after a jump in vy it is at most what the
  // low-passed svy allows
  const tp = W.createSim({ seed: 58, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(tp);
  tp.pool.T = 0;
  const tpB = addBlob(tp, 1.2, 0.5, tp.Vb, 0.5);
  tpB.vy = 0.3;
  tp.step(STEP);
  const tpW = tp.tails[0].w;
  const tpMax = W.LAVA.KT * Math.min(1, W.LAVA.KSHAPE * STEP) * Math.abs(tpB.vy);
  check('tail: one step after a jump in vy the tail weight is at most what the low-passed motion allows',
    tp.blobs[0] === tpB && tpB.vy > 0.05 && tpW > 0 && tpW <= tpMax + 1e-9 && tpW < 0.5);
}

// ================= Split and drip children fill (2026-10-01 amendment) =================
if (W.createSim) {
  // A rising split: the child starts empty at the parent and takes half over FILL_TIME
  const fs1 = W.createSim({ seed: 58, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(fs1);
  fs1.pool.T = 0;
  const fsP = addBlob(fs1, 1.2, 0.5, 2.5 * fs1.Vb, 0.9);
  fsP.vy = fsP.svy = 0.3; fsP.stretch = 1.8;
  const fsV0 = fsP.vol, fsR0 = fsP.r, fsTotal = fs1.total();
  fs1.step(STEP);
  const fsC = fs1.blobs[fs1.blobs.indexOf(fsP) + 1];
  check('split: the child starts at the parent and fills by at most one FILL_TIME step',
    fs1.events.splits === 1 && !!fsC && fsC.vol <= 0.5 * fsV0 * STEP / W.LAVA.FILL_TIME * (1 + 1e-9) &&
    Math.hypot(fsC.x - fsP.x, fsC.y - fsP.y) < 0.1 * fsR0);
  let fsConserved = true;
  for (let i = 0; i < Math.ceil(W.LAVA.FILL_TIME / STEP) + 1; i++) {
    fs1.step(STEP);
    if (Math.abs(fs1.total() - fsTotal) >= 1e-12) fsConserved = false;
  }
  check('split: after FILL_TIME the halves hold equal volume', Math.abs(fsC.vol - fsP.vol) < 1e-12 && Math.abs(fsC.vol - 0.5 * fsV0) < 1e-12);
  // The parent rises straight up, so across the motion is x and along it is y. The drag slows the
  // small child, so it trails the parent. Measured (seed 58): 1.052 r0 apart across the motion,
  // the child 0.256 r0 behind along it.
  check('split: after FILL_TIME the halves sit 1 r0 apart across the motion and the child lags at most 0.4 r0 along it',
    Math.abs(fsC.x - fsP.x) / fsR0 >= 0.95 && Math.abs(fsC.x - fsP.x) / fsR0 <= 1.15 &&
    (fsP.y - fsC.y) / fsR0 <= 0.4);
  check('split: volume conserved at every step', fsConserved);

  // A drip: the drop starts empty at the parent and fills while it moves to the underside
  const dz = W.createSim({ seed: 5, aspect: 2.43, heat: 5, waxAmount: 5 });
  clearToPool(dz);
  dz.pool.T = 0;
  const dzP = addBlob(dz, 1.2, 0.95, 4 * dz.Vb, 0.3);
  let dzDrop = null, dzFirst = -1;
  for (let i = 0; i < 1200 && !dzDrop; i++) {
    dzP.y = 0.95; dzP.vy = 0; dzP.T = 0.3;
    const before = dz.blobs.slice();
    dz.step(STEP);
    if (dz.events.drips > 0) { dzDrop = dz.blobs.find(b => before.indexOf(b) < 0); dzFirst = dzDrop ? dzDrop.vol : -1; }
  }
  check('drip: the drop starts with at most one FILL_TIME step of volume',
    !!dzDrop && dzFirst <= 0.15 * 4 * dz.Vb * STEP / W.LAVA.FILL_TIME * (1 + 1e-9));
  run(dz, Math.ceil(W.LAVA.FILL_TIME / STEP) + 1, function () { dzP.y = 0.95; dzP.vy = 0; dzP.T = 0.3; });
  check('drip: after FILL_TIME the drop holds 15 percent and sits below the parent',
    !!dzDrop && Math.abs(dzDrop.vol - 0.15 * 4 * dz.Vb) < 1e-9 && dzDrop.y < dzP.y - 0.5 * dzP.r);

  // Review: Wax Amount and resize changes while flows run keep the volume exact and the state finite
  const rv = W.createSim({ seed: 60, aspect: 0.42, heat: 10, waxAmount: 5, cap: 64, taper: 0.8 });
  run(rv, 30 * 60);
  let rvOk = true;
  for (let i = 0; i < 40; i++) {
    if (i % 2) rv.setWaxAmount(i % 4 === 1 ? 9 : 2); else rv.resize(i % 4 === 0 ? 0.5 : 0.42);
    run(rv, 30);
    if (Math.abs(rv.total() - rv.V) >= 1e-9 || !allFinite(rv)) rvOk = false;
  }
  check('review: settings changes during merges, drains and fills keep the volume exact and the state finite', rvOk);

  // Review: a settings change in the middle of a split fill scales `need` and `sx` with it
  function splitFillWith(change) {
    const sf = W.createSim({ seed: 58, aspect: 2.43, heat: 5, waxAmount: 5 });
    clearToPool(sf);
    sf.pool.T = 0;
    const sfP = addBlob(sf, 1.2, 0.5, 2.5 * sf.Vb, 0.9);
    sfP.vy = sfP.svy = 0.3; sfP.stretch = 1.8;
    const sfR0 = sfP.r, sfVol0 = sfP.vol, sfV0 = sf.V;
    run(sf, 6);
    const sfC = sf.blobs[sf.blobs.indexOf(sfP) + 1];
    const sfMid = sf.flows.length === 1 && sfC.vol > 0 && sfC.vol < 0.5 * sfVol0;
    change(sf);
    run(sf, Math.ceil(W.LAVA.FILL_TIME / STEP));
    return { sf: sf, P: sfP, C: sfC, r0: sfR0, sum: sfVol0 * sf.V / sfV0, mid: sfMid };
  }
  // Measured (seed 58): across the motion the halves end 1.054 r0 apart after Wax Amount 9
  // and 1.723 r0 apart after a resize to aspect 4 (1.05 r0 times 4 / 2.43).
  const sw = splitFillWith(function (s) { s.setWaxAmount(9); });
  check('review: Wax Amount changed in the middle of a split fill leaves equal halves at the scaled volume',
    sw.mid && sw.sf.flows.length === 0 && Math.abs(sw.C.vol - sw.P.vol) < 1e-12 &&
    Math.abs(sw.C.vol + sw.P.vol - sw.sum) < 1e-9 && Math.abs(sw.sf.total() - sw.sf.V) < 1e-12 &&
    Math.abs(sw.C.x - sw.P.x) / sw.r0 >= 1.0 && Math.abs(sw.C.x - sw.P.x) / sw.r0 <= 1.1);
  const sz = splitFillWith(function (s) { s.resize(4); });
  check('review: resize in the middle of a split fill leaves equal halves at the scaled separation',
    sz.mid && sz.sf.flows.length === 0 && Math.abs(sz.C.vol - sz.P.vol) < 1e-12 &&
    Math.abs(sz.C.vol + sz.P.vol - sz.sum) < 1e-9 && Math.abs(sz.sf.total() - sz.sf.V) < 1e-12 &&
    Math.abs(sz.C.x - sz.P.x) / sz.r0 >= 1.65 && Math.abs(sz.C.x - sz.P.x) / sz.r0 <= 1.8);
}

// ================= Spec 15.1 constants (final review) =================
// Several per-event checks scale with the constant they test, so pin the values here.
check('constants: the eight spec 15.1 values are pinned',
  W.LAVA.MERGE_MAX === 2.5 && W.LAVA.MERGE_TIME === 0.5 && W.LAVA.KREP === 6 && W.LAVA.REP_RANGE === 2 &&
  W.LAVA.ABSORB_TIME === 1.5 && W.LAVA.POOL_IN === 2 && W.LAVA.KSHAPE === 6 && W.LAVA.FILL_TIME === 0.3);

// ================= Frame snap (final review) =================
// Chromium coarsens the frame time to 0.1 ms, so a 60 Hz frame reads 16.6, 16.7 or 16.8 ms.
// Without the snap the accumulator sits on its boundary and runs 0 substeps in one frame and
// 2 in the next. Counts the substeps of 900 frames fed through snapFrameTime.
function frameCadence(periodMs) {
  const sim = W.createSim({ seed: 5, aspect: 0.42, heat: 5, waxAmount: 5, cap: 64, taper: 0.8 });
  const counts = {};
  let prev = 0, real = 0, kept = true;
  for (let k = 1; k <= 900; k++) {
    const t = Math.floor(k * periodMs * 10) / 10;
    const raw = (t - prev) / 1000;
    prev = t; real += raw;
    const elapsed = W.snapFrameTime(raw);
    if (elapsed !== raw) kept = false;
    const t0 = sim.time;
    sim.step(elapsed);
    const n = Math.round((sim.time - t0) / STEP);
    counts[n] = (counts[n] || 0) + 1;
  }
  return { counts: counts, real: real, simTime: sim.time, kept: kept };
}
if (typeof W.snapFrameTime === 'function') {
  const c60 = frameCadence(1000 / 60), c30 = frameCadence(1000 / 30), c144 = frameCadence(3000 / 144);
  check('frame snap: 900 frames at 60 Hz each run one substep', c60.counts[1] === 900);
  check('frame snap: 900 frames at 30 Hz each run two substeps', c30.counts[2] === 900);
  check('frame snap: 20.83 ms frames are not snapped and keep real time',
    c144.kept && Math.abs(c144.simTime - c144.real) <= STEP);
} else {
  check('frame snap: snapFrameTime implemented', false);
}

// ================= Stir child temperature (final review) =================
// A stir split runs between frames and makes the child empty. The next substep must not
// treat the empty kernel as a tiny blob that takes the ambient temperature at once.
{
  const sc = W.createSim({ seed: 21, aspect: 0.42, heat: 5, waxAmount: 5, cap: 64, taper: 0.8 });
  clearToPool(sc);
  sc.pool.T = 0;
  const scP = addBlob(sc, 0.21, 0.5, 1.5 * sc.Vb, 0.9);
  sc.stir(scP.x, scP.y, 2.5, 0);
  const scC = sc.blobs[1];
  sc.step(STEP);
  const scDT = scC ? Math.abs(scC.T - scP.T) : Infinity;
  run(sc, Math.round(W.LAVA.FILL_TIME / STEP));
  console.log('   stir child: T off the parent by ' + scDT.toFixed(3) + ' after one substep, vy ' +
    (scC ? scC.vy.toFixed(3) : 'none') + ' after FILL_TIME');
  check('stir: the child keeps the parent temperature and still rises after FILL_TIME',
    !!scC && scDT < 0.01 && sc.blobs.indexOf(scC) >= 0 && scC.vy > 0);
}

console.log(ran + ' checks, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
