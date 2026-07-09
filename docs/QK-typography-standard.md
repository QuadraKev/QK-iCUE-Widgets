# QK Typography Standard

Physical text-size targets for all QK widgets, derived from screen-readability standards and locked to each device's PPI. Status: **validated on-device** (2026-07-08: 30 px row confirmed comfortably readable at desk distance). Full research notes: `docs/superpowers/research/2026-07-08-typography.md` (local-only).

## Evidence base

Ergonomic and automotive display standards converge on character (cap) height measured as visual angle:

| Source | Minimum | Recommended | Context |
|---|---|---|---|
| ISO 9241-303 | 16′ | 20–22′ | general electronic displays |
| ANSI/HFES 100 | 16′ | 20–22′ | office/VDT |
| ISO 15008 (automotive) | 12′ absolute, 16′ acceptable | ≥20′ | in-vehicle, glanceable — closest analog to widgets |
| MIL-STD-1472H | 10′ | 16–20′ | on-screen text |
| Reading-fluency research (Legge) | — | ~2× threshold for effortless reading | applied to hero tier |

(′ = arcminutes. mm = distance_mm × tan(′/60 × π/180). At 60 cm: 16′ ≈ 2.8 mm, 22′ ≈ 3.8 mm.)

## Text roles and physical targets

Assumed viewing distances: **Xeneon Edge 60 cm** (desk strip), **Pump 75 cm** (in-case, behind glass), **Keyboard 50 cm**.

| Role | Cap height target | XE @60 cm | Pump @75 cm | KB @50 cm |
|---|---|---|---|---|
| Secondary label / units | 16′ (glanceable minimum) | 2.8 mm | 3.5 mm | 2.3 mm |
| Body / supporting text | 20–22′ | 3.5–3.8 mm | 4.4–4.8 mm | 2.9–3.2 mm |
| Primary value | ~30′ | 5.2 mm | 6.5 mm | 4.4 mm |
| Hero numeral | ~44′ (≈2× minimum) | 7.7 mm | 9.6 mm | 6.4 mm |

## Converting to CSS font-size

CSS px on these devices = physical device px (native-resolution webview). Standards specify CAP height; CSS specifies em size. **Jost cap-height ratio: 0.70** (measured from the embedded font file).

`font-size_px = cap_mm ÷ 0.70 × PPI ÷ 25.4`

| Role | XE (183.40 PPI) | Pump (323.25 PPI) | KB (190.7 PPI) |
|---|---|---|---|
| Secondary label | **29 px** | 63 px | 25 px |
| Body | **40 px** | 87 px | 31 px |
| Primary value | **54 px** | 119 px | 44 px |
| Hero | **79 px** | 175 px | 65 px |

Notes:
- Pump/KB numbers are per-standard ideals; both displays are so small that "hide, don't shrink" dominates — show the hero (and at most one label) at target size rather than shrinking multiple elements below it. The KB's historical 13 px label floor is well below standard (≈8′); treat KB labels as best-effort, hero as the contract.
- Weight: Jost 600–700 at these sizes; never below 400. `font-variant-numeric: tabular-nums` on all numerals.

## XE slot token system

All XE slots except HS share a 697 px physical dimension (height for wide/HM, width for portrait). A target of N px is therefore N/6.97 % of that dimension in every slot family — one set of multipliers, one baseline unit per family:

```css
:root {           /* wide slots ≥ HL, and HM: 697px tall */
  --u: 1vh;
  --font-label: calc(var(--u) * 4.2);   /* 29px on device */
  --font-body:  calc(var(--u) * 5.7);   /* 40px */
  --font-value: calc(var(--u) * 7.8);   /* 54px */
  --font-hero:  calc(var(--u) * 11.3);  /* 79px */
}
/* HS only (345px tall): double the unit — see breakpoint below */
@media (min-aspect-ratio: 2427/1000) and (max-aspect-ratio: 299/100) { :root { --u: 2vh; } }
/* VS + portrait (697px wide) */
@media (max-aspect-ratio: 199/100) { :root { --u: 1vw; } }
```

(Exact multipliers 4.16/5.74/7.75/11.33 round to 4.2/5.7/7.8/11.3; ±1 px on device.)

### The HS/HL breakpoint (aspect 2427/1000)

HS and HL have nearly identical aspect ratios but differ at the hundredth (actual viewports: HS 841×345 = 2.4377, HL 1689×697 = 2.4232). The threshold **2427/1000** separates them, including the measured preview sizes:

| Case | Ratio | Side of 2.427 |
|---|---|---|
| HS actual 841×345 | 2.4377 | above ✓ |
| HS preview 316×130 | 2.4308 | above ✓ |
| HL actual 1689×697 | 2.4232 | below ✓ |
| HL preview 634×262 | 2.4198 | below ✓ |

Margins are ~0.16%: **deterministic on device** (dimensions are fixed), but a ±1 px rounding change in a future iCUE preview size could flip which wide layout the *preview* shows — a cosmetic risk only. Re-verify with `tools/viewport-probe.html` after iCUE updates.

### Preview caveats (unchanged from design guidelines)

Chromium's ~10 px minimum font size distorts small previews (vertical zoom 3/4); px floors like `max(29px, 4.2vh)` are banned because they oversize text in previews. Where preview fidelity matters, use the cqmin compensation pattern (see `QK-widget-design-guidelines.md` → Preview Scale Compensation).

## Compliance summary for new widgets

1. Pick sizes from the role table — never smaller than the label row for anything that must be read.
2. Use the family multipliers above; if a slot can't fit everything at target size, hide elements (hide-don't-shrink), never scale down.
   - *Touch-control caption carve-out:* captions on touch targets (tool/action buttons) are read at touch distance, not ambient distance, and may stay visible below target when (a) the icon alone is ambiguous and (b) a documented geometric ceiling caps them — maximize within the control, don't hide.
   - *Constrained containers:* where a circular or fixed-geometry container caps text (8-ball, moon disc, game tiles), the verified ratio-vs-container benchmark governs instead of the raw px margin; document the ceiling with rendered failing+passing candidates.
3. Verify with `tools/screenshot.js` at 100% and check px sizes match the table (screenshot px = device px).
4. On-device spot check: text should be comfortably readable from normal seating without leaning in.
