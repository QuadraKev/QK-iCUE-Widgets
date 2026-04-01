# QK Moon Phase - iCUE Widget

Displays the current lunar phase as a visual SVG moon with phase name and illumination percentage. Designed for both the **Corsair pump LCD** and **Xeneon Edge** displays.

---

## How It Works

The widget calculates the current moon phase using a synodic month algorithm referenced against a known new moon date (January 6, 2000). It renders the illuminated portion of the moon as an SVG path with a crescent/gibbous terminator line, updating hourly.

The circular pump LCD is an ideal canvas for this widget -- the moon sits naturally in the round viewport.

---

## Requirements

- Corsair iCUE (built and tested on 5.41.42)
- Corsair pump LCD or Xeneon Edge (or compatible dashboard LCD)

---

## Setup

**1. Install the widget in iCUE:**

- Download the widget files from the [Releases](https://github.com/QuadraKev/QK-iCUE-Widgets/releases) page.
- Copy the project folder into your iCUE widgets directory
  - Typically `C:\Program Files\Corsair\Corsair iCUE5 Software\widgets`
  - `QKMoonPhase.html`, `QKMoonPhase_translation.json` should be added to `\widgets`
  - `images\qk-moon-phase.svg` should be added to the `widgets\images` folder
- Add the widget to your pump LCD or Xeneon Edge dashboard in iCUE
- Restart iCUE for the new widget to appear in the widget picker

---

## Settings

| Setting | Description |
|---------|-------------|
| **Show Phase Name** | Toggle the phase name text (e.g., "Waxing Crescent") |
| **Show Illumination** | Toggle the illumination percentage |
| **Show Date** | Toggle the current date display |
| **Text Color** | Color for text labels |
| **Moon Color** | Color of the illuminated moon surface (default: beige) |
| **Background Color** | Widget background color (default: near-black) |
| **Transparency** | Background transparency |

---

## Moon Phases

The widget displays all 8 standard lunar phases:
- New Moon
- Waxing Crescent
- First Quarter
- Waxing Gibbous
- Full Moon
- Waning Gibbous
- Last Quarter
- Waning Crescent

---

## Display

- **Pump LCD** -- The moon circle fills most of the circular viewport with phase name and illumination below. Looks especially striking on the round display.
- **XE Horizontal** -- Moon on the left with text labels on the right.
- **XE Portrait** -- Moon above with text below.

---

## Accuracy

The synodic month calculation is accurate to within a few hours for phase identification. For most purposes (determining whether the moon is waxing/waning, crescent/gibbous/full), this is more than sufficient. The illumination percentage is calculated using a cosine function of the phase angle.

---

## Tips

- The deep dark background (default #05050A) makes the moon stand out dramatically
- On the pump LCD, try disabling all text labels for a pure moon-only display
- Change the moon color to a cool blue-white (#D0E8FF) for a more realistic look
