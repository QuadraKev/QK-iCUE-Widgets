# QK Starfield

A classic warp-speed starfield simulation. Stars fly outward from the center with motion trails, creating a hyperspace travel effect.

## Features

- 3D-to-2D projected star particles flying from center
- Motion trail lines connecting previous and current positions
- Stars grow brighter and larger as they approach the viewer
- Configurable star count (50-500), speed, and trail toggle
- Seamless looping (stars respawn at center when leaving screen)

## Setup

1. Download the widget files from the [Releases](https://github.com/QuadraKev/qk-starfield/releases) page.
2. Copy the widget files into your iCUE widgets directory (typically `C:\Program Files\Corsair\Corsair iCUE5 Software\widgets`).
3. Restart iCUE for the new widget to appear in the widget picker.
4. Add the widget to your device dashboard in iCUE.

## Display

- **Target devices:** All (no device restriction)
- **Pump:** Particularly striking on the circular display, which naturally frames the radial star pattern
- **XE slots:** Creates an immersive widescreen hyperspace effect

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| starCount | slider | 200 | Number of stars (50-500) |
| speed | slider | 5 | Warp speed (1-10) |
| showTrails | switch | true | Show motion trail lines |
| accentColor | color | #FFFFFF | Star color |
| backgroundColor | color | #000005 | Background color |
| transparency | slider | 0 | Background transparency (0-100%) |

## Technical Notes

- Stars exist in a 3D coordinate space (-1000 to 1000 on X/Y, 0 to 1000 on Z)
- Perspective projection: screen_x = (x / z) * focal_length + center_x
- Trail effect uses semi-transparent background overlay for persistence of vision

## Attribution

Created by Claude Code for the QK iCUE Widget collection.
