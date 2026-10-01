# QK Lava Lamp - iCUE Dashboard Widget

A realistic lava lamp for the **Corsair Xeneon Edge** touchscreen, built for iCUE's LCD widget system. Wax heats at the bottom and rises. It cools at the top and sinks back down. Along the way it merges and splits in a lit liquid. Drag a finger across the display to stir the wax.

---

## How It Works

A small physics simulation moves the wax. A pool of wax lies on the bottom. When the pool is hot, buds separate from it and rise. At the top the wax cools and sinks back, and the pool absorbs it. Blobs merge when they touch and split when they rise fast. A WebGL2 metaball shader draws the wax as one soft, translucent material.

Drag across the wax to stir it. A fast stroke through a blob cuts it in two. The current you make fades out over a few seconds, and the lamp returns to calm on its own.

### Features

- Two styles: **Fill** turns the whole widget into the lamp interior, **Lamp** shows a row of complete lava lamps
- Four color presets (Classic, Ocean, Violet, Jungle) and custom wax and liquid colors
- Heat setting for the pace of the cycle, Wax Amount setting for the number of blobs
- Drag to stir, with a fast stroke to split a blob
- Matte, translucent wax lit from the bulb below
- Rendering at native resolution, capped at 60 frames per second

---

## Requirements

- Corsair iCUE 5.45 or later
- Corsair Xeneon Edge (dashboard LCD)
- WebGL2 in the iCUE widget engine. Without it, the widget shows the liquid color only.

---

## Setup

1. Download `QKLavaLamp.icuewidget` from the [Releases](https://github.com/QuadraKev/QK-iCUE-Widgets/releases) page.
2. In iCUE, click **+** in the widget picker and choose the file. You can also double-click the file in Explorer.
3. Add the widget to your Xeneon Edge dashboard.

---

## Settings

| Setting | Description |
|---------|-------------|
| **Style** | Fill (default) or Lamp |
| **Colors** | Classic, Ocean, Violet, Jungle, or Custom |
| **Heat** | Pace of the cycle (1-10). Heat 1 is about a minute per rise, Heat 10 about five seconds |
| **Wax Amount** | Amount of wax (1-10). Low values give a few large blobs, high values give a crowd |
| **Custom Title** | Optional text at the top of the widget |
| **Background Image** | Image that shows through a transparent liquid or backdrop |
| **Glass Blur** | Blur for the background image (0-30) |
| **Text Color** | Color of the custom title |
| **Wax Color** | Wax color when Colors is Custom |
| **Liquid Color** | Liquid color when Colors is Custom, and the backdrop color in Lamp style |
| **Transparency** | Background opacity (100 is opaque). In Fill it applies to the liquid, in Lamp to the backdrop around the lamps |

With Custom Style off, the wax and liquid follow your device theme colors when Colors is Custom.

---

## Layout

Fill style fills every slot. Lamp style shows a row of lamps sized to the slot:

| Slot | Lamps |
|------|-------|
| HXL | 6 |
| HL, HS | 4 |
| HM, VS | 2 |
| VM, VL, VXL | 1 |

---

## Technical Notes

- The wax is a set of metaballs (Wyvill kernel) plus a capsule for the pool. One fragment shader pass draws all of it. The pass uses an analytic gradient for both the edge and the lighting.
- The simulation runs in fixed 1/60 s steps and conserves the wax volume exactly. Unit tests: `node tools/test-lava-lamp.js`.
- When the iCUE window is open on the desktop, a touch on the widget takes focus from the active application. No widget can prevent this.
