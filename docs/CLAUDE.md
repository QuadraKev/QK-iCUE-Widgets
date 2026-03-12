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
- **IMPORTANT: iCUE preview renders at scaled-down resolution but preserves aspect ratio.** Never use `min-height`/`max-height` breakpoints - use only `min-aspect-ratio`/`max-aspect-ratio` so the preview layout matches the actual layout.
- Key aspect ratios: HS (2.44), HL (2.43), HXL (3.64), VS (1.67), HM (1.21), VM (0.83), VL (0.41), VXL (0.27)

### Pump LCD (pump_lcd)
- 480x480 pixels, 1:1, 2.1" display, 323.25 PPI
- No touchscreen: widgets must be non-interactive or auto-cycling
- Design within a circle: content outside ~85% radius may be clipped
- Restriction value: `pump_lcd`

## Project Structure

```
QK-iCUE-Widgets/
  widgets/          All widgets in flat layout (one folder each)
  docs/             Widget API docs, design guidelines, shared assets
  tools/            Build and screenshot scripts
  .github/          CI workflows
  widgets.csv       Widget inventory, versions, and release status
  install.bat       Copies all widgets into iCUE's widget directory
```

**IMPORTANT:** Do NOT create new widgets without explicit user approval. Focus on reviewing and fixing existing widgets.

Each widget follows this structure:
```
widgets/qk-{widget-name}/
  QK{WidgetName}.html              # main widget file (single self-contained HTML)
  QK{WidgetName}_translation.json  # i18n strings
  images/
    qk-{widget-name}.svg           # widget icon for iCUE picker
  README.md                        # documentation
  resources/                       # preview images (optional)
```

Device compatibility is tracked in `widgets.csv` and encoded in each widget's HTML via `x-icue-restriction` meta tags.

## Widget Inventory

### Xeneon Edge (10 widgets)
| Widget | Folder | Interactive | Description |
|--------|--------|-------------|-------------|
| 2048 | qk-2048 | Yes | Sliding puzzle game |
| Calculator | qk-calculator | Yes | Touchscreen calculator |
| Dice Roller | qk-dice-roller | Yes | Polyhedral dice with 3D wireframe backdrop, history |
| Fidget Spinner | qk-fidget-spinner | Yes | Swipe-to-spin fidget spinner with RPM display |
| Magic 8 Ball | qk-magic-8-ball | Yes | Tap-to-shake fortune ball |
| Paint | qk-paint | Yes | Drawing canvas |
| Simon | qk-simon | Yes | Simon Says memory game |
| Tally Counter | qk-tally-counter | Yes | Tap counter |
| World Clocks | qk-world-clocks | No | Multi-timezone clock display |
| XE Visualizer | qk-xe-visualizer | No | Audio visualizer bars |

### Pump LCD (1 widget)
| Widget | Folder | Description |
|--------|--------|-------------|
| Pump Visualizer | qk-pump-visualizer | Audio visualizer |

### Both Devices (6 widgets)
| Widget | Folder | Description |
|--------|--------|-------------|
| Binary Clock | qk-binary-clock | Time in binary |
| Day Progress | qk-day-progress | Day completion percentage |
| Game of Life | qk-game-of-life | Conway's Game of Life |
| Matrix Rain | qk-matrix-rain | Matrix digital rain effect |
| Moon Phase | qk-moon-phase | Current moon phase display |
| Starfield | qk-starfield | Animated star field |

## iCUE Widget Technical Notes

### Widget API Essentials
- Properties defined via `<meta name="x-icue-property">` tags
- Groups defined via `<script type="application/json" id="x-icue-groups">`
- Lifecycle: `icueEvents = { onICUEInitialized: fn, onDataUpdated: fn }` (bare assignment, no `var`)
- Properties become global variables (e.g., `data-default="'#FFD700'"` -> `accentColor = '#FFD700'`)
- Translation: `tr('string key')` returns a Promise
- Interactive widgets need `<meta name="x-icue-interactive">`
- **NEVER use `'use strict'`**: iCUE injects property values via `eval(backend.data)` which assigns bare globals. Strict mode breaks this mechanism in Qt WebEngine, causing properties to not be injected, settings to not apply, and interactive widgets to become unresponsive.
- **NEVER use `var icueEvents` or `var iCUE_initialized`**: Use bare assignment (`icueEvents = {...}`) so iCUE's bootstrap can find the object. Declaring `iCUE_initialized` with `var` overwrites the flag set by iCUE's bootstrap.
- **Prefer `tab-buttons` over `combobox`** for any setting with a small set of options (2-5 choices). Tab-buttons always display the selected option visually, avoiding blank-state issues.
- **Combobox `data-values` MUST use `key/value` format**, not `title/value`. The official iCUE widgets all use `[{'key':'Foo','value':tr('Foo')}, ...]` for combobox. Using `title/value` format (e.g., `[{'title':'S','value':'small'}]`) causes the dropdown to appear blank on load and may fail to pass values correctly. Reserve combobox for large option lists (e.g., timezone pickers) where tab-buttons would be impractical.
- Fonts: iCUE bundles OpenSans-SemiBold.ttf and BebasNeuePro-SemiExpBold.otf via `url('qrc:/fonts/...')`, but QK widgets use **Jost** (variable font, weights 100-900) embedded as base64 woff2 in each HTML file. This adds ~35KB per widget but keeps files self-contained with no network dependency. The base64 font data is in `docs/jost-woff2-base64.txt`. To embed: use `@font-face` with `src: url(data:font/woff2;base64,...) format('woff2')` and `font-weight: 100 900`.
- The `x-icue-widget-preview` meta tag exists in the API but the preview image does not appear to be used anywhere in iCUE. No need to create preview images for the widget picker.

### Required Settings Pattern (Xeneon Edge widgets)

Every Xeneon Edge widget (including "both" widgets) MUST have an Appearance property group with the four standard DP-mapped properties.

**IMPORTANT: iCUE rejects groups with empty `"properties": []` arrays and unknown property types (e.g., `hidden`).** A group must contain at least one property with a valid type. The widget will not appear in iCUE at all if either condition is violated.

**Group 1: Widget Name** (required)
- Houses the Size selector (S/M/L/XL) which iCUE provides natively as the first group
- MUST contain `customTitle` (textfield, default `''`) as the LAST property: when non-empty, displays the user's text centered at the top of the widget (useful for labeling, screenshots, and showcases)
- May contain additional widget-specific settings (e.g., grid size, timer options) before `customTitle`
- The `customTitle` property ensures Group 1 always has at least one property, which is required for iCUE to enable the Custom Style toggle on Group 2

**Group 2: Appearance**
- MUST contain the four standard DP-mapped properties in this order:
  - textColor (color): main text color
  - accentColor (color): highlights and accents
  - backgroundColor (color): widget background
  - transparency (slider 0-100): background transparency
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

## Naming Conventions
- All widget names prefixed with "QK" (QuadraKev)
- Folder names: `qk-{kebab-case}`
- HTML files: `QK{PascalCase}.html`
- Translation files: `QK{PascalCase}_translation.json`
- SVG icons: `qk-{kebab-case}.svg`

## Installation
Widgets are installed by copying files to iCUE's widgets directory:
`C:\Program Files\Corsair\Corsair iCUE5 Software\widgets`
- HTML and translation JSON go in `widgets/`
- SVG icons go in `widgets/images/`
- **iCUE must be restarted** for new widgets to appear in the widget picker

### Releases
- Releases are built via `tools/build-release.sh` and automated with GitHub Actions on tag push
- `widgets.csv` gates which widgets are included: only rows with `Release Ready` = `Y` are packaged
- ZIP naming convention: `qk-{widget-name}-v{version}.zip`
- An all-widgets bundle (`all-widgets-v{date}.zip`) is also produced
- Install link: `[Releases](https://github.com/QuadraKev/QK-iCUE-Widgets/releases)`
