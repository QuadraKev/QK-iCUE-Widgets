# QK Day Progress - iCUE Widget

Shows how much of the current day, week, month, and year has elapsed as progress bars. Designed for both the **Corsair pump LCD** and **Xeneon Edge** displays.

---

## How It Works

The widget calculates elapsed time as a percentage for four time periods and displays each as a horizontal progress bar with percentage and detail text.

On the pump LCD (1:1 circular display), the widget switches to a concentric ring display showing all enabled progress levels as nested circular arcs, with the day percentage prominently centered.

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
  - `QKDayProgress.html`, `QKDayProgress_translation.json` should be added to `\widgets`
  - `images\qk-day-progress.svg` should be added to the `widgets\images` folder
- Add the widget to your pump LCD or Xeneon Edge dashboard in iCUE
- Restart iCUE for the new widget to appear in the widget picker

---

## Settings

| Setting | Description |
|---------|-------------|
| **Show Day Progress** | Toggle the daily progress bar (hours elapsed out of 24) |
| **Show Week Progress** | Toggle the weekly progress bar (days elapsed out of 7) |
| **Show Month Progress** | Toggle the monthly progress bar (days elapsed in current month) |
| **Show Year Progress** | Toggle the yearly progress bar (days elapsed in current year) |
| **Show Percentage** | Toggle the percentage number next to each bar |
| **Text Color** | Color for labels and detail text |
| **Accent Color** | Color for progress bar fills and percentages |
| **Background Color** | Widget background color |
| **Transparency** | Background transparency |

---

## Display

- **XE Horizontal** -- Two-column layout with progress bars side by side for wider slots, single column for narrower ones.
- **Pump LCD** -- Concentric ring arcs: year on the outside, day on the inside. Day percentage shown in the center.
- **XE Portrait** -- Single column of progress bars.

---

## Tips

- Disable week/month/year to use it as a simple "day completion" meter
- The purple accent color pairs well with dark backgrounds for a clean look
- Progress updates every 30 seconds to stay current without excessive CPU use
