# QK Tally Counter - iCUE Widget

A simple tap-to-count widget for the **Xeneon Edge** dashboard. Tap + to increment, - to decrement. Great for tracking reps, laps, scores, or any count.

---

## How It Works

The widget displays a large number in the center with + and - buttons on either side. Tap the buttons to change the count by the configured step size. A small Reset button at the bottom clears the count to zero.

---

## Requirements

- Corsair iCUE (built and tested on 5.41.42)
- Xeneon Edge (or compatible dashboard LCD with touch input)

---

## Setup

**1. Install the widget in iCUE:**

- Download the widget files from the [Releases](https://github.com/QuadraKev/qk-tally-counter/releases) page.
- Copy the project folder into your iCUE widgets directory
  - Typically `C:\Program Files\Corsair\Corsair iCUE5 Software\widgets`
  - `QKTallyCounter.html`, `QKTallyCounter_translation.json` should be added to `\widgets`
  - `images\qk-tally-counter.svg` should be added to the `widgets\images` folder
- Add the widget to your Xeneon Edge dashboard in iCUE
- Restart iCUE for the new widget to appear in the widget picker

---

## Settings

| Setting | Description |
|---------|-------------|
| **Counter Label** | Optional label shown above the number (e.g., "Push-ups") |
| **Step Size** | How much each tap adds/subtracts (1 to 100) |
| **Allow Negative** | Whether the counter can go below zero |
| **Text Color** | Color for the counter number |
| **Accent Color** | Color for the + button and label |
| **Background Color** | Widget background color |
| **Transparency** | Background transparency |

---

## Display

- **Horizontal** -- Minus button on the left, large counter in the center, plus button on the right. Reset button at the bottom center.
- **Portrait** -- Plus button on top, counter in the middle, minus button at the bottom.

---

## Touch Targets

- The + and - buttons span 20% of the widget width (horizontal) or height (portrait), providing large tap areas well above the 10mm minimum
- The Reset button meets minimum touch target sizing

---

## Tips

- Set Step Size to 5 or 10 for counting by multiples
- Use a custom label to track specific activities during gaming sessions
- The count auto-scales its font when numbers get large (6+ digits)
- Enable "Allow Negative" for tracking positive/negative differentials
