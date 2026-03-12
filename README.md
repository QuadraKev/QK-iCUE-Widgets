# QK iCUE Widgets

Custom widgets for Corsair iCUE LCD displays (Xeneon Edge and pump LCD), built as self-contained single-HTML-file applications.

## Widgets

### Xeneon Edge (touchscreen, 2560x720)

| Widget | Description |
|--------|-------------|
| [2048](widgets/qk-2048) | Classic 2048 sliding tile puzzle game |
| [Calculator](widgets/qk-calculator) | Touchscreen calculator with clean, responsive button layout |
| [Dice Roller](widgets/qk-dice-roller) | Interactive dice rolling with spinning 3D wireframe dice and roll history |
| [Fidget Spinner](widgets/qk-fidget-spinner) | Swipe-to-spin fidget spinner with realistic deceleration physics |
| [Magic 8 Ball](widgets/qk-magic-8-ball) | Fortune-telling widget with the classic 20 Magic 8 Ball answers |
| [Paint](widgets/qk-paint) | Finger-painting app for the touchscreen |
| [Simon](widgets/qk-simon) | Simon Says memory game |
| [Tally Counter](widgets/qk-tally-counter) | Tap-to-count widget for tracking reps, laps, scores, or any count |
| [World Clocks](widgets/qk-world-clocks) | Up to 4 clocks side by side set to different timezones |
| [XE Visualizer](widgets/qk-xe-visualizer) | Real-time audio spectrum visualizer with track info |

### Pump LCD (480x480, circular)

| Widget | Description |
|--------|-------------|
| [Pump Visualizer](widgets/qk-pump-visualizer) | Circular audio visualizer in a radial layout with track info |

### Both Devices

| Widget | Description |
|--------|-------------|
| [Binary Clock](widgets/qk-binary-clock) | Current time displayed as illuminated dots in binary |
| [Day Progress](widgets/qk-day-progress) | Day, week, month, and year elapsed as progress bars |
| [Game of Life](widgets/qk-game-of-life) | Conway's Game of Life cellular automaton |
| [Matrix Rain](widgets/qk-matrix-rain) | Digital rain effect with cascading characters and fading green trails |
| [Moon Phase](widgets/qk-moon-phase) | Current lunar phase with phase name and illumination percentage |
| [Starfield](widgets/qk-starfield) | Warp-speed starfield with motion trails |

## Installation

### From a release

1. Download a widget ZIP (or the all-widgets bundle) from [Releases](https://github.com/QuadraKev/QK-iCUE-Widgets/releases)
2. Extract the contents into `C:\Program Files\Corsair\Corsair iCUE5 Software\widgets\`
3. Restart iCUE

### From source (Windows)

1. Clone this repo
2. Run `install.bat` as administrator

## Repository Structure

```
widgets/          All widgets, one folder each
docs/             Widget API docs, design guidelines, shared assets
tools/            Build and screenshot scripts
.github/          CI workflows
widgets.csv       Widget inventory, versions, and release status
install.bat       Copies all widgets into iCUE's widget directory
```

## Releases

Releases are automated via GitHub Actions. Pushing a tag (e.g., `v2026.03`) triggers the release workflow, which packages each release-ready widget into an installable ZIP and creates a GitHub Release.

The `widgets.csv` file controls which widgets are included and at what version. Only widgets with `Release Ready` set to `Y` are packaged.

## Development

See [docs/CLAUDE.md](docs/CLAUDE.md) for the full technical reference, including the widget API, device specs, naming conventions, and required settings patterns.

Each widget is a single self-contained HTML file with no external dependencies. Widgets use the [Jost](https://fonts.google.com/specimen/Jost) variable font embedded as base64 woff2.

## License

MIT
