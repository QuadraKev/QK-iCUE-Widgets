# QK Paint

A finger-painting app for the Corsair Xeneon Edge dashboard touchscreen.

## Features

- Freehand brush drawing with touch support
- Fill (paint bucket) tool for flood-filling areas
- Eraser tool
- 3 brush sizes (small, medium, large)
- 12-color palette with draw/background color selection
- Undo support (up to 15 steps)
- Clear canvas button
- Configurable canvas background color via iCUE settings

## Controls

- **Brush**: Draw freehand strokes on the canvas
- **Fill**: Tap to flood-fill a region with the current draw color
- **Eraser**: Paint with the background color to erase
- **Size buttons**: Switch between small (8px), medium (20px), and large (40px) brush
- **Color swatches**: Tap to set draw color; tap the DRAW/BG buttons to swap which is being set
- **Undo**: Revert the last stroke or fill (up to 15 steps)
- **Clear**: Reset the canvas to the background color

## Setup

1. Download the widget files from the [Releases](https://github.com/QuadraKev/QK-iCUE-Widgets/releases) page.
2. Copy the widget files into your iCUE widgets directory (typically `C:\Program Files\Corsair\Corsair iCUE5 Software\widgets`).
3. Restart iCUE for the new widget to appear in the widget picker.
4. Add the widget to your device dashboard in iCUE.

## Display

- **Target device:** Xeneon Edge (dashboard_lcd) with touchscreen
- **Slots:** S (840x344), M (840x696), L (1688x696), XL (2536x696)
- **Layout:** Toolbar on the left (landscape) or top (portrait), canvas fills remaining space

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| canvasColor | color | #FFFFFF | Canvas background color |

## Technical Notes

- Canvas-based drawing with requestAnimationFrame rendering
- Touch events (touchstart/touchmove/touchend) for stroke input
- Flood fill uses a queue-based algorithm operating on canvas pixel data
- Toolbar layout adapts between column (landscape) and row (portrait) orientations
- Brush sizes and color swatches are touch-friendly (minimum 40px targets)
