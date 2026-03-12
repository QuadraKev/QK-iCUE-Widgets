# QK Binary Clock - iCUE Widget

The QuadraKev Binary Clock (QK Binary Clock) is a geeky binary time display for **Corsair pump LCD** and **Xeneon Edge** displays, built for iCUE's widget system. Shows the current time as illuminated dots in binary.

---

## How It Works

The widget runs entirely within iCUE with no external server or dependencies. The current time is displayed as binary patterns of lit and unlit dots. Two display modes are available:

### BCD Mode (Binary-Coded Decimal)

Each decimal digit of the time is shown as a separate column of dots. Hours, minutes, and (optionally) seconds each have two columns -- tens and ones. This is the traditional "binary clock" format.

For example, 14:37:52 displays as:

| | H tens | H ones | | M tens | M ones | | S tens | S ones |
|---|--------|--------|---|--------|--------|---|--------|--------|
| 8 | | O | | | O | | O | |
| 4 | | O | | | | | O | |
| 2 | | | | O | O | | | O |
| 1 | O | | | O | O | | | |

(O = lit, blank = unlit)

### True Binary Mode

Hours, minutes, and seconds are each shown as a single row of bits. Hours use 5 bits (0-23), minutes and seconds use 6 bits (0-59).

---

## Requirements

- Corsair iCUE (built and tested on 5.41.42)
- Corsair pump LCD or Xeneon Edge (or compatible dashboard LCD)

---

## Setup

**1. Install the widget in iCUE:**

- Download the widget files from the [Releases](https://github.com/QuadraKev/qk-binary-clock/releases) page.
- Copy the project folder into your iCUE widgets directory
  - Typically `C:\Program Files\Corsair\Corsair iCUE5 Software\widgets`
  - `QKBinaryClock.html`, `QKBinaryClock_translation.json` should be added to `\widgets`
  - `images\qk-binary-clock.svg` should be added to the `widgets\images` folder
- Add the widget to your pump LCD or Xeneon Edge dashboard in iCUE
- Restart iCUE for the new widget to appear in the widget picker

---

## Settings

| Setting | Description |
|---------|-------------|
| **Display Mode** | BCD (each digit separate) or True Binary (full number per row) |
| **Show Seconds** | Toggle the seconds columns/row |
| **Show Labels** | Toggle the H/M/S labels and decimal values |
| **Show Decimal Time** | Toggle the normal HH:MM:SS display below the binary grid |
| **Text Color** | Color for labels and decimal time |
| **Accent Color** | Color for the binary dots (default: green) |
| **Background Color** | Widget background color |
| **Transparency** | Background transparency |

---

## Display

- **BCD Mode** -- columns of circular dots, arranged left-to-right as H tens, H ones, M tens, M ones, (S tens, S ones). Colon separators between hour/minute/second groups.
- **True Binary Mode** -- horizontal rows of square bits, one row per time component (H, M, S). Decimal values shown at the end of each row.
- **Decimal Time** -- optional normal time display below the binary grid for reference.

---

## Layout

On the pump LCD, the BCD mode fits naturally in the circular viewport with the dot columns centered. On the Xeneon Edge, the grid scales to fill available space. Portrait orientations rotate the BCD grid to horizontal rows.

---

## Tips

- Turn off "Show Decimal Time" and "Show Labels" for a pure binary display that only makes sense if you can read binary
- The green-on-dark default color scheme gives a classic hacker/terminal aesthetic
- BCD mode is easier to read at a glance once you learn the column positions
- True Binary mode is more compact but requires mental conversion
