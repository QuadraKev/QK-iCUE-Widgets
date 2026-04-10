# QK iCUE Widget Design Guidelines

**These are QK project-specific guidelines**, not official iCUE requirements. They define the conventions, quality standards, and patterns used across all QK widgets to keep them visually and technically consistent. For the iCUE widget API reference (meta tags, properties, events, translation), see `iCUE-Widget-System-Documentation.md`. For official iCUE requirements, see the [Official Widget Specification](WidgetBuilder-kit/Documentation/docs/WidgetSpecification.md) and [Marketplace Guidelines](WidgetBuilder-kit/Documentation/Marketplace_Guidelines.md) (NDA — do not commit to GitHub).

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

### Reduced Motion

All widgets SHOULD respect the `prefers-reduced-motion` system setting. Add this CSS rule:

```css
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}
```

For canvas-based animations (requestAnimationFrame loops), also check in JS:

```javascript
var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

When `reduceMotion` is true, either pause the animation loop, show a static frame, or significantly reduce the frame rate.

## Sizing and Units

- Use viewport units (vh, vw, vmin) for all layout sizing; never px or rem for layout elements
- S slot is half the height of M/L/XL (344 vs 696): vh values in S produce physically smaller elements
- Touch targets: minimum 44x44px (2.42mm at 183.40 PPI)
- UI bars and labels: use `max(Npx, Xvmin)` pattern for consistent sizing across all slot sizes
- Remove per-breakpoint size overrides when vmin+max() base styles handle all sizes

## Visual Style Guide

All QK widgets share a consistent visual identity. Follow these rules to keep widgets visually cohesive across devices and slot sizes.

### Font

All QK widgets use **Jost** as the project typeface. This is a QK project decision for visual consistency — iCUE itself allows any locally packaged or system font. Do not use other fonts in QK widgets (OpenSans, Segoe UI, Bebas Neue, etc.). Jost is a variable font (weights 100-900, latin subset, woff2), embedded as a base64 data URI in each HTML file (~35KB overhead). This keeps widgets self-contained with no network dependency.

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

The iCUE "Custom Style" toggle ONLY appears on the **second** settings group. This is why Appearance must always be Group 2. If color properties are placed in Group 1, the toggle will not appear.

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
- Combobox `data-values` MUST use `key/value` format: `[{'key':'Foo','value':tr('Foo')}]`. `title/value` is not a documented format — using it results in a blank dropdown.
- Slider properties MUST always include `data-min`, `data-max`, and `data-step` together. Missing `data-step` causes silent iCUE import validation failure.

## iCUE JavaScript Constraints

- NEVER use `'use strict'`: iCUE injects properties via `eval(backend.data)` with bare global assignments. Strict mode breaks this. (Qt WebEngine quirk — not documented in official iCUE docs, confirmed through testing.)
- NEVER use `var icueEvents` or `var iCUE_initialized`: use bare assignment (`icueEvents = {...}`) so iCUE's bootstrap can find the object.
- NEVER call `getUserMedia()`: the function exists in the webview but **hangs indefinitely** — no permission dialog is shown, and the widget freezes. There is no system audio capture path from inside a widget.
- `navigator.mediaSession.metadata` is always `null` in the webview. Reading other apps' Now Playing info is not possible from a widget.
- `iCUE.fpsLimit` (default: 30) is readable if you need to know the current frame rate cap.
- **Interactive widget focus:** When the iCUE desktop app is open (not minimized to tray), touching a widget on the Xeneon Edge steals focus from the user's active application. When iCUE is minimized to the system tray, this does not occur. Design interactive widgets with this in mind.

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

## Visual States

For widgets with loading, empty, error, and content states, use a standardized state management function:

```javascript
function showState(state) {
    var states = ['loading-state', 'error-state', 'empty-state', 'content'];
    states.forEach(function(s) {
        var el = document.querySelector('.' + s);
        if (el) el.style.display = s === state ? '' : 'none';
    });
}
```

Usage:
```javascript
showState('loading-state');  // widget loading
showState('content');        // data ready
showState('error-state');    // API/network failure
showState('empty-state');    // no sensor selected, etc.
```

HTML structure — one container per state, all but the initial state hidden:
```html
<div class="loading-state">Loading...</div>
<div class="error-state" style="display:none">Unable to connect</div>
<div class="empty-state" style="display:none">Select a sensor in settings</div>
<div class="content" style="display:none"><!-- widget content --></div>
```

## Marketplace Compliance

The official iCUE Marketplace currently accepts **Xeneon Edge (`dashboard_lcd`) widgets only**. When submitting QK widgets to the Marketplace, the following requirements apply on top of our existing QK conventions. Full details: `docs/WidgetBuilder-kit/Documentation/Marketplace_Guidelines.md`.

### Code Safety

- All code must be **human-readable**. No obfuscation, minification, or base64-encoded JavaScript.
- No remote `<script src>` — every script must be bundled locally in the widget package.
- No remote fonts — already compliant (Jost is embedded as base64).
- No hardcoded API keys or tokens. If a widget requires an API key, the user must enter it via a `textfield` meta property. Never log or persist API keys.
- `eval()` and `Function()` are restricted. The narrowly-scoped `getIcueProperty()` compatibility helper (used in several widgets to read iCUE-injected globals) is acceptable because it is well-commented, minimal in scope, and only handles documented iCUE runtime behavior — never untrusted input. Keep it clearly commented.
- All external network requests must use **HTTPS** (no plain HTTP).
- No tracking, analytics, or telemetry of any kind.

### Widget Icon

The widget icon appearing in iCUE's widget picker must be:
- **SVG format** with a **transparent background**
- **Monochromatic** — white (`#FFFFFF`) as the primary stroke and fill color
- No colored styling, gradients, or solid backgrounds

Our existing `qk-{widget-name}.svg` icons are compliant as long as they meet the monochromatic/white/transparent requirements.

### Marketplace Listing Assets

Required at package root for Marketplace submission (not needed for local install):

| File | Size | Purpose |
|------|------|---------|
| `/icon.png` | 256×256 px | Marketplace store icon |
| `/icon@2x.png` | 512×512 px | High-DPI store icon |

All rasterized images must include a `@2x` variant at exactly double the dimensions.

The **preview image** (`x-icue-widget-preview` meta tag) should show the widget in its normal content state at a **128×56 aspect ratio**. Do not show loading, empty, or error states. (Note: this tag exists in the API but doesn't appear to be used in the iCUE picker — it is used on the Marketplace listing page.)

### Localization

`tr()` is **required** by the Marketplace for:
- All `data-label` attributes on meta properties
- The widget `<title>` tag

Every `tr()` key must have a corresponding entry in `translation.json`. Multi-language support is not required but is strongly recommended.

### Accessibility

- Minimum contrast ratio: **4.5:1** for normal text, **3:1** for large text (24px+ or 19px+ bold) and non-text UI elements.
- This applies to all color combinations the widget can produce, including user-chosen personalization colors. If a user picks a low-contrast combination, the widget should still be legible (e.g., enforce a minimum contrast floor or adjust automatically).
- **Recommended:** respect `prefers-reduced-motion` — disable or simplify animations when set.
- **Required:** no flashing content more than **3 times per second** (photosensitivity risk).
- Minimum readable font size: ~12px on any supported display size.
- Do not rely on color alone to convey information — pair color with an icon, label, or other indicator.

### Safe Area Margins

Keep meaningful content away from screen edges to prevent clipping on physical hardware:
- Predominantly horizontal layouts (HS/HL/HXL): at least 5% horizontal, 10% vertical margin
- Predominantly vertical layouts (VL/VXL): at least 10% margin on all sides
- Compact/balanced layouts (HM/VM/VS): at least 12% margin on all sides

### Visual States

Every widget must handle all states deliberately:
- **Loading**: show a visual indicator — a blank screen looks broken.
- **Empty / no data**: explain why in plain language (e.g., "Select a sensor in widget settings"), not a blank screen or raw "null".
- **Error**: communicate the problem honestly and suggest what to do (e.g., "Unable to reach weather service — check your internet connection"), not "Error 503" or a stack trace.

### Settings Panel Rules

- **No "Save" button** — settings save automatically in iCUE.
- **No donation, sponsor, or fundraising links** in the settings UI — use the Marketplace listing's "Additional Links" section.
- **No copyright notices or changelogs** in the settings panel — use the listing description.
- Setting names should be concise and self-explanatory, ~30 characters or less.
- Appearance controls (textColor, accentColor, backgroundColor, transparency) must be the **last group** in the settings panel.

### Performance

- Cap update frequency to no more than **10 requests per second** for external APIs.
- No unbounded update loops. Debounce and throttle repeated triggers.
- Cache API responses and avoid redundant fetches.
- For widgets connecting to external services, make the refresh rate configurable with a sensible default.

### Manifest IDs

Once a widget is published to the Marketplace, its `id` field in `manifest.json` must never change — it is the permanent identifier used for updates. Plan IDs in reverse-domain format: `com.quadrakev.{widgetname}`.

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
