# QK Simon

A Simon Says memory game for the Corsair Xeneon Edge dashboard touchscreen. Watch the color sequence, then repeat it from memory.

## Features

- Classic 4-pad layout (green, red, yellow, blue)
- Computer plays increasingly long color/sound sequences
- Audio feedback using Web Audio API (unique tone per pad)
- Error sound on wrong input
- Score tracking with personal best
- Configurable speed and sound toggle
- Visual lighting effects on pad activation

## Gameplay

1. Tap START to begin
2. Watch the sequence of lit-up pads
3. Repeat the sequence by tapping the pads in order
4. Each round adds one more step to the sequence
5. Miss a step and the game ends -- your score is the last completed sequence length

## Setup

1. Download the widget files from the [Releases](https://github.com/QuadraKev/qk-simon/releases) page.
2. Copy the widget files into your iCUE widgets directory (typically `C:\Program Files\Corsair\Corsair iCUE5 Software\widgets`).
3. Restart iCUE for the new widget to appear in the widget picker.
4. Add the widget to your device dashboard in iCUE.

## Display

- **Target device:** Xeneon Edge (dashboard_lcd)
- **Slots:** S (840x344), M (840x696), L (1688x696), XL (2536x696)
- **Layout:** Side-by-side (wide) or stacked (square)

## Touch Targets

Each pad is 50% of the board width and height -- well over 10mm in all slot sizes.

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| soundEnabled | switch | true | Enable audio feedback |
| gameSpeed | slider | 5 | Sequence playback speed (1-10) |
| textColor | color | #E0E0E0 | Text color |
| backgroundColor | color | #0A0A0A | Background color |
| transparency | slider | 0 | Background transparency (0-100%) |

## Attribution

Created by Claude Code for the QK iCUE Widget collection.
