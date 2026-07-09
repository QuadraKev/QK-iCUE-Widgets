#!/usr/bin/env node
// tools/generate-coastline.js
// One-off generator: Natural Earth 110m land (world-atlas TopoJSON) ->
// packed base64 polygon string embedded in QKISSTracker/index.html.
// Run from repo root: node tools/generate-coastline.js
const fs = require('fs');
const path = require('path');
const https = require('https');

const SRC_URL = 'https://unpkg.com/world-atlas@2.0.2/land-110m.json';
const CACHE = path.join(__dirname, '.cache', 'land-110m.json');
const OUT = path.join(__dirname, 'output', 'coastline-packed.txt');
const LAT_MAX = 75;          // widget map crop
const MIN_RING_POINTS = 8;   // drop micro-islands
const MIN_SPACING_DEG = 0.4; // thin points closer than this (Manhattan)
const BUDGET = 25 * 1024;    // packed size budget (chars)

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Minimal TopoJSON decoder (sufficient for world-atlas land-110m: one
// MultiPolygon object named "land", quantized with a transform).
function decodeTopo(topo) {
  const t = topo.transform;
  const arcs = topo.arcs.map(arc => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]) => {
      x += dx; y += dy;
      return [x * t.scale[0] + t.translate[0], y * t.scale[1] + t.translate[1]];
    });
  });
  const arcLine = i => (i < 0 ? arcs[~i].slice().reverse() : arcs[i]);
  const rings = [];
  for (const geom of topo.objects.land.geometries) {
    for (const poly of geom.type === 'Polygon' ? [geom.arcs] : geom.arcs) {
      for (const ringArcs of poly) {
        const ring = [];
        for (const ai of ringArcs) {
          const line = arcLine(ai);
          for (let j = ring.length ? 1 : 0; j < line.length; j++) ring.push(line[j]);
        }
        rings.push(ring);
      }
    }
  }
  return rings;
}

// Splits each ring at antimeridian crossings (consecutive points, including the
// implicit closing edge, whose |Δlon| > 180) into open polylines. Each resulting
// piece is emitted as its own ring; the renderer's implicit closePath() then
// connects its two endpoints directly. In real coastline data both endpoints of
// a piece lie on the same ±180 edge, so that closure is a short vertical segment
// along the map edge rather than a spurious full-width chord.
function splitAtAntimeridian(rings) {
  const out = [];
  for (let ri = 0; ri < rings.length; ri++) {
    const ring = rings[ri];
    const n = ring.length;
    const jumps = [];
    for (let i = 0; i < n; i++) {
      const a = ring[i], b = ring[(i + 1) % n];
      if (Math.abs(b[0] - a[0]) > 180) jumps.push(i);
    }
    if (jumps.length === 0) { out.push(ring); continue; }
    // A ring that crosses the antimeridian an ODD number of times encircles a pole
    // (only Antarctica does this in this dataset) — a closed 2D ring fundamentally
    // cannot be split into simple pieces by connecting two cut endpoints directly in
    // that case (the single "closing" edge IS the original crossing edge; there is no
    // other way to close the loop without adding explicit pole-hugging border geometry,
    // which is out of scope here). Pass it through unchanged, same as a no-jump ring.
    // The widget's skipStrokeSegment has a defensive |Δlon|>180 check specifically for
    // this residual case, so it never renders as a stray stroke; only fill-boundary
    // shape for this one landmass is affected, unchanged from pre-existing behavior.
    if (jumps.length % 2 === 1) {
      console.warn('splitAtAntimeridian: ring ' + ri + ' has an odd antimeridian crossing count (' +
        jumps.length + ') — pole-wrapping ring, cannot be split; passing through unchanged.');
      out.push(ring);
      continue;
    }
    for (let k = 0; k < jumps.length; k++) {
      const start = (jumps[k] + 1) % n;
      const end = jumps[(k + 1) % jumps.length];
      const piece = [];
      let idx = start;
      while (true) {
        piece.push(ring[idx]);
        if (idx === end) break;
        idx = (idx + 1) % n;
      }
      const p0 = piece[0], p1 = piece[piece.length - 1];
      if (Math.abs(p0[0]) < 179.9 || Math.abs(p1[0]) < 179.9)
        console.warn('splitAtAntimeridian: ring ' + ri + ' piece endpoints not both on antimeridian edge: [' + p0 + '] -> [' + p1 + ']');
      out.push(piece);
    }
  }
  return out;
}

function thin(ring) {
  const out = [ring[0]];
  for (const p of ring) {
    const q = out[out.length - 1];
    if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) >= MIN_SPACING_DEG) out.push(p);
  }
  return out;
}

const zigzag = n => (n << 1) ^ (n >> 31);
function pushVarint(bytes, u) {
  while (u > 127) { bytes.push((u & 127) | 128); u >>>= 7; }
  bytes.push(u);
}

function pack(rings) {
  const bytes = [];
  pushVarint(bytes, rings.length);
  for (const ring of rings) {
    pushVarint(bytes, ring.length);
    let px = 0, py = 0;
    for (const [lon, lat] of ring) {
      const qx = Math.round(lon * 10);
      const qy = Math.round(Math.max(-LAT_MAX, Math.min(LAT_MAX, lat)) * 10);
      pushVarint(bytes, zigzag(qx - px));
      pushVarint(bytes, zigzag(qy - py));
      px = qx; py = qy;
    }
  }
  return Buffer.from(bytes).toString('base64');
}

// EXACT copy of the widget-side decoder (Task 3 pastes this into index.html).
// Kept byte-identical here so the round-trip test proves the widget decode path.
function decodeCoastline(b64) {
  var bin = atob(b64), pos = 0;
  function varint() {
    var u = 0, s = 0, b;
    do { b = bin.charCodeAt(pos++); u |= (b & 127) << s; s += 7; } while (b & 128);
    return u >>> 0;
  }
  function unzig(u) { return (u >>> 1) ^ -(u & 1); }
  var rings = [], n = varint();
  for (var i = 0; i < n; i++) {
    var m = varint(), ring = new Float32Array(m * 2), x = 0, y = 0;
    for (var j = 0; j < m; j++) {
      x += unzig(varint()); y += unzig(varint());
      ring[j * 2] = x / 10; ring[j * 2 + 1] = y / 10;
    }
    rings.push(ring);
  }
  return rings;
}

(async () => {
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  let raw;
  if (fs.existsSync(CACHE)) {
    raw = fs.readFileSync(CACHE, 'utf8');
  } else {
    raw = await download(SRC_URL);
    fs.writeFileSync(CACHE, raw);
  }
  const decoded = decodeTopo(JSON.parse(raw));
  const split = splitAtAntimeridian(decoded);
  // Drop rings that degenerate entirely into the crop-edge clamp line (e.g. islands above 75N / below -75S).
  const cropped = split.filter(r => !r.every(p => Math.abs(p[1]) >= LAT_MAX));
  const rings = cropped.map(thin).filter(r => r.length >= MIN_RING_POINTS);
  const b64 = pack(rings);

  // Round-trip verification
  const back = decodeCoastline(b64);
  if (back.length !== rings.length) throw new Error('ring count mismatch');
  const q0 = [Math.round(rings[0][0][0] * 10) / 10, Math.round(Math.max(-LAT_MAX, Math.min(LAT_MAX, rings[0][0][1])) * 10) / 10];
  if (Math.abs(back[0][0] - q0[0]) > 0.001 || Math.abs(back[0][1] - q0[1]) > 0.001)
    throw new Error('first point mismatch: ' + back[0][0] + ',' + back[0][1] + ' vs ' + q0);
  for (const ring of back)
    for (let j = 0; j < ring.length; j += 2)
      if (ring[j] < -180.05 || ring[j] > 180.05 || Math.abs(ring[j + 1]) > LAT_MAX + 0.05)
        throw new Error('coordinate out of range after round-trip');
  // No consecutive-point segment (closing segment included) should jump the antimeridian,
  // EXCEPT the single documented pole-wrap ring (odd crossing count, see splitAtAntimeridian)
  // which cannot be split and is intentionally passed through with its one residual jump.
  let poleWrapRings = 0;
  for (const ring of back) {
    const m = ring.length / 2;
    let jumpCount = 0;
    for (let j = 0; j < m; j++) {
      const k = (j + 1) % m;
      if (Math.abs(ring[k * 2] - ring[j * 2]) > 180) jumpCount++;
    }
    if (jumpCount > 1) throw new Error('antimeridian jump remains after split (ring closing segment included)');
    if (jumpCount === 1) poleWrapRings++;
  }
  if (poleWrapRings > 1) throw new Error('expected at most 1 pole-wrap ring, found ' + poleWrapRings);

  const pts = rings.reduce((s, r) => s + r.length, 0);
  console.log('rings=' + rings.length + ' points=' + pts + ' packed=' + b64.length + ' chars (budget ' + BUDGET + ')');
  if (b64.length > BUDGET) { console.error('OVER BUDGET — raise MIN_SPACING_DEG and re-run'); process.exit(1); }
  fs.writeFileSync(OUT, b64);
  console.log('written: ' + OUT);
})().catch(e => { console.error(e); process.exit(1); });
