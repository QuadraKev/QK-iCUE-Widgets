# QK Calculator - iCUE Dashboard Widget

A touchscreen calculator widget for the **Corsair Xeneon Edge**, built for iCUE's LCD widget system. Supports basic arithmetic with a clean, responsive button layout.

---

## How It Works

Tap the number and operator buttons to perform calculations. The display shows the current value with the previous expression above it. Supports addition, subtraction, multiplication, division, percentage, and sign toggle.

### Features

- Standard 4-function calculator (+, -, x, /)
- Percentage: calculates relative percent when chained with + or - (e.g., 100 + 10% = 110)
- Sign toggle (+/-)
- Expression history shown above the result
- Up to 15-digit precision with automatic scientific notation for large results
- Operator highlighting shows the active operation

---

## Requirements

- Corsair iCUE (built and tested on 5.41.42)
- Corsair Xeneon Edge (or compatible dashboard LCD with touchscreen)

---

## Setup

1. Download the widget files from the [Releases](https://github.com/QuadraKev/QK-iCUE-Widgets/releases) page.
2. Copy files into your iCUE widgets directory (typically `C:\Program Files\Corsair\Corsair iCUE5 Software\widgets`):
   - `QKCalculator.html` and `QKCalculator_translation.json` into `widgets\`
   - `qk-calculator.svg` into `widgets\images\`
3. Restart iCUE for the new widget to appear in the widget picker.
4. Add the widget to your Xeneon Edge dashboard in iCUE.

---

## Settings

| Setting | Description |
|---------|-------------|
| **Text Color** | Color for display numbers and button labels |
| **Accent Color** | Color for operator buttons and equals button |
| **Background Color** | Widget background color |
| **Transparency** | Background transparency (0-100%) |

---

## Layout

The widget adapts to all Xeneon Edge slot sizes across both orientations.

### Horizontal

- **S** (840x344): display on left, button grid on right
- **M** (840x696): display on top, full-width button grid below
- **L** (1688x696): display on left, button grid on right (constrained width for comfortable touch targets)
- **XL** (2536x696): same as L with more display space

### Vertical (Portrait)

- **S** (696x416): display on top, compact button grid below
- **M** (696x840): standard calculator layout, well-proportioned buttons
- **L** (696x1688): large display area, button grid anchored at bottom
- **XL** (696x2536): same as L with extended display area
