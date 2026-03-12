# Corsair Pump LCD Visualizer - iCUE Dashboard Widget

The QuadraKev Pump (QK Pump) Visualizer is a circular audio visualizer widget for the **Corsair iCUE Dashboard**, designed specifically for pump LCD displays. Displays a real-time audio spectrum in a radial layout around (or over) album artwork, with track title and artist shown in the center.

---

## How It Works

The widget has two components:

- **`QKPumpVisualizer.html`** - the iCUE widget itself, rendered on the pump LCD
- **`server/NowPlayingServer.py`** - the companion Python server (shared with the [QK XE Visualizer](https://github.com/QuadraKev/qk-xe-visualizer)), which captures system audio and media metadata and pushes it to the widget over WebSocket

The server captures system audio via **WASAPI loopback** and computes a dual-resolution FFT spectrum (standard FFT for treble, downsampled high-resolution bass FFT for frequencies below 2kHz). Track info is read from **Windows SMTC**, the same source used by the Windows volume overlay. Data is pushed to the widget at up to 60fps.

---

## Requirements

### Widget

- Corsair iCUE (built and tested on 5.41.42)
- A Corsair device with a pump LCD

### Server

- Windows 10/11

- Python 3.10+

- Dependencies:

  ```
  pip install PyAudioWPatch numpy websockets winrt-runtime winrt-Windows.Media.Control winrt-Windows.Storage.Streams
  ```

---

## Setup

Download the widget files from the [Releases](https://github.com/QuadraKev/qk-pump-visualizer/releases) page, or clone the repository.

**1. Install server dependencies:**

```
pip install PyAudioWPatch numpy websockets winrt-runtime winrt-Windows.Media.Control winrt-Windows.Storage.Streams
```

**2. Run the server:**

```
python NowPlayingServer.py
```

The server is shared with the [QK XE Visualizer](https://github.com/QuadraKev/qk-xe-visualizer). A single instance serves both widgets, so there is no need to run it twice.

By default, it listens on port `16329`. You can change this with `--port`:

```
python NowPlayingServer.py --port 16329 --fps 60
```

**3. Install the widget in iCUE:**

- Copy the project folder into your iCUE widgets directory
  - Typically `C:\Program Files\Corsair\Corsair iCUE5 Software\widgets`
  - `QKPumpVisualizer.html`, `QKPumpVisualizer_translation.json` should be added to `\widgets`
  - `images\qk-pump-visualizer.svg` should be added to the `widgets\images` folder
  - `server\NowPlayingServer.py` can be placed anywhere
- Add the widget to your pump LCD device in iCUE
- Restart iCUE for the new widget to appear in the widget picker

**4. Configure the widget** in iCUE settings. Set the Server Port to match what the server is using (default: `16329`).

---

## Layout Modes

### Mode 1 - Outward Radial

Album art sits in a centered circle. The visualizer radiates outward from the art toward the edge of the display.

- **Bars** - individual bars pointing away from the art circle
- **Wave** - a smooth closed polar curve expanding outward from the art
- **Rings** - concentric rings filling the space between art and edge

### Mode 2 - Inward from Edge

Album art fills the entire circular display with layered overlays: album art in the back, a dim overlay for contrast, the visualizer on top of that, a radial gradient for text readability, and track info text in front.

- **Bars** - bars pointing inward from the display edge
- **Wave** - a closed polar wave that dips inward from the edge
- **Rings** - concentric rings spanning from center to edge

Both modes show track title and artist text centered on the display.

---

## Settings

| Setting | Description |
|---------|-------------|
| **Layout Mode** | Mode 1 (outward) or Mode 2 (inward from edge) |
| **Visualizer Style** | Bars, Wave, or Rings |
| **Bar Count** | Number of frequency bars (16-128) |
| **Sensitivity** | Input gain for the visualizer |
| **Smoothing** | Temporal smoothing (higher = smoother) |
| **Cohesion** | Spatial blur across bars |
| **Mirror Mode** | Mirror the visualizer symmetrically from 12 o'clock (Bars and Wave only) |
| **Show Album Art** | Toggle album art display |
| **Art Opacity** | Opacity of the album art (0-100%) |
| **Visualizer Opacity** | Opacity of the visualizer layer (0-100%) |
| **Show Media Info** | Toggle track title and artist display |
| **Server Port** | Port the companion server is running on (default: 16329) |
| **Accent Color** | Color for the visualizer |
| **Background Color** | Widget background color |
| **Text Color** | Color for track title and artist text |

---

## Companion Server

This widget uses the same Python server as the [QK XE Visualizer](https://github.com/QuadraKev/qk-xe-visualizer). See that project for full server documentation, including:

- Audio pipeline details (WASAPI loopback, dual-resolution FFT)
- SMTC media info integration
- Server CLI options (`--port`, `--fps`, `--test-media`)
- Troubleshooting

---

## Troubleshooting

**"Server offline" shown in widget**
- Make sure `NowPlayingServer.py` is running
- Check that the Server Port setting matches the `--port` argument

**No audio visualization**
- Ensure something is actually playing audio
- Try increasing Sensitivity in the widget settings

**No media info (title/artist blank)**
- Run `python server/NowPlayingServer.py --test-media` to diagnose
- Make sure the playing app reports to Windows SMTC
