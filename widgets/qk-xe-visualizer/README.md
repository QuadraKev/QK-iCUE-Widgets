# QK XE Visualizer - iCUE Dashboard Media Visualizer

The QuadraKev Xeneon Edge (QK XE) Visualizer is a media visualizer widget for the **Corsair Xeneon Edge** touchscreen display, built for iCUE's LCD widget system. Displays real-time audio spectrum visualization alongside track info from whatever is currently playing on your PC.

![XL widget](.screenshots/horizontal-XL-actual.png)

---

## How It Works

The widget has two components:

- **`QKXEVisualizer.html`** - the iCUE widget itself, rendered on the Xeneon Edge LCD
- **`server/NowPlayingServer.py`** - a companion Python server that runs on your PC, capturing audio and media info and pushing it to the widget over WebSocket

The server captures system audio via **WASAPI loopback** (no microphone needed; it captures whatever is playing through your speakers/headphones), computes FFT spectrum data, and reads track info from **Windows SMTC** (the same metadata shown in the Windows volume overlay). Data is pushed to the widget at up to 60fps over a local WebSocket connection.

---

## Requirements

### Widget

- Corsair iCUE (built and tested on 5.41.42)
- Corsair Xeneon Edge (or compatible dashboard LCD display, if applicable)

### Server

- Windows 10/11

- Python 3.10+

- Dependencies:
  
  ```
  pip install PyAudioWPatch numpy websockets winrt-runtime winrt-Windows.Media.Control winrt-Windows.Storage.Streams
  ```

---

## Setup

Download the widget files from the [Releases](https://github.com/QuadraKev/qk-xe-visualizer/releases) page, or clone the repository.

**1. Install server dependencies:**

```
pip install PyAudioWPatch numpy websockets winrt-runtime winrt-Windows.Media.Control winrt-Windows.Storage.Streams
```

**2. Run the server:**

```
python NowPlayingServer.py
```

The server is shared with the [QK Pump Visualizer](https://github.com/QuadraKev/qk-pump-visualizer). A single instance serves both widgets, so there is no need to run it twice.

By default, it listens on port `16329`. You can change this with `--port`:

```
python NowPlayingServer.py --port 16329 --fps 60
```

**3. Install the widget in iCUE:**

- Copy the project folder into your iCUE widgets directory
  - Typically `C:\Program Files\Corsair\Corsair iCUE5 Software\widgets`
  - `QKXEVisualizer.html`, `QKXEVisualizer_translation.json` should be added to `\widgets`
  - `images\qk-visualizer.svg` should be added to the `widgets\images` folder
  - `server\NowPlayingServer.py `can be placed anywhere
- Add the widget to your Xeneon Edge dashboard in iCUE
- Restart iCUE for the new widget to appear in the widget picker

**4. Configure the widget** in iCUE settings. Set the Server Port to match what the server is using (default: `16329`).

---

## Widget Sizes

The widget adapts its layout to all iCUE dashboard sizes across both display orientations.

### Horizontal (2560x720)

| Size | Dimensions | Layout                                                                   |
| ---- | ---------- | ------------------------------------------------------------------------ |
| S    | 840x344    | Album art left, title/artist right, visualizer behind text               |
| M    | 840x696    | Album art as full background, visualizer overlay, media info bottom-left |
| L    | 1688x696   | Album art + info left column, visualizer right                           |
| XL   | 2536x696   | Album art + info left column, visualizer right (wider)                   |

![Horizontal S](.screenshots/horizontal-S-actual.png)
![Horizontal M](.screenshots/horizontal-M-actual.png)
![Horizontal L](.screenshots/horizontal-L-actual.png)
![Horizontal XL](.screenshots/horizontal-XL-actual.png)

### Vertical (720x2560)

| Size | Dimensions | Layout                                                                   |
| ---- | ---------- | ------------------------------------------------------------------------ |
| S    | 697x417    | Album art left, title/artist right, visualizer behind text               |
| M    | 697x836    | Album art as full background, visualizer overlay, media info bottom-left |
| L    | 697x1688   | Centered art, text below, vertical bars fill remaining height            |
| XL   | 697x2536   | Centered art, text below, vertical bars fill remaining height            |

<center>
<p>
<img src=".screenshots/vertical-S-actual.png" alt="Vertical S" height="500">
<img src=".screenshots/vertical-M-actual.png" alt="Vertical M" height="500">
<img src=".screenshots/vertical-L-actual.png" alt="Vertical L" height="500">
<img src=".screenshots/vertical-XL-actual.png" alt="Vertical XL" height="500">
</p>
</center>

---

## Settings

| Setting              | Description                                                              |
| -------------------- | ------------------------------------------------------------------------ |
| **Visualizer Style** | Bars, Wave, or Rings                                                     |
| **Bar Count**        | Number of frequency bars (8-64)                                          |
| **Sensitivity**      | Input gain for the visualizer                                            |
| **Frequency Scale**  | Linear or Logarithmic (log recommended)                                  |
| **Smoothing**        | Temporal smoothing (higher = smoother)                                   |
| **Cohesion**         | Spatial blur across bars (higher = more blended, especially in the bass) |
| **Mirror Mode**      | Mirror the visualizer vertically                                         |
| **Show Visualizer**  | Toggle the visualizer on/off                                             |
| **Show Media Info**  | Toggle track info display                                                |
| **Server Port**      | Port the companion server is running on (default: 16329)                 |
| **Text Color**       | Color for track info text                                                |
| **Accent Color**     | Color for the visualizer and status indicator                            |
| **Background Color** | Widget background color                                                  |
| **Transparency**     | Background transparency                                                  |

---

## Technical Details

### Audio Pipeline

- **WASAPI loopback** capture at the device's native sample rate (typically 48kHz)
- **Main FFT**: 1024-point Hanning-windowed FFT at full sample rate (~47Hz/bin at 48kHz)
- **Bass FFT**: Downsampled to ~4kHz with a 1024-point Hanning-windowed FFT, providing ~3.9Hz/bin resolution in the 10-2000Hz range
- Logarithmic frequency binning across four decades: 10-100Hz, 100-1kHz, 1-10kHz, 10-20kHz
- Bars below 2kHz use the high-resolution bass FFT; bars above use the main FFT
- Bass temporal dynamics are modulated by the main FFT's instantaneous energy for fast attack/decay
- Rolling-window peak normalization (10-second window) for adaptive loudness, with automatic reset on track changes

### Visualizer Pipeline (per frame)

1. Resample FFT bins to bar count using log-spaced interpolation
2. Apply dB amplitude scaling (-45dB floor)
3. Frequency-dependent spatial blur (Cohesion)
4. Temporal smoothing (lerp toward target)

### SMTC Media Info

Track title, artist, album, and album art are read from Windows Media Transport Controls, the same source used by the Windows volume overlay. Any app that integrates with SMTC (Spotify, browsers, Windows Media Player, etc.) will show up automatically.

---

## Server Options

```
python server/NowPlayingServer.py --help

  --port PORT     WebSocket server port (default: 16329)
  --fps FPS       Target push rate in frames/sec (default: 60)
  --test-media    Run a one-shot SMTC diagnostic and exit
```

The `--test-media` flag is useful for diagnosing media info issues:

```
python server/NowPlayingServer.py --test-media
```

---

## Troubleshooting

**"Server offline" shown in widget**

- Make sure `NowPlayingServer.py` is running
- Check that the Server Port setting matches the `--port` argument
- Firewall shouldn't be an issue since it's all localhost

**No audio visualization**

- Ensure something is actually playing audio
- Try increasing Sensitivity in the widget settings
- Check that PyAudioWPatch is installed: `pip install PyAudioWPatch`

**No media info (title/artist blank)**

- Run `python server/NowPlayingServer.py --test-media` to diagnose
- Make sure the playing app reports to Windows SMTC (check: does the Windows volume overlay show track info?)
- Install winrt packages: `pip install winrt-runtime winrt-Windows.Media.Control winrt-Windows.Storage.Streams`
