# iCUE Widget System Documentation

This document describes how native widgets work on CORSAIR iCUE-compatible LCD displays, based on analysis of the official iCUE widgets shipped with iCUE in the `widgets/` directory.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
   - [WebEngine Environment](#11-webengine-environment)
2. [Native Widget System](#2-native-widget-system)
   - [File Structure](#21-file-structure)
   - [Meta Tag API](#22-meta-tag-api)
   - [Property System](#23-property-system)
   - [Lifecycle & Events](#24-lifecycle--events)
   - [The iCUE API Object](#25-the-icue-api-object)
   - [Translation System](#26-translation-system)
   - [Shared Tools & Libraries](#27-shared-tools--libraries)
3. [Target Devices & Responsive Design](#3-target-devices--responsive-design)
4. [Font System](#4-font-system)
5. [Design Conventions](#5-design-conventions)
6. [Creating a New Widget](#6-creating-a-new-widget)
   - [Companion Server Pattern](#companion-server-pattern)

---

## 1. Architecture Overview

iCUE renders widgets in an **embedded Chromium-based web view** (Qt WebEngine). Each widget is a standalone HTML page bundled with iCUE in the `widgets/` directory, with full access to the iCUE JavaScript API (`iCUE` object, `icueEvents`, meta tags), settings UI generated from `<meta>` tags, automatic property persistence, translation support via `tr()` + JSON files, and device targeting via `x-icue-restrictions`.

### 1.1 WebEngine Environment

The following details were confirmed via the API Probe widget running inside iCUE.

**Engine:** Chromium 130 / QtWebEngine 6.9.3 (identified from User Agent string).

**Communication:** Qt WebChannel with two bridged objects:
- `backend` — the widget controller (one per widget instance)
- `iCUE` — the global iCUE API object

**Bootstrap sequence:** iCUE injects `backend.dataScript` into the webview. This script:
1. Creates a `QWebChannel` over `qt.webChannelTransport`
2. Retrieves the `backend` and `iCUE` channel objects
3. Connects `backend.dataChanged` signal to an internal `applyData()` function
4. `applyData()` evaluates `backend.data` to inject property values as global variables, then calls `icueEvents.onDataUpdated()`

**`backend` properties (enumerated):**
| Property | Type | Description |
|----------|------|-------------|
| `addPlugin` | function | Register a plugin object at runtime (`addPlugin(QObject*)`) |
| `data` | string | JavaScript snippet that sets property globals when eval'd |
| `dataChanged` | signal | Fires when any widget property changes |
| `dataScript` | string | Bootstrap JS injected by iCUE on load |
| `fpsLimit` | number | Target FPS cap (default: 10) |
| `fpsLimitChanged` | signal | Fires when FPS limit changes |
| `htmlSourceChanged` | signal | Fires when widget HTML source changes |
| `iCUEGlobalObject` | object | Reference to the global iCUE API object |
| `initialized` | signal | Fires when widget initialization completes |
| `isInitialized` | function | Returns `Promise<boolean>` for current init state |
| `localStoragePath` | string | Filesystem path for widget localStorage (`AppData/Roaming/Corsair/CUE5/html_widgets_browser_storage`) |
| `notifyInitialized` | function | Manually signal initialization complete |
| `providers` | array | List of registered data providers (empty by default) |
| `providersChanged` | signal | Fires when providers list changes |
| `requiredPlugins` | array | List of required plugin identifiers (empty by default) |
| `requiredPluginsChanged` | signal | Fires when required plugins change |
| `requestUpdate` | function | Triggers `onUpdateRequested` callback |
| `tick` | number | Current tick offset value |
| `tickChanged` | signal | Fires on frame tick |
| `tr` | function | Translation function (`tr(QString)`) |
| `url` | string | Widget HTML file URL |
| `urlChanged` | signal | Fires when widget URL changes |
| `widgetId` | string | Widget instance identifier (e.g., `"QKWeather.html"`) |
| `widgetIdChanged` | signal | Fires when widget ID changes |
| `webChannelId` | string | WebChannel object identifier (always `"backend"`) |
| `webChannelIdChanged` | signal | Fires when WebChannel ID changes |

**Available Web APIs:**
- Web Audio API — `AudioContext` (48000 Hz sample rate) and `createAnalyser()` are available, but blocked by Chromium's autoplay policy until a user gesture occurs (click/touch). Once activated, audio nodes work normally. However, there is no way to capture system audio — Web Audio can only process audio from `<audio>`/`<video>` elements or `getUserMedia` streams.
- WebSocket — fully functional, can connect to `ws://localhost:*`. **This is the most reliable channel for communicating with external companion processes.** Binary data (such as album art images) can be delivered as base64-encoded data URLs within JSON WebSocket messages.
- `fetch` — works for `http://localhost:*` requests (with CORS headers from the server)
- `navigator.clipboard` — `writeText()` works
- WebGPU — `GPUBufferUsage`, `GPUTextureUsage`, `GPUShaderStage`, `GPUMapMode`, `GPUColorWrite` are all present (Chrome 130 includes WebGPU support)
- WebAssembly — `WebAssembly.compile`, `WebAssembly.instantiate`, `WebAssembly.compileStreaming`, `WebAssembly.instantiateStreaming` all available
- Web SQL — `openDatabase` is available (deprecated but functional in this Chromium build)
- `Intl` — full internationalization API available

**Mixed content restriction:**
Qt WebEngine treats the widget origin (`qrc://` or local file path) as a secure context. Attempting to load HTTP resources via HTML elements — such as `<img src="http://localhost:PORT/image">`, `<link href="http://localhost:...">`, or `<script src="http://localhost:...">` — is **blocked silently** by the mixed content policy. The element's `onerror` handler fires with no useful error detail.

`fetch()` to `http://localhost:*` may work in JavaScript, but resource loading from HTML attributes does not. If you need to display images from a local server, the reliable approach is to send the image data as a base64 data URL through a WebSocket message and set it on the `<img>` element's `src` attribute directly:

```javascript
// Companion server sends: {"type":"art","artUrl":"data:image/jpeg;base64,..."}
ws.onmessage = function(ev) {
    var msg = JSON.parse(ev.data);
    if (msg.type === 'art' && msg.artUrl) {
        document.getElementById('art-img').src = msg.artUrl; // data URL works
    }
};
```

**Unavailable APIs:**
- `getUserMedia` — the function exists but calling it **hangs indefinitely** (no permission dialog is shown in the embedded webview). Do NOT call this; it will freeze the widget.
- Media Session API — `navigator.mediaSession` exists but `metadata` is always `null`. The webview can only see its own media session, not other applications' sessions. Reading other apps' "Now Playing" info is not possible from inside the webview.
- No system audio capture — there is no API path from the webview to system audio output. The only way to get system audio data is via an external companion process.

**Native widget types not using HTML:**
The following built-in iCUE widgets are **QML components**, not HTML. They are rendered by `DashAccessoryLCDCueQmlPlugin.dll` and access native C++/QML models (e.g., `systemMediaModel`) that are not bridged to the WebChannel:
- Media (music player)
- Keyboard (key visualizer)
- SensorChart
- TwoSensors

Only `WidgetBuilderWidgetAttachment` uses the HTML/WebEngine path.

**Widget install path:** `C:\Program Files\Corsair\Corsair iCUE5 Software\widgets\`

**QML plugins:** 61 QML plugin DLLs loaded from `cue_qml_plugins/` at runtime.

---

## 2. Native Widget System

### 2.1 File Structure

Each native widget lives in its own folder:

```
widgets/
├── MyWidget/                      # Per-widget folder
│   ├── index.html                 # Main widget file
│   ├── translation.json           # i18n strings (12+ locales)
│   ├── styles/                    # Widget-specific stylesheets (optional)
│   │   └── MyWidget.css
│   ├── resources/                 # Widget icon and assets
│   │   └── my-widget.svg          # Widget picker icon (16x16 SVG)
│   ├── modules/                   # ES modules for property data sources (optional)
│   │   └── OpenMeteo.mjs
│   └── 3rdparty/                  # Third-party libraries (optional)
│       └── flipdown/
├── common/                        # Shared utilities for all widgets
│   ├── tools/
│   │   ├── ColorTools.js
│   │   ├── DateFormatter.js
│   │   ├── media_viewer/
│   │   ├── ticker-track.css
│   │   └── ticker-tracker.js
│   └── plugins/
│       ├── IcueWidgetApiWrapper.js
│       ├── SimpleMediaApiWrapper.js
│       └── SimpleSensorApiWrapper.js
└── images/                        # Shared SVG icons for iCUE picker
```

Each widget references shared tools via relative paths (e.g., `../common/tools/ColorTools.js`). There is **no build system** — no bundler, no transpiler, no `package.json`. Files are served directly by iCUE's embedded web view.

Widgets must include `<meta name="x-icue-framework-version" content="1.0.1">` in their `<head>`.

### 2.2 Meta Tag API

All widget configuration is declared via `<meta>` tags in the `<head>`. iCUE parses these at load time to determine the widget's identity, capabilities, and user-configurable properties.

#### Widget Identity

```html
<title>tr('My Widget')</title>
<link rel="icon" type="image/svg+xml" href="resources/my-widget-icon.svg">
<meta name="x-icue-widget-preview" content="resources/MyWidgetPreview.png">
```

| Meta Tag | Purpose |
|----------|---------|
| `<title>` | Widget display name shown in the iCUE widget picker. **Must use the `tr('...')` wrapper** — a bare string title is not recognized by iCUE. The string key is also used as the translation lookup; if no translation exists for a given locale, the key itself is displayed. This makes `tr()` safe for brand names (e.g., `tr('QK Visualizer')`) without needing translation entries. |
| `<link rel="icon">` | Widget picker icon. Path is relative to `index.html`; icons live in the widget's own `resources/` directory. See §6 for icon design guidelines. |
| `x-icue-widget-preview` | Path to preview thumbnail image |

> **Omit `x-icue-widget-group`** — this meta tag overrides the widget's display name with a category label (e.g., "Entertainment"), causing iCUE to show the group name instead of the title. It is not needed for correct operation.

#### Device Restrictions

```html
<meta name="x-icue-restrictions"
  data-restrictions='[
    {"device":"pump_lcd"},
    {"device":"keyboard"},
    {"device":"dashboard_lcd"}
  ]'>
```

Known device types:
- `pump_lcd` — AIO liquid cooler pump screen (square, ~1:1)
- `keyboard` — keyboard LCD (248x170 widget viewport, ~1.46:1 aspect ratio)
- `dashboard_lcd` — Xeneon Edge or similar dashboard display (various sizes)

Optional `features` sub-key for advanced targeting:
```json
{"device":"dashboard_lcd","features":["sensor-screen"]}
```

#### Interactive Flag

```html
<meta name="x-icue-interactive">
```

Signals that the widget accepts user input (clicks, touch). Required for widgets with buttons or interactive elements like stopwatches, calendars, coin flips.

**Known limitation:** When the iCUE desktop application is open (not minimized to system tray), interacting with a touchscreen widget on the Xeneon Edge will give focus to the iCUE window, pulling it away from whatever application the user was previously focused on. When iCUE is minimized to the tray, this does not occur — widgets render in an overlay that does not steal focus. This is an iCUE application behavior, not a widget issue, and cannot be worked around at the widget level. Keep this in mind when designing interactive widgets (e.g., virtual keyboards) that are intended to be used alongside other applications.

#### Module Declaration

```html
<meta name="x-icue-module" content="modules/OpenMeteo.mjs">
```

Tells iCUE to load an ES module and make its exports available for use in property `data-values` and `data-default` expressions. The module name (minus path/extension) becomes the namespace.

### 2.3 Property System

Properties are user-configurable settings. Each property is declared as a `<meta>` tag and iCUE automatically generates the corresponding UI control.

#### Property Declaration

```html
<meta
  name="x-icue-property"
  content="textColor"
  data-label="tr('Text Color')"
  data-type="color"
  data-default="'#FFFFFF'"
>
```

| Attribute | Purpose |
|-----------|---------|
| `content` | JavaScript variable name injected into widget scope |
| `data-label` | UI label (use `tr()` for translation) |
| `data-type` | Control type (see below) |
| `data-default` | Default value expression (evaluated by iCUE) |
| `data-min` | Minimum value (for `slider`) |
| `data-max` | Maximum value (for `slider`) |
| `data-step` | Step increment (for `slider`) |
| `data-values` | Options list or function reference (for `combobox`, `search-combobox`) |
| `data-placeholder` | Placeholder text (for `textfield`, `search-combobox`) |
| `unit-label` | Unit suffix displayed next to slider value. **Buggy in iCUE 5.x**: using `unit-label="%"` causes the value to display as `X{}` instead of `X%`. Avoid using this attribute. |

#### Property Control Types

| Type | Description | Example Use |
|------|-------------|-------------|
| `color` | Color picker | Text color, background color, accent color |
| `slider` | Numeric slider with min/max/step | Transparency (0-100), animation speed |
| `switch` | Boolean toggle | Show/hide seconds, enable glare |
| `textfield` | Free text input | Custom brand text, ticker text |
| `combobox` | Dropdown list (see warning below) | Timezone picker (large lists only) |
| `tab-buttons` | Segmented button group (see format below) | 12h / 24h toggle, cell size S/M/L |
| `search-combobox` | Searchable dropdown with async data | Location search (calls module function as user types) |
| `sensors-combobox` | Hardware sensor picker (iCUE-populated) | CPU temp, fan speed, etc. |

#### iCUE Data Source Types

These property types are not UI controls. They are iCUE-provided data sources that inject object globals with live data from the system.

| Type | Description | Global Shape |
|------|-------------|--------------|
| `media-session` | Current media playback info from OS | `{ songName, artist }` (confirmed: only these two fields) |
| `media-selector` | User-chosen background image/video | `{ pathToAsset, baseWidth, baseHeight, scale, positionX, positionY, angle }` |

**`media-session`**: Exposes the currently playing media from the operating system. iCUE reads Windows media transport controls and injects the data as a global object via the backend property system (separate from the browser's `navigator.mediaSession` API, which shows no data in iCUE's webview). The object contains only `songName` and `artist` - no album, playback state, duration, progress, or album art. The property does not render any UI in the settings panel. Used by the official Media widget (keyboard only by default).

```html
<meta name="x-icue-property" content="mediaSession" data-type="media-session">
```
```javascript
// In onDataUpdated:
if (typeof mediaSession !== 'undefined' && mediaSession) {
    var title = mediaSession.songName;  // e.g. "Never Gonna Give You Up"
    var artist = mediaSession.artist;   // e.g. "Rick Astley"
}
```

**`media-selector`**: Renders an image/video picker in the settings panel. The user can choose a file and adjust position, scale, and rotation. The global is an object with asset path and transform properties. Used by most official widgets for custom backgrounds. Requires `common/tools/media_viewer/MediaViewer.js` and `MediaViewer.css` from the iCUE installation to render the media.

```html
<meta name="x-icue-property" content="backgroundMedia"
    data-label="tr('Image')" data-type="media-selector"
    data-filters="['*.webm', '*.mp4', '*.mkv', '*.gif', '*.png', '*.jpg', '*.jpeg', '*.bmp', '*.ico']">
```

#### Combobox Pitfalls

**Prefer `tab-buttons` over `combobox`** for small option sets (2-5 choices). Tab-buttons always display the selected option visually.

**If you must use `combobox`** (e.g., for large lists like timezone pickers), use the `key/value` format for `data-values`, NOT `title/value`. The official iCUE widgets all use `key/value` for combobox:
```html
data-values="[{'key':'None','value':tr('None')},{'key':'System','value':tr('System')}]"
data-default="'None'"
```
Using the `title/value` format (e.g., `[{'title':'S','value':'small'}]`) causes the dropdown to appear blank on load and may fail to pass property values to the widget.

#### Tab-Buttons `data-values` Format

The `tab-buttons` type accepts `data-values` in three formats. The `data-default` value must match the `key` (format 1), the `value` (format 2), or the string (format 3).

**Format 1 — key/value objects with `tr()` (recommended for translatable options):**
```html
data-values="[{'key':'12h','value':tr('12h')},{'key':'24h','value':tr('24h')}]"
data-default="'12h'"
```
- `key` = the property value (injected as the JavaScript global)
- `value` = the display text (`tr()` called as a **bare function expression**, not inside quotes)
- Used by: DigitalClock, Weather, Calendar

**Format 2 — title/value objects (no translation):**
```html
data-values="[{'title':'°C','value':'C'},{'title':'°F','value':'F'}]"
data-default="'C'"
```
- `title` = display text (plain string)
- `value` = the property value
- Used by: SystemPulse

**Format 3 — simple string array:**
```html
data-values="['°C','°F']"
data-default="'°F'"
```
- The string is both the display text and the property value
- Used by: Weather (temperature units)

**Important:** Do NOT wrap `tr()` inside string quotes (e.g., `'tr(\'Bars\')'`). This produces a literal string `"tr('Bars')"` instead of calling the translation function, and may cause property registration to fail.

#### Property Groups

Properties are organized into collapsible groups via a JSON block:

```html
<script type="application/json" id="x-icue-groups">
[
  {
    "title": "tr('Clock')",
    "properties": ["timeFormat", "seconds", "timeZone", "text", "dateText"]
  },
  {
    "title": "tr('Clock Personalization')",
    "properties": ["textColor", "backgroundColor", "transparency"],
    "info": "Powered by Open-Meteo"
  }
]
</script>
```

The optional `"info"` key renders attribution or help text below the group.

**Critical:** Group titles **must** use the `tr()` wrapper — bare strings are not recognized by iCUE. The **first group's title** is used as the widget's display name in the settings panel.

#### Settings Layout Conventions

Official widgets follow a consistent two-group pattern:

**Group 1 — Widget-specific settings (named after the widget)**
Contains all functional settings: sensor selection, display toggles, speed controls, format choices, and any widget-specific color properties that do **not** have a Device Personalization equivalent.

**Group 2 — Personalization settings (named "[Widget Name] Settings")**
Contains aesthetic properties that correspond to Device Personalization. iCUE renders a "Custom Style" toggle at the top of this group. When Custom Style is disabled, iCUE substitutes these properties with values from Device Personalization instead.

| Official Widget | Group 1 | Group 2 |
|----------------|---------|---------|
| Sensor | "Sensor Settings" — sensorValue, text | "Sensor Personalization" — textColor, backgroundColor |
| Weather | "Weather" — location, units, format | "Widget Personalization" — textColor, accentColor, backgroundColor, transparency |
| Chronograph | "Chronograph Stopwatch Settings" — showGlare, brandText, modelText | "Widget Personalization" — textColor, accentColor, backgroundColor, transparency, dialColor, bezelColor, markerColor, glassOpacity |
| Digital Clock | "Clock" — timeFormat, seconds, timeZone, text, dateText | "Clock Personalization" — textColor, backgroundColor, transparency |

**Exception:** Clock Face widgets use a first group with a scrolling image picker for clock face selection, followed by "Clock Face Settings" as the second group.

#### Custom Style & Device Personalization Interaction

When the user disables "Custom Style" on a widget, iCUE applies the Device Personalization values instead of the widget's custom property values. The Device Personalization settings are:

| Device Personalization Setting | Maps to Widget Property |
|-------------------------------|------------------------|
| Widget Text Color | `textColor` |
| Widget Accent Color | `accentColor` |
| Widget Background | `backgroundColor` |
| Widget Transparency | `transparency` |

**Note on "Widget Transparency":** Despite its name, the Device Personalization "Widget Transparency" slider is actually an **opacity** control. Setting it to 0% makes the background fully transparent, and 100% makes it fully opaque. This is the opposite of what the label implies. Widget-defined `transparency` properties typically use the inverse convention (0 = opaque, 100 = transparent), so the conversion `opacity = 1 - (transparency / 100)` is needed when applying the value.

**Critical:** Only properties with a Device Personalization equivalent should go in the personalization group. Widget-specific properties that do not have a Device Personalization mapping (e.g., a custom `warningColor`, `dialColor`, or `bezelColor`) should be placed in the widget's functional group (Group 1) instead. When Custom Style is disabled, iCUE de-lists properties in the personalization group and substitutes Device Personalization values. Properties without a mapping may receive invalid or undefined values, causing rendering failures (broken filters, garbled text, color interpolation errors).

#### How Properties Reach the Widget

When a user changes a property value, iCUE:
1. Sets the value as a **global JavaScript variable** with the name from `content`
2. Calls the widget's `onDataUpdated` callback

The widget reads properties as bare globals:
```javascript
function onDataUpdated() {
    document.documentElement.style.setProperty('--text-color', textColor);
    document.documentElement.style.setProperty('--bg-color', backgroundColor);
    // textColor and backgroundColor are global variables injected by iCUE
}
```

**Critical: Do NOT use `'use strict'`**

iCUE injects property values by evaluating `backend.data` as a JavaScript snippet that assigns bare globals (e.g., `textColor = '#E0E0E0';`). Using `'use strict'` in the widget's `<script>` block interferes with this mechanism in Qt WebEngine's eval scope, causing property injection to fail silently. The widget will load but will not receive property values, will not respond to Device Personalization settings, and interactive widgets will stop functioning (touch events intercepted by iCUE's overlay instead of reaching the widget). **Never use `'use strict'` in widget code.**

**Critical: Use bare globals, not `window[name]`**

iCUE injects properties by evaluating a script that creates global variables. Due to how Qt WebEngine handles the eval scope, these globals are **not reliably accessible via `window[name]`** or bracket notation. The following pattern **does NOT work**:

```javascript
// BROKEN — window[name] returns undefined even when the global exists
function getProp(name, fallback) {
    return (typeof window[name] !== 'undefined') ? window[name] : fallback;
}
var color = getProp('textColor', '#FFFFFF'); // always returns fallback
```

Instead, use **bare `typeof` checks** with direct global variable names:

```javascript
// CORRECT — bare globals work reliably
if (typeof textColor !== 'undefined') cfg.textColor = textColor;
if (typeof barCount !== 'undefined')  cfg.barCount = Number(barCount) || 32;
if (typeof mirrorMode !== 'undefined') cfg.mirrorMode = !!mirrorMode;
```

**Recommended pattern:** Store all settings in a `cfg` object, populate it from globals in a `readSettings()` function, and call it from both `onICUEInitialized` and `onDataUpdated`. The render loop and other code reads from `cfg` instead of accessing globals directly. This matches the pattern used by SystemPulse and other official widgets:

```javascript
var cfg = { textColor: '#FFFFFF', barCount: 32, mirrorMode: false };

function readSettings() {
    if (typeof textColor !== 'undefined')  cfg.textColor = textColor;
    if (typeof barCount !== 'undefined')   cfg.barCount = Number(barCount) || 32;
    if (typeof mirrorMode !== 'undefined') cfg.mirrorMode = !!mirrorMode;
}

function onDataUpdated() {
    readSettings();
    document.documentElement.style.setProperty('--text-color', cfg.textColor);
    // ... apply other settings
}
```

### 2.4 Lifecycle & Events

Widgets register callbacks by assigning an object to the global `icueEvents`. **Use a bare assignment (no `var`/`let`/`const`)** so that iCUE's bootstrap can find the object on the global scope:

```javascript
icueEvents = {
    "onICUEInitialized": onInit,
    "onDataUpdated": onDataUpdated,
    "onUpdateRequested": onRefresh   // optional
};

// Handle case where iCUE initialized before script runs
if (typeof iCUE_initialized !== 'undefined' && iCUE_initialized) {
    onInit();
}

// Standalone fallback (outside iCUE)
if (typeof iCUE_initialized === 'undefined') {
    onInit();
}
```

**Do NOT use `var icueEvents`** or `var iCUE_initialized = false`. Declaring `iCUE_initialized` with `var` overwrites the value set by iCUE's bootstrap, and declaring `icueEvents` with `var` may prevent iCUE from finding it depending on eval scope behavior in Qt WebEngine. Always use bare assignments and `typeof` checks.

#### Callback Reference

| Callback | When Called | Purpose |
|----------|------------|---------|
| `onICUEInitialized` | Once, when iCUE host is ready | Read `iCUE.iCUELanguage`, initialize translations, start timers |
| `onDataUpdated` | Every time any property value changes | Re-read all property globals, update DOM |
| `onUpdateRequested` | When iCUE requests a data refresh | Re-fetch external data (used by Weather) |

#### Boot Sequence

1. Browser loads the HTML file
2. iCUE parses `<meta>` tags, builds settings UI
3. iCUE injects `backend.dataScript` into the webview. This script:
   1. Creates a `QWebChannel` connection over `qt.webChannelTransport`
   2. Retrieves `backend` and `iCUE` objects from `channel.objects`
   3. Hooks `backend.dataChanged` → `applyData()` which evals `backend.data` to set property globals, then calls `icueEvents.onDataUpdated()`
   4. Hooks `backend.tickChanged` → calls `icueEvents.onUpdateRequested()` if defined
   5. Sets `window.iCUE_initialized = true`
   6. Calls `icueEvents.onICUEInitialized()` if defined
   7. Calls `applyData()` once with the initial property values
4. Widget renders initial state
5. On each settings change: iCUE updates `backend.data`, which triggers `dataChanged` → `applyData()` → eval → `onDataUpdated()`

### 2.5 The iCUE API Object

The global `iCUE` object provides host platform services:

| API | Returns | Description |
|-----|---------|-------------|
| `iCUE.iCUELanguage` | `string` | Current UI language code (e.g., `"en"`, `"ja"`) |
| `iCUE.fpsLimit` | `number` | FPS cap for animations (default: 10) |
| `iCUE.fpsLimitChanged` | signal | Fires when FPS limit changes |
| `iCUE.allTimeZones()` | `Promise<string[]>` | All available timezone identifiers |
| `iCUE.defaultTimeZone()` | `Promise<string>` | System's default timezone |
| `iCUE.default24HourFormat()` | `Promise<string>` | `'24h'` or `'12h'` based on system locale |
| `iCUE.defaultTemperatureUnit()` | `Promise<string>` | User's preferred temperature unit |
| `iCUE.defaultSpeedUnit()` | `Promise<string>` | User's preferred speed unit |
| `iCUE.formatUserLocaleDate()` | `Promise<string>` | Locale-formatted date string (current date) |
| `iCUE.formatUserLocaleDate(tz)` | `Promise<string>` | Locale-formatted date for timezone |
| `iCUE.formatUserLocaleDate(tz, format)` | `Promise<string>` | Custom-formatted date for timezone |
| `iCUE.formatUserLocaleTime()` | `Promise<string>` | Locale-formatted time string (current time) |
| `iCUE.formatUserLocaleTime(tz)` | `Promise<string>` | Locale-formatted time for timezone |
| `iCUE.formatUserLocaleTime(tz, format)` | `Promise<string>` | Custom-formatted time for timezone |
| `iCUE.ipRegistryApiKey` | `string` | API key for IP geolocation service (ipregistry.co) |

### 2.6 Translation System

Every native widget has a paired `translation.json` file (in the same folder as `index.html`) with this structure:

```json
{
    "en": {},
    "de": { "Text Color": "Textfarbe", "Background": "Hintergrund" },
    "ja": { "Text Color": "テキストカラー", "Background": "背景" },
    ...
}
```

English is the key language (keys are English strings). Supported locales: `en`, `de`, `es`, `fr`, `it`, `ja`, `ko`, `pt`, `ru`, `zh_CN`, `zh_TW`, `uk`.

The `tr()` function is used in two contexts:

1. **In meta tags** (parsed by iCUE at load time):
   ```html
   <meta ... data-label="tr('Text Color')">
   ```

2. **In JavaScript** (async, returns Promise):
   ```javascript
   const label = await tr("AM");
   tr("Unavailable").then(msg => showWarning(msg));
   ```

### 2.7 Shared Tools & Libraries

Shared tools live in `common/tools/` under the widgets root. Widgets reference them via `../common/tools/`.

#### `common/tools/ColorTools.js`
```javascript
function hexToRGB(hex) { /* returns "r, g, b" string */ }
```
Used to decompose hex colors for `rgba()` expressions where a separate alpha channel is needed.

#### `common/tools/DateFormatter.js`
A class providing 5 date format outputs (`MM/DD/YYYY`, `DD/MM/YYYY`, `DD MMM YY`, `Ddd D MMM`, `Dddd D MMMM`) using `Intl.DateTimeFormat`. Caches results and skips updates unless the day changes.

#### `common/tools/ticker-tracker.js` + `common/tools/ticker-track.css`
A reusable scrolling text component. If text overflows its container, it clones the text element and animates a horizontal scroll loop. Controlled via CSS custom properties:

```css
.ticker {
    --ticker-text-color: #fff;
    --font-size: 14px;
    --font-family: 'OpenSans';
    --view-max-width: 100%;
}
```

Required HTML structure:
```html
<div class="ticker" id="ticker" tabindex="0" aria-live="polite" role="region">
    <div class="ticker-track" id="tickerTrack">
        <span class="ticker-item" id="tickerText">scrolling text</span>
    </div>
</div>
```

#### `3rdparty/flipdown/`
Modified flip-card clock library (FlipDown). Displays current time with CSS 3D flip animations on digit changes. Supports timezone, 12h/24h, and show/hide seconds.

---

## 3. Target Devices & Responsive Design

### 4.1 Hardware Reference

Three device categories exist, each with very different physical characteristics:

#### Pump LCD (`pump_lcd`)

- **Display:** 480×480 px, 2.1" IPS LCD
- **Viewport:** Circular (diameter 480px inscribed in the square)
- **Used by:** Corsair LCD pump caps (e.g., iCUE LINK XD6 ELITE LCD, ELITE LCD XT)
- **Key constraints:**
  - Very small physical size — content must be large and legible
  - Circular viewport means corners are clipped; keep all content within ~85% of the square to avoid being cut off by the circular mask
  - No touch input
  - Best for: single-value displays (temperature, clock face), radial/circular visualizations
  - Not suitable for: text-heavy widgets, multi-column layouts, scrolling content

#### Keyboard LCD (`keyboard`)

- **Display:** 320×170 px, 1.9" LCD (sidebars consume 72px horizontally)
- **Widget viewport:** 248×170 px, ~1.46:1 aspect ratio
- **Used by:** Corsair VANGUARD series keyboards
- **Framerate:** 2-4 FPS (animated widgets will not perform well)
- **Key constraints:**
  - Extremely small — the most constrained display
  - At ~1.46:1 aspect ratio, content must be ultra-compact
  - Only fits 1-2 large values or a very simple visualization
  - No touch input
  - Animation-heavy widgets (starfield, matrix rain, game of life) are impractical at 2-4 FPS
  - **`x-icue-interactive` breaks keyboard screen cycling** — widgets with this flag cannot be returned to after cycling away. Do not use `x-icue-interactive` on widgets targeting the keyboard.
  - Best for: single sensor readout, minimal clock, tiny status indicator
  - Not suitable for: most widgets — many official widgets exclude this device entirely

#### Dashboard LCD (`dashboard_lcd`) — Xeneon Edge

- **Display:** 2560×720 px, 14.5" IPS LCD
- **Viewport:** Rectangular
- **Used by:** Corsair Xeneon Edge (mounted below/above monitor)
- **Key constraints:**
  - Ultra-wide aspect ratio (~3.56:1 for the full display)
  - Touchscreen-enabled — widgets can be interactive (`x-icue-interactive`)
  - The display is divided into widget slots; iCUE allows S, M, L, or XL sizing
  - Large physical size means fine detail is visible — text, charts, multi-element layouts all work well
  - Best for: dashboards, charts, detailed information displays, interactive widgets
  - The primary target for most widgets

### 4.2 Xeneon Edge Widget Slot Sizes

The Xeneon Edge (2560×720) divides into widget slots. iCUE supports both horizontal and vertical orientations, giving 8 possible viewport sizes. The names "Coruscant" appear in the official CSS as the internal codename.

#### Horizontal Orientation

| Slot | Resolution | Aspect Ratio | Character |
|------|-----------|-------------|-----------|
| **S** | 840 × 344 | ~2.44:1 | Short and wide — limited vertical space |
| **M** | 840 × 696 | ~1.21:1 | Nearly square — most balanced layout |
| **L** | 1688 × 696 | ~2.43:1 | Wide with full height — good for dashboards |
| **XL** | 2536 × 696 | ~3.64:1 | Near-full width — maximum real estate |

#### Vertical Orientation

| Slot | Resolution | Aspect Ratio | Character |
|------|-----------|-------------|-----------|
| **S** | 696 × 416 | ~1.67:1 | Mild landscape |
| **M** | 696 × 840 | ~0.83:1 | Portrait — taller than wide |
| **L** | 696 × 1688 | ~0.41:1 | Tall column |
| **XL** | 696 × 2536 | ~0.27:1 | Extreme vertical strip |

#### Layout Naming Convention

- **H** prefix = horizontal orientation, **V** prefix = vertical orientation
- **S/M/L/XL** without H or V prefix refers to both horizontal and vertical layouts of that size
- Examples: "HS" = horizontal small (840x344), "VL" = vertical large (696x1688), "M" = both HM (840x696) and VM (696x840)

### 4.3 Design Guidelines by Device

**General rule:** Not every widget should target every device. Use `x-icue-restrictions` to limit widgets to devices where they can render meaningfully. A widget designed for the Xeneon Edge dashboard probably won't work on a 248x170 keyboard LCD.

**Pump LCD design tips:**
- Design within a circle — use `border-radius: 50%` container or center content with generous margins
- Use large, high-contrast text (minimum ~40px for primary values)
- Limit to 1-2 data points maximum
- Radial/gauge visualizations work naturally with the circular viewport

**Keyboard LCD design tips:**
- Maximum 1 large value + 1 label
- Use bold, condensed fonts for legibility at small sizes
- Avoid any secondary content — there's no room

**Xeneon Edge design tips:**
- Design primarily for the **horizontal** orientation, as it's the most common mounting
- Use **horizontal (row) layouts** — the ultra-wide aspect ratios reward left-to-right content flow
- The S slot (840×344) has limited height — keep vertical content minimal, use a single-row layout
- The M slot (840×696) is the most "normal" — can use column or row layouts
- The L and XL slots are very wide — fill the space with stretched visualization areas (charts, waveforms), not by making elements bigger
- Touch targets should be at least 44×44px for the touchscreen
- Use **viewport units** (`vh`, `vw`, `clamp()`) for element sizing so layouts scale proportionally across all slot sizes

### 4.4 Media Query Patterns

#### The Preview Rendering Problem

**Critical:** The iCUE desktop app shows a live preview of the widget in the dashboard editor. This preview renders the widget HTML in a **scaled-down viewport** that preserves the slot's **aspect ratio** but at a much smaller **pixel size** than the actual XE display. For example, the L slot (1688×696 on the XE) might render at ~680×280 in the preview.

This means:
- **`min-width` / `max-width` queries will fire differently** in the preview vs. the actual display — the L slot preview viewport is smaller than 900px, so a query like `@media (min-width: 901px)` won't match in the preview but will on the actual XE.
- **`min-aspect-ratio` / `max-aspect-ratio` queries are consistent** — the preview preserves the aspect ratio, so aspect-ratio queries fire identically in both contexts.

#### Recommended Approach: Aspect-Ratio-Only Breakpoints

Use only aspect ratio queries to ensure the iCUE preview matches the actual XE display:

```css
/* Wide horizontal — S, L (aspect ~2.4) and XL (~3.6) */
/* Default styles — no media query needed */

/* Square / mild landscape — M horizontal (~1.2), S vertical (~1.7) */
@media (max-aspect-ratio: 180/100) and (min-aspect-ratio: 90/100) { ... }

/* Portrait — M/L/XL vertical (aspect < 0.9) */
@media (max-aspect-ratio: 90/100) { ... }

/* Very tall portrait — L/XL vertical (aspect < 0.5) */
@media (max-aspect-ratio: 50/100) { ... }
```

**Note on S vs L:** S Horizontal (~2.44) and L Horizontal (~2.43) have nearly identical aspect ratios and cannot be distinguished by aspect ratio. Design them to share the same layout structure, using viewport-relative units (`vh`, `vw`, `clamp()`) so elements scale proportionally to the available space. The S slot will simply render everything smaller.

#### Official Widget Approach (for reference)

The official Corsair widgets use pixel-width queries to distinguish S from L:

```css
@media (min-aspect-ratio: 200/100) and (max-width: 900px) { /* S */ }
@media (min-aspect-ratio: 200/100) and (min-width: 901px) { /* L, XL */ }
```

This works on the actual XE display but causes the preview to show the wrong layout. The official widgets may have special handling for this, or it may be an accepted trade-off in their implementation.


---

## 4. Font System

Widgets load fonts from Qt resource URLs:

```css
@font-face {
    font-family: 'OpenSansSemiBold';
    src: url('qrc:/fonts/OpenSans-SemiBold.ttf');
}
```

Available font families:
- **OpenSans** (Regular, SemiBold) — general purpose
- **BebasNeuePro** (Regular, SemiExpBold) — large digital clock digits
- **DIN-Condensed** (Regular) — analog clock numbers
- **Saira** (Regular, Medium, SemiBold) — chronograph, calendar, coin flip

### 4.1 Font Size Guidelines

Official dashboard widgets (`dashboard_lcd`) use **viewport-relative units** (`vh`, `vw`, `vmin`) for all font sizes — never `em`, `rem`, or fixed `px`. This ensures text scales proportionally across all Xenon Edge slot sizes and, critically, renders identically in the iCUE preview (which preserves aspect ratio but uses smaller pixel dimensions).

#### Reference Sizes from Official Widgets

| Widget | Element | Size | Unit |
|--------|---------|------|------|
| Weather | Temperature value | `10vh` | Primary large value |
| Weather | City name | `3.1vh` | Secondary label |
| Weather | Condition text | `5.17vh` | Standard body text |
| Chronograph | Digit display | `7.27vmin` | Large numeric display |
| Chronograph | Labels | `2.1vmin` | Small label text |
| Sensor | Value display | `30.5vmin` | Hero value |
| Sensor | Units | `14.1vmin` | Sub-value text |

#### Recommended Sizes for Dashboard Widgets

| Purpose | Recommended Size | Notes |
|---------|-----------------|-------|
| Hero/primary value | `8–12vh` | The main number/reading |
| Standard text | `~5vh` | Body text, status labels |
| Secondary labels | `3–3.5vh` | Category labels, captions |
| Small annotations | `2–2.5vh` | Timestamps, fine print |

#### Key Rules

1. **Always use `vh`/`vw`/`vmin`** — never `px`, `em`, or `rem` for font sizes on dashboard widgets
2. **Never use `clamp()` with `px` bounds** — `clamp(11px, 2.8vh, 22px)` will clamp to `11px` in the iCUE preview (small viewport) making text appear proportionally correct in preview but unreadably small on the actual 14.5" display
3. **The preview problem**: iCUE's preview renders the widget at a scaled-down pixel size. A `12px` minimum looks fine at preview scale but is tiny on the real display. Pure `vh` avoids this entirely since both preview and actual display have proportionally identical viewport heights

---

## 5. Design Conventions

### Color Theming
Widgets use CSS custom properties for theming:
```css
:root {
    --text-color: #FFFFFF;
    --bg-color: #000000;
    --accent-color: #FFD700;
    --widget-opacity: 1.0;
}
```

### Widget Picker Icons

The icon shown for a widget in the iCUE widget picker is declared via a standard `<link rel="icon">` in `<head>`:

```html
<link rel="icon" type="image/svg+xml" href="images/my-widget-icon.svg">
```

Icons live in the shared `images/` directory at the widgets root (e.g., `Corsair iCUE5 Software\widgets\images\`). The path in `href` is relative to the widget HTML file.

**Design guidelines** (based on the official iCUE widget icons):
- **Size:** 16×16 px viewBox (`width="16" height="16"`)
- **Style:** Monochrome, single fill/stroke color — use `fill="silver"` to match iCUE's icon chrome
- **Background:** Transparent — no background rectangle; iCUE renders the icon on its own chrome
- **Complexity:** Keep shapes simple and readable at 16px. Use basic paths, lines, and circles — avoid fine detail or gradients
- **Format:** SVG preferred; other image formats likely work but SVG scales cleanly

Example — horizontal equalizer bars:
```svg
<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
    <path d="M1,8 v7 h2 v-7z M4,3 v12 h2 v-12z M7,1 v14 h2 v-14z M10,5 v10 h2 v-10z M13,9 v6 h2 v-6z" fill="silver"/>
</svg>
```

Example — radial bars with center dot (pump LCD widget):
```svg
<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="2" fill="silver"/>
    <g stroke="silver" stroke-width="1.5" stroke-linecap="round">
        <line x1="8"    y1="4.5"  x2="8"    y2="2.5"/>
        <line x1="10.5" y1="5.5"  x2="13.0" y2="3.0"/>
        <line x1="11.5" y1="8"    x2="14"   y2="8"/>
        <line x1="10.5" y1="10.5" x2="13.3" y2="13.3"/>
        <line x1="8"    y1="11.5" x2="8"    y2="13.5"/>
        <line x1="5.5"  y1="10.5" x2="3.0"  y2="13.0"/>
        <line x1="4.5"  y1="8"    x2="1.5"  y2="8"/>
        <line x1="5.5"  y1="5.5"  x2="3.8"  y2="3.8"/>
    </g>
</svg>
```

### In-Widget Icon Coloring

SVG icons used as visual elements *inside* a widget are applied via CSS `mask-image` with `background-color` so they inherit the theme color:
```css
.icon {
    mask-image: url('icon.svg');
    mask-size: contain;
    background-color: var(--accent-color);
}
```

### Animation
- Clocks use `setTimeout` aligned to second boundaries or `requestAnimationFrame`
- Digit transitions use CSS 3D transforms (`rotateX`, `backface-visibility`)
- Ticker/marquee text uses CSS `translateX` animation
- Live indicators use `@keyframes pulse` for pulsing dots

### Transparency

Native widgets implement transparency via the `transparency` property (0–100), converted to a `--widget-opacity` CSS variable. **Important:** Do NOT apply `opacity` directly to the `body` element — this makes the entire widget (including text and content) transparent. Instead, use `color-mix()` to blend only the background color with transparency:

```javascript
function onDataUpdated() {
    const opacity = 1 - (transparency / 100);
    document.documentElement.style.setProperty('--widget-opacity', opacity);
}
```

```css
/* CORRECT — body is transparent, container gets the blended background */
body {
    background: transparent;
}
.container {
    background-color: color-mix(in srgb, var(--bg-color), transparent calc((1 - var(--widget-opacity)) * 100%));
}

/* WRONG — semi-transparent body causes compositing artifacts in Qt WebEngine */
body {
    background-color: color-mix(in srgb, var(--bg-color), transparent calc((1 - var(--widget-opacity)) * 100%));
}

/* WRONG — makes everything invisible, breaks Device Personalization */
body {
    background: var(--bg-color);
    opacity: var(--widget-opacity);
}
```

**Critical implementation detail:** The semi-transparent background must go on a **container div**, never on `body` itself. All official widgets follow this pattern (Weather uses `.weather-container`, AnalogClock1 uses `.clock-container`). Applying `color-mix()` or `rgba()` transparency directly to `body` causes rendering artifacts in Qt WebEngine — the webview's compositing layer doesn't clear properly with a semi-transparent body, resulting in ghosted/doubled content.

This pattern is also critical for compatibility with iCUE's "Custom Style" toggle. When Custom Style is disabled, iCUE applies Device Personalization at the container level. Using `opacity` on `body` would double up with iCUE's own transparency.

**Text styling rules:**
- NEVER use transparent or semi-transparent text. All text must be a solid, fully opaque color for readability.

**Transparency behavior by device:**
- **Xenon Edge**: The Appearance -> Transparency setting ONLY affects the widget background color opacity. It must NOT affect text, canvas trails, or other visual elements.
- **Pump LCD**: Transparency has no effect since there is no background layer behind the pump LCD other than the widget's own background color. The setting exists for Device Personalization compatibility but is functionally inert.

---

## 6. Creating a New Widget

### Checklist

1. Create `widgets/MyWidget.html` with required meta tags:
   - `<title>tr('My Widget')</title>` — **must use `tr()` wrapper**
   - `<link rel="icon" type="image/svg+xml" href="images/my-widget-icon.svg">` for the picker icon
   - `x-icue-widget-preview` for thumbnail
   - `x-icue-restrictions` for device targeting
   - `x-icue-property` for each configurable setting
   - `x-icue-interactive` if the widget accepts input

2. Create `widgets/MyWidget_translation.json` with strings for all supported locales

3. Create a 16×16 monochrome SVG icon in `widgets/images/` (see §6 for design guidelines)

4. Register the `icueEvents` object with lifecycle callbacks:
   ```javascript
   icueEvents = {
       "onICUEInitialized": onInit,
       "onDataUpdated": onDataUpdated
   };
   if (iCUE_initialized) onInit();
   ```

5. In `onDataUpdated`, read property globals and update the DOM

6. Add preview image to `widgets/resources/`

7. Optionally add external CSS to `widgets/styles/` and images to `widgets/images/`

### Companion Server Pattern

For widgets that need access to system resources unavailable from the webview (system audio, OS media controls, hardware sensors not exposed by iCUE, etc.), use a **companion server** running locally on the user's machine. The widget connects to it via WebSocket.

**Architecture:**
```
System Resources → Companion Server (localhost) ─→ WebSocket ws://localhost:PORT
                                                      ↑
iCUE Widget (HTML) ←── WebSocket JSON messages ──────┘
```

**Key design points:**

1. **WebSocket is the primary channel** — use a single port for both data push and binary assets. Do not rely on HTTP endpoints for images or other resources, as Qt WebEngine blocks `<img src="http://localhost:...">` from the widget origin (see [Mixed content restriction](#11-webengine-environment)).

2. **Separate data streams by message type** — push high-frequency data (e.g., FFT bins at 60fps) in the main message loop, and send infrequent data (e.g., album art) as separate typed messages only when the data changes:
   ```json
   {"fft": [0.1, 0.5, ...], "media": {"title": "...", "artist": "..."}}
   {"type": "art", "artUrl": "data:image/jpeg;base64,..."}
   ```

3. **Send current state on connect** — when a new WebSocket client connects, immediately send the current state (including any cached binary data) so the widget doesn't have to wait for the next change event.

4. **Auto-reconnect in the widget** — the companion server may start after the widget, or may restart. The widget should auto-reconnect on WebSocket close/error:
   ```javascript
   ws.onclose = function() { setTimeout(connectWS, 2000); };
   ```

5. **Configurable port** — expose the server port as a widget property (e.g., `serverPort` textfield) so users can change it if the default conflicts with another application. Track the connected port and reconnect when the setting changes.

6. **Graceful degradation** — when the server is offline, show a dimmed "Server offline" state. When connected but no data is available (e.g., no media session), show an appropriate placeholder rather than empty space.

See `widgets/server/NowPlayingServer.py` and `widgets/NowPlaying.html` for a working example of this pattern (system audio FFT + Windows SMTC media info).
