# QK iCUE Widgets

Custom widgets for Corsair iCUE LCD displays (Xeneon Edge and pump LCD), built as self-contained single-HTML-file applications.

## Widgets

### Xeneon Edge (touchscreen, 2560x720)

| Widget | Description |
|--------|-------------|
| [2048](widgets/QK2048) | Classic 2048 sliding tile puzzle game |
| [Calculator](widgets/QKCalculator) | Touchscreen calculator with clean, responsive button layout |
| [Dice Roller](widgets/QKDiceRoller) | Interactive dice rolling with spinning 3D wireframe dice and roll history |
| [Fidget Spinner](widgets/QKFidgetSpinner) | Swipe-to-spin fidget spinner with realistic deceleration physics |
| [Magic 8 Ball](widgets/QKMagic8Ball) | Fortune-telling widget with the classic 20 Magic 8 Ball answers |
| [Paint](widgets/QKPaint) | Finger-painting app for the touchscreen |
| [Simon](widgets/QKSimon) | Simon Says memory game |
| [Tally Counter](widgets/QKTallyCounter) | Tap-to-count widget for tracking reps, laps, scores, or any count |
| [World Clocks](widgets/QKWorldClocks) | Up to 4 clocks side by side set to different timezones |
| [XE Visualizer](widgets/QKXEVisualizer) | Real-time audio spectrum visualizer with track info |

### Pump LCD (480x480, circular)

| Widget | Description |
|--------|-------------|
| [Pump Visualizer](widgets/QKPumpVisualizer) | Circular audio visualizer in a radial layout with track info |

### Both Devices

| Widget | Description |
|--------|-------------|
| [Binary Clock](widgets/QKBinaryClock) | Current time displayed as illuminated dots in binary |
| [Day Progress](widgets/QKDayProgress) | Day, week, month, and year elapsed as progress bars |
| [Game of Life](widgets/QKGameOfLife) | Conway's Game of Life cellular automaton |
| [Matrix Rain](widgets/QKMatrixRain) | Digital rain effect with cascading characters and fading green trails |
| [Moon Phase](widgets/QKMoonPhase) | Current lunar phase with phase name and illumination percentage |
| [Starfield](widgets/QKStarfield) | Warp-speed starfield with motion trails |

## Installation

### From a release

1. Download a widget ZIP (or the all-widgets bundle) from [Releases](https://github.com/QuadraKev/QK-iCUE-Widgets/releases)
2. Extract the contents into `C:\Program Files\Corsair\Corsair iCUE5 Software\widgets\`
3. Restart iCUE

### From source (Windows)

1. Clone this repo
2. Copy each widget folder (e.g., `QKWeather\`) into `C:\Program Files\Corsair\Corsair iCUE5 Software\widgets\`
3. Restart iCUE

## Development

Each widget is a single self-contained HTML file with no external dependencies. Widgets use the [Jost](https://fonts.google.com/specimen/Jost) variable font embedded as base64 woff2.

## License

MIT
