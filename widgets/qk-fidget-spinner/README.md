# QK Fidget Spinner - iCUE Dashboard Widget

An interactive fidget spinner toy for the **Corsair Xeneon Edge** touchscreen, built for iCUE's LCD widget system. Swipe to spin with realistic deceleration physics and an RPM counter.

---

## How It Works

Swipe in a circular motion on the spinner to make it spin. The spinner decelerates naturally with friction. The faster you swipe, the faster it spins. An RPM counter in the corner shows the current rotation speed.

### Features

- Touch-driven rotation with velocity-based physics
- Configurable arm count (2-6 arms)
- Exponential friction deceleration for realistic spin-down
- Motion blur trails at high speeds
- Live RPM display
- Canvas-based rendering at native resolution

---

## Requirements

- Corsair iCUE (built and tested on 5.41.42)
- Corsair Xeneon Edge (or compatible dashboard LCD with touchscreen)

---

## Setup

1. Download the ZIP file from the [Releases](https://github.com/QuadraKev/qk-fidget-spinner/releases) page.
2. Extract its contents into your iCUE widgets directory (typically `C:\Program Files\Corsair\Corsair iCUE5 Software\widgets`).
3. Restart iCUE for the new widget to appear in the widget picker.
4. Add the widget to your Xeneon Edge dashboard in iCUE.

---

## Settings

| Setting | Description |
|---------|-------------|
| **Number of Arms** | Spinner arm count (2-6) |
| **Friction** | How quickly the spinner slows down (10-100%) |
| **Text Color** | Color for RPM display text |
| **Accent Color** | Color for the spinner body |
| **Background Color** | Widget background color |
| **Transparency** | Background transparency (0-100%) |

---

## Layout

The spinner automatically scales to fit the available space in any Xeneon Edge slot size, using the smaller dimension (width or height) to size the spinner. Works in all horizontal and vertical orientations.
