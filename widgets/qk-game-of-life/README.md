# QK Game of Life

Conway's Game of Life cellular automaton. A mesmerizing simulation that works on both the Xeneon Edge dashboard and pump LCD.

## Features

- Canvas-based rendering for smooth performance
- Toroidal grid (wraps around edges)
- Interactive: draw/erase cells by clicking or touching
- Controls: play/pause, single step, randomize, clear
- Generation and population counters
- Auto-restart on stagnation or extinction (configurable)
- Configurable cell size (8px, 12px, 18px) and speed

## Setup

1. Download the widget files from the [Releases](https://github.com/QuadraKev/qk-game-of-life/releases) page.
2. Copy the widget files into your iCUE widgets directory (typically `C:\Program Files\Corsair\Corsair iCUE5 Software\widgets`).
3. Restart iCUE for the new widget to appear in the widget picker.
4. Add the widget to your device dashboard in iCUE.

## Display

- **Target devices:** All (no device restriction)
- **XE slots:** S through XL
- **Pump:** 480x480

## Rules (Conway's Game of Life)

1. Any live cell with 2 or 3 neighbors survives
2. Any dead cell with exactly 3 neighbors becomes alive
3. All other live cells die; all other dead cells stay dead

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| speed | slider | 5 | Simulation speed (1-10) |
| cellSize | combobox | 12 | Cell pixel size (8/12/18) |
| autoRestart | switch | true | Auto-restart when stagnant |
| textColor | color | #E0E0E0 | UI text color |
| accentColor | color | #00FF88 | Alive cell color |
| backgroundColor | color | #0A0A0A | Background color |
| transparency | slider | 0 | Background transparency (0-100%) |

## Attribution

Created by Claude Code for the QK iCUE Widget collection.
