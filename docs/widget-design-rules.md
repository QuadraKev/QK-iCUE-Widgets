# QK iCUE Widget Design Rules

Rules and patterns for building QK widgets. For the iCUE widget API reference (meta tags, properties, events, translation), see `iCUE-Widget-System-Documentation.md`.

## Device Specifications

### Xeneon Edge (dashboard_lcd)
- 2560x720 pixels, 32:9, 14.5" display, 183.40 PPI
- Capacitive touchscreen
- Restriction value: `dashboard_lcd`

| Slot | Documented Size | Actual Viewport | Aspect Ratio |
|------|----------------|-----------------|-------------|
| HS   | 840x344        | 841x345         | ~2.44:1     |
| HM   | 840x696        | 841x697         | ~1.21:1     |
| HL   | 1688x696       | 1689x697        | ~2.43:1     |
| HXL  | 2536x696       | 2537x697        | ~3.64:1     |
| VS   | 696x416        | 697x417         | ~1.67:1     |
| VM   | 696x840        | 697x841         | ~0.83:1     |
| VL   | 696x1688       | 697x1689        | ~0.41:1     |
| VXL  | 696x2536       | 697x2537        | ~0.27:1     |

Note: The actual viewport reported by `window.innerWidth/innerHeight` is 1px larger than the documented slot size in each dimension.

### Keyboard LCD (keyboard)
- 320x170 px display, 1.9" LCD
- Widget viewport: 248x170 px (sidebars consume 72px horizontally)
- Aspect ratio: ~1.46:1
- Framerate: 2-4 FPS (animated widgets will not perform well)
- No touchscreen: widgets must be non-interactive
- Restriction value: `keyboard`
- Used by: Corsair VANGUARD series keyboards

### Pump LCD (pump_lcd)
- 480x480 pixels, 1:1, 2.1" display, 323.25 PPI
- No touchscreen: widgets must be non-interactive or auto-cycling
- Design within a circle: content outside ~85% radius may be clipped
- Restriction value: `pump_lcd`

### iCUE Live Preview Sizes

iCUE renders live widget previews in the widget picker / slot selector at scaled-down sizes while preserving aspect ratio. Measured using the Viewport Probe tool (`tools/viewport-probe.html`).

**Scale factors:** Previews use discrete zoom levels that scale both dimensions proportionally.

| Zoom Level | Scale Factor | Preview Width (for 697px actual) |
|------------|-------------|----------------------------------|
| Zoom 1 (most zoomed in) | ~2.66x | 262px |
| Zoom 2 | ~3.56x | 196px |
| Zoom 3 | ~5.32x | 131px |
| Zoom 4 (most zoomed out) | ~8.0x | 87px |

**Horizontal slots** have a single preview zoom level (2.66x). **Vertical slots** have multiple zoom levels that the user can cycle through.

| Slot | Actual Viewport | Preview Z1 | Preview Z2 | Preview Z3 | Preview Z4 |
|------|----------------|------------|------------|------------|------------|
| HS   | 841x345        | 316x130    | -          | -          | -          |
| HM   | 841x697        | 316x262    | -          | -          | -          |
| HL   | 1689x697       | 634x262    | -          | -          | -          |
| HXL  | 2537x697       | 952x262    | -          | -          | -          |
| VS   | 697x417        | 262x157    | 196x118    | too small  | -          |
| VM   | 697x841        | 262x316    | 196x237    | 131x158    | -          |
| VL   | 697x1689       | 262x234*   | 196x475    | 131x317    | -          |
| VXL  | 697x2537       | 262x952    | 196x714    | 131x476    | 87x315     |
| PUMP | 480x480        | 165x165    | -          | -          | -          |

*VL at Zoom 1 is cropped vertically: the preview container caps height at ~234px, showing only the top portion of the widget (full height at 2.66x would be ~635px).

**Design implications:**
- The smallest readable preview is ~87x315 (VXL Zoom 4) or ~131x158 (VM Zoom 3)
- Chromium enforces a minimum font size of ~10px, which distorts proportions at small preview sizes when using raw `vmin` units
- Use only `min-aspect-ratio`/`max-aspect-ratio` for CSS breakpoints so previews match actual layouts
- Avoid `max(Npx, Xvmin)` px floors for sizing, as px minimums cause elements to appear oversized in small previews

### Preview Scale Compensation (cqmin pattern)

To make preview proportions match the actual widget, use CSS container query units (`cqmin`) with a body scale transform. This bypasses Chromium's minimum font size by rendering the widget at actual dimensions and then visually scaling down.

**CSS setup:**
```css
:root {
    --s: 1;           /* scale factor: 1 at actual size, >1 at preview */
    --u: 1cqmin;      /* scaled unit: replaces vmin throughout */
}
html { overflow: hidden; }
body {
    width: calc(100vw * var(--s));
    height: calc(100vh * var(--s));
    transform: scale(calc(1 / var(--s)));
    transform-origin: top left;
    container-type: size;
    overflow: hidden;
}
```

**JS detection** (sets `--s` based on actual vs current viewport):
```javascript
var ACTUAL_SIZES = [
    { minA: 3.5,  maxA: 4.0,  w: 2537, h: 697  }, // HXL
    { minA: 2.41, maxA: 2.45, w: 841,  h: 345  }, // HS
    { minA: 2.0,  maxA: 2.5,  w: 1689, h: 697  }, // HL
    { minA: 1.5,  maxA: 1.8,  w: 697,  h: 417  }, // VS
    { minA: 1.15, maxA: 1.25, w: 841,  h: 697  }, // HM
    { minA: 0.95, maxA: 1.05, w: 480,  h: 480  }, // Pump
    { minA: 0.8,  maxA: 0.9,  w: 697,  h: 841  }, // VM
    { minA: 0.38, maxA: 0.45, w: 697,  h: 1689 }, // VL
    { minA: 0.25, maxA: 0.3,  w: 697,  h: 2537 }  // VXL
];

function updatePreviewScale() {
    var w = window.innerWidth, h = window.innerHeight;
    var aspect = w / h, scale = 1;
    for (var i = 0; i < ACTUAL_SIZES.length; i++) {
        var s = ACTUAL_SIZES[i];
        if (aspect >= s.minA && aspect <= s.maxA) { scale = s.w / w; break; }
    }
    if (scale > 0.9 && scale < 1.1) scale = 1;
    document.documentElement.style.setProperty('--s', scale.toFixed(4));
}
```

Call `updatePreviewScale()` on load and on resize.

**Usage:** Replace all `Xvmin` with `calc(X * var(--u))` throughout CSS. At actual size, `--s = 1` and `cqmin = vmin`. At preview size, the body is scaled to actual dimensions, `cqmin` is based on the larger body, and `transform: scale()` shrinks the visual output. Font sizes compute above 10px (no Chromium clamping) because the container is actual-widget-sized.

**How it works:**
1. Body dimensions are multiplied by `--s`, making it the same size as the actual widget
2. `cqmin` units resolve against the body (container), so all sizes match actual proportions
3. `transform: scale(1/--s)` shrinks the visual output to fit the preview viewport
4. Since transform is purely visual (post-layout), Chromium's min font size check sees the unscaled computed values (which are above 10px) and does not clamp them

## Responsive Layout

### Breakpoints (CSS media queries)

ONLY use `min-aspect-ratio` / `max-aspect-ratio` for breakpoints. NEVER use `min-height` / `max-height` because iCUE renders live previews at a scaled-down pixel size while preserving aspect ratio. Height-based breakpoints cause previews to show the wrong layout.

Common breakpoint pattern:
```css
/* Wide (HS/HL/HXL): aspect >= 2.0 */
@media (min-aspect-ratio: 200/100) { ... }

/* Near-square (HM/VS): aspect 0.9 to 1.8 */
@media (max-aspect-ratio: 180/100) and (min-aspect-ratio: 90/100) { ... }

/* Portrait (VM/VL/VXL): aspect < 0.9 */
@media (max-aspect-ratio: 90/100) { ... }

/* Very tall (VL/VXL): aspect < 0.5 */
@media (max-aspect-ratio: 50/100) { ... }
```

VS (1.67:1) falls in the near-square range. Handle via the near-square query or a dedicated one.

### Distinguishing S from non-S layouts

HS (2.44:1) and HL (2.43:1) have nearly identical aspect ratios but can be distinguished:
- `min-aspect-ratio: 243/100` matches HS (2.4419) but not HL (2.4253)
- `max-aspect-ratio: 300/100` excludes HXL (3.64)

VS (1.67:1) is unique and can be targeted with `min-aspect-ratio: 150/100` and `max-aspect-ratio: 180/100`.

For JS-based S detection, use `window.innerWidth < 500 || window.innerHeight < 500` combined with aspect ratio constraints to avoid affecting previews.

### Layout naming convention
- **H** prefix = horizontal, **V** prefix = vertical
- **S/M/L/XL** without prefix = both orientations of that size
- Examples: "HS" = horizontal small, "VL" = vertical large, "M" = both HM and VM

## Body CSS

Every widget's body element MUST include:
```css
body {
    -webkit-tap-highlight-color: transparent;
}
```
Without this, iCUE's Chromium engine (Qt WebEngine) shows a dark overlay flash on tap/click interactions.

## Sizing and Units

- Use viewport units (vh, vw, vmin) for all layout sizing; never px or rem for layout elements
- S slot is half the height of M/L/XL (344 vs 696): vh values in S produce physically smaller elements
- Touch targets: minimum 44x44px (2.42mm at 183.40 PPI)
- UI bars and labels: use `max(Npx, Xvmin)` pattern for consistent sizing across all slot sizes
- Remove per-breakpoint size overrides when vmin+max() base styles handle all sizes

## Visual Style Guide

All QK widgets share a consistent visual identity. Follow these rules to keep widgets visually cohesive across devices and slot sizes.

### Font

All QK widgets use **Jost** as the sole typeface. Do not use OpenSans, Segoe UI, Bebas Neue, or any other font. Jost is a variable font (weights 100-900, latin subset, woff2), embedded as a base64 data URI in each HTML file (~35KB overhead). This keeps widgets self-contained with no network dependency.

The base64 data is stored at `docs/jost-woff2-base64.txt`.

Embedding:
```css
/* Jost font: Copyright 2020 The Jost Project Authors (https://github.com/indestructible-type), SIL Open Font License 1.1 */
@font-face {
    font-family: 'Jost';
    font-style: normal;
    font-weight: 100 900;
    src: url(data:font/woff2;base64,...) format('woff2');
}
```

The license comment MUST be included above the `@font-face` block in every widget that embeds the font.

iCUE also bundles OpenSans-SemiBold.ttf and BebasNeuePro-SemiExpBold.otf via `url('qrc:/fonts/...')`, but QK widgets do not use these.

### Font Weight Hierarchy

| Weight | Role | Examples |
|--------|------|----------|
| 700    | Headings, large numbers, widget title | customTitle, score displays, clock digits |
| 600    | Primary body text, labels | body default, status labels, "NOW PLAYING" |
| 400 (default) | Secondary/supporting text | artist, album, descriptions, offline messages |

Always use `font-family: 'Jost', sans-serif;` with an explicit weight where needed. Elements inheriting from body get weight 600 by default (set on `body`).

### Color Roles

Widgets use three CSS custom properties for theming, mapped to iCUE's Device Personalization system:

| Variable | Role |
|----------|------|
| `--text-color` | Primary text, labels |
| `--accent-color` | Highlights, active indicators, interactive elements, canvas visualizations |
| `--bg-color` | Widget background (affected by transparency on Xenon Edge) |

Use `var(--accent-color)` for accent elements in CSS. For canvas rendering, parse the hex value to RGB:
```javascript
function getAccentRGB() {
    var ac = cfg.accentColor;
    if (typeof ac === 'string' && ac.charAt(0) === '#' && ac.length >= 7) {
        return parseInt(ac.slice(1, 3), 16) + ', ' +
               parseInt(ac.slice(3, 5), 16) + ', ' +
               parseInt(ac.slice(5, 7), 16);
    }
    return '29, 185, 84'; // fallback green
}
```

## Required Settings Pattern

### Group 1: Widget Name

iCUE provides a native Size selector (S/M/L/XL) as the first group. This group:
- MUST contain `customTitle` (textfield, default `''`) as the LAST property
- May contain additional widget-specific settings before `customTitle`
- `customTitle`, when non-empty, displays user text centered at the top of the widget

### Group 2: Appearance

MUST contain the four standard DP-mapped properties in this order:
1. `textColor` (color): main text color
2. `accentColor` (color): highlights and accents
3. `backgroundColor` (color): widget background
4. `transparency` (slider 0-100, default 100): background transparency. **Value semantics match iCUE convention: 100 = fully opaque, 0 = fully transparent.**

When these four properties exist in a second group, iCUE automatically renders a "Custom Style" toggle. Widget-specific color properties go in this group alongside the standard four.

Canvas-only widgets without text (matrix-rain, starfield) may omit `textColor`.

### Important constraints

- iCUE rejects groups with empty `"properties": []` arrays or unknown property types. The widget will not appear in iCUE at all if either condition is violated.
- `customTitle` in Group 1 ensures Group 1 always has at least one property, which is required for iCUE to enable the Custom Style toggle on Group 2.

## Transparency

**Xeneon Edge**: The Transparency setting ONLY affects the widget background color opacity. It MUST NOT affect text, canvas trails, or other visual elements.

**Value semantics**: transparency=100 means fully opaque (default), transparency=0 means fully transparent. This matches iCUE's built-in widget convention.

CSS application:
```css
background-color: color-mix(in srgb, var(--bg-color), transparent calc((1 - var(--widget-opacity)) * 100%));
```

JS conversion:
```javascript
root.style.setProperty('--widget-opacity', cfg.transparency / 100);
```

**Pump LCD**: Transparency is inert (no background layer behind the pump LCD). The setting exists for DP compatibility but has no visible effect.

Canvas-based widgets (matrix-rain, starfield): apply transparency via body `background-color` rgba, not `canvas.style.opacity`.

## Text

- NEVER use transparent or semi-transparent text. All text must be fully opaque for readability.
- Use `white-space: nowrap` on short labels to prevent wrapping at narrow viewports.

## Settings Controls

- Prefer `tab-buttons` over `combobox` for small option sets (2-5 choices). Tab-buttons always show the selected option visually.
- Reserve combobox for large option lists (e.g., timezone pickers).
- Combobox `data-values` MUST use `key/value` format: `[{'key':'Foo','value':tr('Foo')}]`. Using `title/value` causes blank dropdowns.

## iCUE JavaScript Constraints

- NEVER use `'use strict'`: iCUE injects properties via `eval(backend.data)` with bare global assignments. Strict mode breaks this.
- NEVER use `var icueEvents` or `var iCUE_initialized`: use bare assignment (`icueEvents = {...}`) so iCUE's bootstrap can find the object.

## Standalone Testing

Widgets include a two-part fallback for testing outside iCUE:
```javascript
icueEvents = {
    "onICUEInitialized": onInit,
    "onDataUpdated": readSettings
};

// iCUE already initialized before script ran
if (typeof iCUE_initialized !== 'undefined' && iCUE_initialized) {
    onInit();
}

// Standalone fallback (outside iCUE)
if (typeof iCUE_initialized === 'undefined') { onInit(); }
```

## Screenshots

Use the screenshot tool to render widgets at specific slot sizes:
```
node tools/screenshot.js widgets/QK{Name}/index.html [S|M|L|XL|VS|VM|VL|VXL|PUMP]
```

Inject JS to modify widget state before capture with `--eval`:
```
node tools/screenshot.js widgets/QKDiceRoller/index.html M --eval "cfg.diceMax=100; cfg.diceCount=4; updateDiceShape();"
```

Use `--delay <ms>` to wait longer after eval before capturing (default: 500ms):
```
node tools/screenshot.js widgets/QKStarfield/index.html L --delay 2000
```

Requires puppeteer (`node_modules/` symlinked or installed).
