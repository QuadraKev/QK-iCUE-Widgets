# QK World Clocks - iCUE Dashboard Widget

The QuadraKev World Clocks (QK World Clocks) is a multi-timezone clock display for the **Corsair Xeneon Edge** dashboard LCD, built for iCUE's widget system. Show up to 4 clocks side by side, each set to a different timezone.

---

## How It Works

The widget runs entirely within iCUE with no external server or dependencies. Configure up to 4 named clocks, each with its own IANA timezone identifier. Clocks with blank labels are hidden, so you can show 1, 2, 3, or 4 clocks as needed.

Uses `Intl.DateTimeFormat` for timezone conversion, which supports all standard IANA timezone identifiers (e.g., `America/New_York`, `Europe/London`, `Asia/Tokyo`).

---

## Requirements

- Corsair iCUE (built and tested on 5.41.42)
- Corsair Xeneon Edge (or compatible dashboard LCD display)

---

## Setup

**1. Install the widget in iCUE:**

- Download the widget files from the [Releases](https://github.com/QuadraKev/qk-world-clocks/releases) page.
- Copy the project folder into your iCUE widgets directory
  - Typically `C:\Program Files\Corsair\Corsair iCUE5 Software\widgets`
  - `QKWorldClocks.html`, `QKWorldClocks_translation.json` should be added to `\widgets`
  - `images\qk-world-clocks.svg` should be added to the `widgets\images` folder
- Add the widget to your Xeneon Edge dashboard in iCUE
- Restart iCUE for the new widget to appear in the widget picker

**2. Configure timezones** in widget settings using IANA timezone identifiers.

---

## Settings

| Setting | Description |
|---------|-------------|
| **Time Format** | 12-hour or 24-hour display |
| **Show Seconds** | Toggle seconds in the time display |
| **Show Date** | Toggle the date line below each clock |
| **Clock 1-4 Label** | Display name for each clock (leave blank to hide) |
| **Clock 1-4 Timezone** | IANA timezone identifier (leave blank for local time) |
| **Text Color** | Color for time digits and date text |
| **Accent Color** | Color for city labels and AM/PM indicators |
| **Background Color** | Widget background color |
| **Transparency** | Background transparency |

---

## Timezone Examples

| City | Timezone ID |
|------|-------------|
| New York | `America/New_York` |
| Los Angeles | `America/Los_Angeles` |
| Chicago | `America/Chicago` |
| London | `Europe/London` |
| Paris | `Europe/Paris` |
| Berlin | `Europe/Berlin` |
| Tokyo | `Asia/Tokyo` |
| Shanghai | `Asia/Shanghai` |
| Sydney | `Australia/Sydney` |
| Dubai | `Asia/Dubai` |
| Mumbai | `Asia/Kolkata` |
| Sao Paulo | `America/Sao_Paulo` |

A full list is available at: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

---

## Layout

The widget adapts to all Xeneon Edge dashboard sizes:

- **Wide layouts** (S, L, XL horizontal) -- clocks side by side in a row
- **Square layouts** (M horizontal) -- clocks in a 2x2 grid
- **Portrait layouts** (vertical orientation) -- clocks stacked vertically

Each clock shows a day difference indicator ("Yesterday" / "Tomorrow") when the timezone date differs from local time.

---

## Troubleshooting

**Clock shows "--:--" with "Invalid timezone"**
- The timezone identifier is not recognized. Check spelling and use the IANA format (e.g., `America/New_York`, not `EST` or `Eastern`).

**Only 1-2 clocks showing**
- Clocks with blank labels are hidden. Set a label for each clock you want to display.
