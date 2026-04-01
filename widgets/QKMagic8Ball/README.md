# QK Magic 8 Ball - iCUE Widget

The QuadraKev Magic 8 Ball (QK Magic 8 Ball) is a fortune-telling widget for **Corsair pump LCD** and **Xeneon Edge** displays, built for iCUE's widget system. Displays the classic 20 Magic 8 Ball answers on a rotating cycle.

---

## How It Works

The widget runs entirely within iCUE with no external server or dependencies. A new random answer appears at a configurable interval (default: every 10 seconds), with a smooth fade transition between answers.

Uses all 20 classic Magic 8 Ball responses:
- **10 affirmative** ("It is certain", "Yes definitely", etc.)
- **5 non-committal** ("Reply hazy, try again", "Ask again later", etc.)
- **5 negative** ("Don't count on it", "Very doubtful", etc.)

An optional category indicator shows the answer type using colored symbols (green triangle up for positive, orange circle for neutral, red triangle down for negative).

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
  - `QKMagic8Ball.html`, `QKMagic8Ball_translation.json` should be added to `\widgets`
  - `images\qk-magic-8-ball.svg` should be added to the `widgets\images` folder
- Add the widget to your pump LCD or Xeneon Edge dashboard in iCUE
- Restart iCUE for the new widget to appear in the widget picker

---

## Settings

| Setting | Description |
|---------|-------------|
| **Answer Interval** | Seconds between new answers (5-120, default: 10) |
| **Show Answer Type** | Toggle the colored category indicator below the answer |
| **Text Color** | Color for the answer text |
| **Accent Color** | Color for the inner circle (default: indigo) |
| **Background Color** | Widget background color |
| **Transparency** | Background transparency |

---

## Display

The widget shows a circular "8 ball" design with:
- An outer ring in the accent color
- An inner circle containing the current answer text
- A faint "8" watermark behind the answer
- An optional category indicator below the circle

On the pump LCD, the circular design naturally fits the round display viewport. On the Xeneon Edge, the layout adapts to the available slot size.

---

## Design Notes

Since the pump LCD has no touchscreen, the Magic 8 Ball cycles answers automatically on a timer rather than requiring user interaction. This makes it a "desk oracle" - glance at your pump cap to see the current fortune.

The answer interval is configurable from 5 seconds (fast cycling) to 2 minutes (slow, contemplative) to suit different preferences.
