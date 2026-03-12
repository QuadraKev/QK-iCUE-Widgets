# QK Matrix Rain

The iconic digital rain effect from The Matrix. Columns of characters cascade down the screen with glowing head characters and fading green trails.

## Features

- Falling columns of randomized characters (Latin, digits, symbols, half-width katakana)
- White glowing head character per column
- Green-tinted body with fade-to-dark trail effect
- Characters randomly mutate as they fall
- Configurable character size, speed, and column density
- Dynamic column spawning for varied visual density

## Setup

1. Download the widget files from the [Releases](https://github.com/QuadraKev/QK-iCUE-Widgets/releases) page.
2. Copy the widget files into your iCUE widgets directory (typically `C:\Program Files\Corsair\Corsair iCUE5 Software\widgets`).
3. Restart iCUE for the new widget to appear in the widget picker.
4. Add the widget to your device dashboard in iCUE.

## Display

- **Target devices:** All (no device restriction)
- **XE slots:** S through XL
- **Pump:** 480x480

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| charSize | combobox | 14 | Character pixel size (10/14/20) |
| speed | slider | 5 | Fall speed (1-10) |
| density | slider | 5 | Column density (1-10) |
| accentColor | color | #00FF41 | Rain color |
| backgroundColor | color | #000000 | Background color |
| transparency | slider | 0 | Background transparency (0-100%) |

## Technical Notes

- Trail effect achieved via semi-transparent background overlay each frame (alpha 0.05)
- Character set includes half-width katakana (U+FF66-U+FF96) for authentic Matrix look
- Each column has independent speed, length, and character mutation rate

## Attribution

Created by Claude Code for the QK iCUE Widget collection.
