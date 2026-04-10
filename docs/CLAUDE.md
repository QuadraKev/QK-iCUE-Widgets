# iCUE Widgets Project - Claude Code Reference

## Overview

This repo contains custom iCUE widgets for Corsair LCD displays, built for iCUE's native widget system (Qt WebEngine / Chromium 130). All widgets are self-contained single-HTML-file applications with no external dependencies.

Key documentation:
- `docs/iCUE-Widget-System-Documentation.md`: comprehensive reference for the widget API (meta tags, properties, events, translation, fonts)
- `docs/Touchscreen_Design_Guidelines.md`: touch target sizing and UI design principles

## Target Devices

### Xeneon Edge (dashboard_lcd)
- 2560x720 pixels, 32:9, 14.5" display, 183.40 PPI
- Capacitive touchscreen: interactive widgets are possible
- Restriction value: `dashboard_lcd`

#### Slot Sizes (Horizontal Orientation)
| Slot | Resolution | Aspect Ratio | Notes |
|------|-----------|-------------|-------|
| HS   | 840x344   | ~2.44:1     | Short strip, limited vertical space |
| HM   | 840x696   | ~1.21:1     | Nearly square, most balanced layout |
| HL   | 1688x696  | ~2.43:1     | Wide, full height |
| HXL  | 2536x696  | ~3.64:1     | Near-full width |

#### Slot Sizes (Vertical Orientation)
| Slot | Resolution | Aspect Ratio |
|------|-----------|-------------|
| VS   | 696x416   | ~1.67:1     |
| VM   | 696x840   | ~0.83:1     |
| VL   | 696x1688  | ~0.41:1     |
| VXL  | 696x2536  | ~0.27:1     |

#### Responsive Breakpoints (common pattern)
- Wide (HS/HL/HXL): `@media (min-aspect-ratio: 200/100)` (aspect >= 2.0)
- HM: `@media (max-aspect-ratio: 150/100) and (min-aspect-ratio: 90/100)` (square-ish, ~1.2:1)
- Portrait (VM/VL/VXL): `@media (max-aspect-ratio: 90/100)` (all vertical orientations)
- Very tall (VL/VXL): `@media (max-aspect-ratio: 50/100)` (refinement of portrait)
- VS (1.67:1) typically falls between wide and HM; handle via default or dedicated query

#### Layout Naming Convention
- **H** prefix = horizontal orientation, **V** prefix = vertical orientation
- **S/M/L/XL** without H or V prefix refers to both horizontal and vertical layouts of that size
- Examples: "HS" = horizontal small, "VL" = vertical large, "M" = both HM and VM

#### Key Design Rules
- Touch targets: minimum 44x44px (2.42mm at 183.40 PPI per Touchscreen_Design_Guidelines.md)
- Use viewport units (vh, vw, vmin) for all sizing; never px or rem for layout elements
- S slot is half the height of M/L/XL (344 vs 696): double vh values in S to match physical sizes
- **IMPORTANT: iCUE preview renders at scaled-down resolution but preserves aspect ratio.** Previews scale by ~2.66x to ~8.0x depending on zoom level. Never use `min-height`/`max-height` breakpoints - use only `min-aspect-ratio`/`max-aspect-ratio` so the preview layout matches the actual layout. See `docs/QK-widget-design-guidelines.md` for full preview size tables.
- Actual viewports are 1px larger than documented slot sizes in each dimension (e.g., HS is 841x345, not 840x344). Aspect ratios are unaffected.
- Key aspect ratios: HS (2.44), HL (2.43), HXL (3.64), VS (1.67), HM (1.21), VM (0.83), VL (0.41), VXL (0.27)
- **ALWAYS add `-webkit-tap-highlight-color: transparent;` to the body CSS.** Without this, iCUE's Chromium engine shows a dark overlay flash on tap/click interactions.

### Keyboard LCD (keyboard_lcd)
- 320x170 px display, 1.9" LCD (sidebars consume 72px horizontally)
- Widget viewport: 248x170 px, ~1.46:1 aspect ratio
- Framerate: 2-4 FPS (animated widgets impractical)
- No touchscreen
- Restriction value: `keyboard_lcd` (official spec; older iCUE versions may have used `keyboard`)
- Used by: Corsair VANGUARD series keyboards

### Pump LCD (pump_lcd)
- 480x480 pixels, 1:1, 2.1" display, 323.25 PPI
- No touchscreen: widgets must be non-interactive or auto-cycling
- Design within a circle: content outside ~85% radius may be clipped
- Restriction value: `pump_lcd`

## Project Structure

```
QK-iCUE-Widgets/
  widgets/          All widgets (one QK{PascalCase} folder each)
  docs/             Widget API docs, design guidelines, shared assets
  tools/            Build and screenshot scripts
  .github/          CI workflows
  widgets.csv       Widget inventory, versions, and release status
  install.bat       Copies all widgets into iCUE's widget directory
```

**IMPORTANT:** Do NOT create new widgets without explicit user approval. Focus on reviewing and fixing existing widgets.

Each widget follows this structure:
```
widgets/QK{WidgetName}/
  index.html                       # main widget file (single self-contained HTML)
  translation.json                 # i18n strings
  resources/
    qk-{widget-name}.svg           # widget icon for iCUE picker
  README.md                        # documentation
```

Device compatibility is tracked in `widgets.csv` and encoded in each widget's HTML via `x-icue-restriction` meta tags.

## Widget Inventory

### Xeneon Edge (10 widgets)
| Widget | Folder | Interactive | Description |
|--------|--------|-------------|-------------|
| 2048 | QK2048 | Yes | Sliding puzzle game |
| Calculator | QKCalculator | Yes | Touchscreen calculator |
| Dice Roller | QKDiceRoller | Yes | Polyhedral dice with 3D wireframe backdrop, history |
| Fidget Spinner | QKFidgetSpinner | Yes | Swipe-to-spin fidget spinner with RPM display |
| Magic 8 Ball | QKMagic8Ball | Yes | Tap-to-shake fortune ball |
| Paint | QKPaint | Yes | Drawing canvas |
| Simon | QKSimon | Yes | Simon Says memory game |
| Tally Counter | QKTallyCounter | Yes | Tap counter |
| World Clocks | QKWorldClocks | No | Multi-timezone clock display |
| XE Visualizer | QKXEVisualizer | No | Audio visualizer bars |

### Pump LCD (1 widget)
| Widget | Folder | Description |
|--------|--------|-------------|
| Pump Visualizer | QKPumpVisualizer | Audio visualizer |

### Both Devices (6 widgets)
| Widget | Folder | Description |
|--------|--------|-------------|
| Binary Clock | QKBinaryClock | Time in binary |
| Day Progress | QKDayProgress | Day completion percentage |
| Game of Life | QKGameOfLife | Conway's Game of Life |
| Matrix Rain | QKMatrixRain | Matrix digital rain effect |
| Moon Phase | QKMoonPhase | Current moon phase display |
| Starfield | QKStarfield | Animated star field |

## iCUE Widget Technical Notes

### Widget API Essentials
- Properties defined via `<meta name="x-icue-property">` tags. The `content` attribute (property variable name) must use **Latin letters and digits only** — no underscores, hyphens, or special characters.
- Groups defined via `<script type="application/json" id="x-icue-groups">`
- Lifecycle: `icueEvents = { onICUEInitialized: fn, onDataUpdated: fn }` (bare assignment, no `var`)
- Properties become global variables (e.g., `data-default="'#FFD700'"` -> `accentColor = '#FFD700'`)
- Translation: `tr('string key')` returns a Promise
- Interactive widgets need BOTH `<meta name="x-icue-interactive">` in the HTML AND `"interactive": true` in `manifest.json`. The manifest field is the canonical source per the official spec.
- **NEVER use `'use strict'`**: iCUE injects property values via `eval(backend.data)` which assigns bare globals. Strict mode breaks this mechanism in Qt WebEngine, causing properties to not be injected, settings to not apply, and interactive widgets to become unresponsive.
- **NEVER use `var icueEvents` or `var iCUE_initialized`**: Use bare assignment (`icueEvents = {...}`) so iCUE's bootstrap can find the object. Declaring `iCUE_initialized` with `var` overwrites the flag set by iCUE's bootstrap.
- **Prefer `tab-buttons` over `combobox`** for any setting with a small set of options (2-5 choices). Tab-buttons always display the selected option visually, avoiding blank-state issues.
- **Combobox `data-values` MUST use `key/value` format**, not `title/value`. Only `key/value` (`[{'key':'Foo','value':tr('Foo')}, ...]`) and plain string arrays are documented formats. `title/value` is unsupported and results in a blank dropdown. Reserve combobox for large option lists (e.g., timezone pickers) where tab-buttons would be impractical.
- **Slider `data-step` is REQUIRED.** Always include `data-min`, `data-max`, and `data-step` together on every slider property. Missing `data-step` causes silent iCUE import validation failure — the widget will not appear in the picker.
- Fonts: **Jost is the QK project typeface** (a project convention for visual consistency — iCUE itself allows any locally packaged or system font). Do not use other fonts in QK widgets. Jost (variable, weights 100-900) is embedded as base64 woff2 in each HTML file (~35KB). Base64 data: `docs/jost-woff2-base64.txt`. Weight hierarchy: 700 for headings/numbers, 600 for body/labels, 400 for secondary text. See `docs/QK-widget-design-guidelines.md` for the full visual style guide.
- The `x-icue-widget-preview` meta tag is not used in the iCUE widget picker, but **is** used on the Marketplace listing page. Expected size: **128x56 pixels** (PNG preferred). Not needed for local install; required for Marketplace submissions.
- **NEVER call `getUserMedia()`**: it exists in the webview but hangs indefinitely — no permission dialog appears and the widget freezes. There is no system audio capture path from inside a widget.
- `navigator.mediaSession.metadata` is always `null` in the webview. Reading other apps' Now Playing info is not possible.
- **`iCUE.fpsLimit`** (default: 30) is a readable property for checking the current frame rate cap.
- **Interactive widget focus:** When the iCUE desktop app is open (not minimized to tray), touching a widget steals focus from the user's active application. When iCUE is in the system tray, this does not occur.
- **Device feature targeting:** The `supported_devices` array in `manifest.json` supports an optional `features` key (e.g., `"features": ["sensor-screen"]`) to restrict a widget to devices with specific capabilities beyond device type.
- **Module integration:** `.mjs` files declared in `manifest.json` under `"modules"` can export synchronous functions that are callable inside `data-default` and `data-values` expressions (e.g., `data-default="SystemUtils.getCurrentTimezone()"`). Only synchronous/blocking functions work in these expressions — async functions cannot be used.
- **`media-selector` codec support:** On Windows, AV1/VP8/VP9 video is supported. On macOS, video codecs are not supported — use images only for cross-platform media widgets.
- **Marketplace:** The iCUE Marketplace currently accepts Xeneon Edge (`dashboard_lcd`) widgets only. See `docs/WidgetBuilder-kit/Documentation/Marketplace_Guidelines.md` and `docs/QK-widget-design-guidelines.md#marketplace-compliance` for full requirements. Key constraints: all code must be human-readable (no obfuscation), no hardcoded API keys, `tr()` required on all `data-label` and `<title>`, 4.5:1 minimum text contrast, no flashing >3×/sec, max 10 API calls/sec.

### Required Settings Pattern (Xeneon Edge widgets)

Every Xeneon Edge widget (including "both" widgets) MUST have an Appearance property group with the four standard DP-mapped properties.

**IMPORTANT: iCUE rejects groups with empty `"properties": []` arrays and unknown property types (e.g., `hidden`).** A group must contain at least one property with a valid type. The widget will not appear in iCUE at all if either condition is violated.

**Group 1: Widget Name** (required)
- Houses the Size selector (S/M/L/XL) which iCUE provides natively as the first group
- MUST contain `customTitle` (textfield, default `''`) as the LAST property: when non-empty, displays the user's text centered at the top of the widget (useful for labeling, screenshots, and showcases)
- May contain additional widget-specific settings (e.g., grid size, timer options) before `customTitle`
- The `customTitle` property ensures Group 1 always has at least one property, which is required for iCUE to enable the Custom Style toggle on Group 2

**Group 2: Appearance** (the Custom Style toggle ONLY appears on the second settings group — this is why Appearance must be Group 2)
- MUST contain the four standard DP-mapped properties in this order:
  - textColor (color): main text color
  - accentColor (color): highlights and accents
  - backgroundColor (color): widget background
  - transparency (slider 0-100, default 100): background transparency. **Value semantics match iCUE convention: 100 = fully opaque, 0 = fully transparent.**
- When these four properties exist in a second group, iCUE automatically renders a "Custom Style" toggle
- When Custom Style is OFF, the widget inherits Device Personalization colors
- When Custom Style is ON, the user can override with per-widget values
- Widget-specific color properties (e.g., moonColor, xColor) go in this group alongside the standard four
- Canvas-only widgets without text (matrix-rain, starfield) may omit textColor

**Text styling rules:**
- NEVER use transparent or semi-transparent text. All text must be a solid, fully opaque color for readability.

**Transparency behavior by device:**
- **Xeneon Edge**: The Appearance -> Transparency setting ONLY affects the widget background color opacity. It must NOT affect text, canvas trails, or other visual elements.
- **Pump LCD**: Transparency has no effect since there is no background layer behind the pump LCD other than the widget's own background color. The setting exists for DP compatibility but is functionally inert.

Background transparency (XE) is applied via:
```css
background-color: color-mix(in srgb, var(--bg-color), transparent calc((1 - var(--widget-opacity)) * 100%));
```

The JS conversion from slider value to CSS variable:
```javascript
root.style.setProperty('--widget-opacity', cfg.transparency / 100);
```
This maps transparency=100 (default) to opacity 1.0 (fully opaque) and transparency=0 to opacity 0.0 (fully transparent), matching iCUE's built-in widget convention.

### Standalone Testing
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

### Screenshots

Render widgets at specific slot sizes using puppeteer:
```
node tools/screenshot.js <widget.html> [S|M|L|XL|VS|VM|VL|VXL|PUMP]
```

Inject JS to modify widget state before capture with `--eval`:
```
node tools/screenshot.js <widget.html> M --eval "cfg.diceMax=100; updateDiceShape();"
```

Use `--delay <ms>` to control the wait time after eval before capturing (default: 500ms).

## Naming Conventions
- All widget names prefixed with "QK" (QuadraKev)
- Folder names: `QK{PascalCase}`
- HTML files: `index.html`
- Translation files: `translation.json`
- SVG icons: `qk-{kebab-case}.svg` (in `resources/`)

## Installation
Widgets are installed by copying widget folders to iCUE's widgets directory:
`C:\Program Files\Corsair\Corsair iCUE5 Software\widgets`
- Each widget folder (e.g., `QKWeather/`) goes directly under `widgets/`
- **iCUE must be restarted** for new widgets to appear in the widget picker

### Releases
- Releases are built via `tools/build-release.sh` and automated with GitHub Actions on tag push
- `widgets.csv` gates which widgets are included: only rows with `Release Ready` = `Y` are packaged
- ZIP naming convention: `QK{PascalCase}.zip`
- An all-widgets bundle (`all-widgets-v{date}.zip`) is also produced
- Install link: `[Releases](https://github.com/QuadraKev/QK-iCUE-Widgets/releases)`

### Versioning

**Widget version (x.y.z in widgets.csv):**
- **x (major)**: Breaking changes (removed settings, changed behavior that would surprise existing users)
- **y (minor)**: New features or visible changes (new settings, layout improvements, UI changes)
- **z (patch)**: Bug fixes, performance tweaks, code cleanup with no visible change

**Release tags:**
- Date-based: `v2026.03`, `v2026.03.1` (multiple releases in same month)
- A release packages ALL release-ready widgets at their current versions
- Multiple widget updates can ship in a single release

### Update Workflow
1. Make changes and commit to main (as many commits as needed)
2. Bump the version in `widgets.csv` for each changed widget
3. Add an entry to `CHANGELOG.md` with per-widget patch notes
4. Push a tag (e.g., `v2026.03.1`) to trigger CI and publish the release
