# QK 2048

The classic 2048 sliding tile puzzle game for the Corsair Xeneon Edge dashboard touchscreen.

## Features

- Standard 4x4 grid with authentic 2048 color scheme
- Swipe-based controls (up/down/left/right)
- Keyboard arrow key support for desktop testing
- Score tracking with personal best
- Tile spawn animation (pop effect)
- Win detection at 2048 (game continues for higher scores)
- Game over detection when no moves remain
- New Game button to restart

## Gameplay

1. Swipe in any direction to slide all tiles
2. Tiles with the same value merge into one (doubling the value)
3. A new tile (2 or 4) spawns after each move
4. Reach 2048 to win -- or keep going for a higher score
5. Game ends when no more moves are possible

## Setup

1. Download the widget files from the [Releases](https://github.com/QuadraKev/QK-iCUE-Widgets/releases) page.
2. Copy the widget files into your iCUE widgets directory (typically `C:\Program Files\Corsair\Corsair iCUE5 Software\widgets`).
3. Restart iCUE for the new widget to appear in the widget picker.
4. Add the widget to your device dashboard in iCUE.

## Display

- **Target device:** Xeneon Edge (dashboard_lcd)
- **Slots:** S (840x344), M (840x696), L (1688x696), XL (2536x696)
- **Layout:** Side-by-side (wide) or stacked (square/portrait)

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| textColor | color | #776E65 | Tile text color |
| accentColor | color | #EECE5A | Title/accent color |
| backgroundColor | color | #0A0A0A | Background color |
| transparency | slider | 0 | Background transparency (0-100%) |

## Technical Notes

- Swipe detection via touchstart/touchend delta with 30px threshold
- Board state stored as flat 16-element array
- Line extraction supports all 4 directions using index mapping
- Merge logic: slide non-zeros left, merge adjacent equals, pad with zeros

## Attribution

Created by Claude Code for the QK iCUE Widget collection.
