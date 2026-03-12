"""
Now Playing Companion Server for iCUE Widget
=============================================
Captures system audio via WASAPI loopback, reads track info via Windows SMTC,
and pushes FFT + media data to the widget over WebSocket.

Dependencies:
    pip install PyAudioWPatch numpy websockets winrt-runtime winrt-Windows.Media.Control winrt-Windows.Storage.Streams

Usage:
    python NowPlayingServer.py [--port 16329] [--fps 60]

Endpoints (single port):
    WebSocket  ws://localhost:16329     — pushes JSON {fft, media} at ~60fps
    HTTP GET   /art                     — returns album art image bytes
"""

import argparse
import asyncio
import base64
import collections
import json
import logging
import threading
import time
from http import HTTPStatus

import numpy as np

# Detect websockets API version (13+ changed process_request signature)
_ws_new_api = False
try:
    from websockets.http11 import Response as _WsResponse
    from websockets.datastructures import Headers as _WsHeaders
    _ws_new_api = True
except ImportError:
    _WsResponse = None
    _WsHeaders = None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("NowPlaying")


def _detect_image_type(data):
    """Detect image content type from magic bytes."""
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:4] == b"RIFF":
        return "image/webp"
    return "image/png"


# ---------------------------------------------------------------------------
# Audio capture (WASAPI loopback via PyAudioWPatch)
# ---------------------------------------------------------------------------

class AudioCapture:
    """Captures system audio via WASAPI loopback and provides raw FFT spectrum."""

    BASS_TARGET_RATE = 4000  # Downsample target for bass FFT
    BASS_CHUNK = 1024        # FFT size for bass (gives ~3.9 Hz/bin at 4kHz)
    PEAK_WINDOW_SECS = 10    # Rolling peak window duration

    def __init__(self):
        self._lock = threading.Lock()
        self._spectrum = []
        self._bass_spectrum = []
        self._stream = None
        self._pa = None
        self._running = False
        self._sample_rate = 48000
        self._chunk = 1024
        self._bass_rate = self.BASS_TARGET_RATE
        self._bass_accum = np.array([], dtype=np.float32)
        self._decimate_factor = 1
        # Precomputed windows (set in _run_capture once chunk size is known)
        self._main_window = None
        self._bass_window = np.hanning(self.BASS_CHUNK)
        # Rolling peak window for normalization
        self._peak_history = collections.deque()
        self._bass_peak_history = collections.deque()

    @property
    def spectrum(self):
        with self._lock:
            return list(self._spectrum)

    @property
    def bass_spectrum(self):
        with self._lock:
            return list(self._bass_spectrum)

    @property
    def sample_rate(self):
        return self._sample_rate

    @property
    def bass_sample_rate(self):
        return self._bass_rate

    def start(self):
        """Start audio capture in a background thread."""
        self._running = True
        t = threading.Thread(target=self._capture_loop, daemon=True)
        t.start()

    def reset_peaks(self):
        """Clear rolling peak history (call on track change)."""
        self._peak_history.clear()
        self._bass_peak_history.clear()

    def stop(self):
        self._running = False
        if self._stream:
            try:
                self._stream.stop_stream()
                self._stream.close()
            except Exception:
                pass
        if self._pa:
            try:
                self._pa.terminate()
            except Exception:
                pass

    def _find_loopback_device(self, pa):
        """Find the WASAPI loopback device for the default output."""
        try:
            default = pa.get_default_wasapi_loopback()
            if default:
                return default
        except Exception:
            pass

        # Fallback: scan for any loopback device
        for i in range(pa.get_device_count()):
            try:
                info = pa.get_device_info_by_index(i)
                if info.get("isLoopbackDevice", False):
                    return info
            except Exception:
                continue
        return None

    def _capture_loop(self):
        """Main capture loop — runs in a background thread."""
        while self._running:
            try:
                self._run_capture()
            except Exception as e:
                log.warning(f"Audio capture error: {e}")
                if self._running:
                    time.sleep(2)

    def _run_capture(self):
        import pyaudiowpatch as pyaudio

        self._pa = pyaudio.PyAudio()
        device = self._find_loopback_device(self._pa)

        if not device:
            log.warning("No WASAPI loopback device found — sending silent spectrum")
            while self._running:
                time.sleep(1)
            return

        self._sample_rate = int(device["defaultSampleRate"])
        channels = int(device["maxInputChannels"])
        log.info(
            f"Audio: {device['name']} @ {self._sample_rate}Hz, {channels}ch, "
            f"chunk={self._chunk}"
        )

        # Compute decimation factor for bass FFT
        self._decimate_factor = max(1, self._sample_rate // self.BASS_TARGET_RATE)
        self._bass_rate = self._sample_rate // self._decimate_factor
        bass_raw_needed = self.BASS_CHUNK * self._decimate_factor
        self._bass_accum = np.array([], dtype=np.float32)
        log.info(
            f"Bass FFT: decimate {self._decimate_factor}x → {self._bass_rate}Hz, "
            f"need {bass_raw_needed} samples/FFT ({self.BASS_CHUNK} bins, "
            f"~{self._bass_rate / self.BASS_CHUNK:.1f} Hz/bin)"
        )

        # Precompute main FFT window (Hanning × exponential ramp)
        hanning = np.hanning(self._chunk)
        ramp = np.exp(np.linspace(-8, 0, self._chunk))
        self._main_window = hanning * ramp

        self._stream = self._pa.open(
            format=pyaudio.paInt16,
            channels=channels,
            rate=self._sample_rate,
            input=True,
            input_device_index=device["index"],
            frames_per_buffer=self._chunk,
        )

        while self._running:
            try:
                data = self._stream.read(self._chunk, exception_on_overflow=False)
            except Exception:
                break

            samples = np.frombuffer(data, dtype=np.int16).astype(np.float32)

            # Stereo to mono
            if channels >= 2:
                samples = samples.reshape(-1, channels).mean(axis=1)

            # Asymmetric window: Hanning × exponential ramp for fast
            # temporal response (recency-biased)
            spectrum = np.abs(np.fft.rfft(samples * self._main_window))

            # Rolling-window normalization: track peaks over the last N
            # seconds and normalize against the max, so the visualizer
            # adapts slowly to volume changes instead of per-frame.
            now = time.monotonic()
            frame_peak = spectrum.max() if len(spectrum) > 0 else 0.0
            self._peak_history.append((now, frame_peak))
            cutoff = now - self.PEAK_WINDOW_SECS
            while self._peak_history and self._peak_history[0][0] < cutoff:
                self._peak_history.popleft()
            rolling_peak = max(p for _, p in self._peak_history) if self._peak_history else 1.0
            if rolling_peak > 0:
                spectrum = spectrum / rolling_peak

            with self._lock:
                self._spectrum = np.round(spectrum, 4).tolist()

            # Bass FFT: accumulate mono samples in ring buffer,
            # decimate and FFT when enough have been collected.
            bass_buf = self._bass_accum
            bass_buf = np.concatenate([bass_buf, samples])
            if len(bass_buf) > bass_raw_needed * 2:
                bass_buf = bass_buf[-bass_raw_needed:]
            self._bass_accum = bass_buf

            if len(bass_buf) >= bass_raw_needed:
                bass_raw = bass_buf[-bass_raw_needed:]
                # Decimate: reshape into groups and average (acts as low-pass)
                df = self._decimate_factor
                bass_decimated = bass_raw.reshape(
                    self.BASS_CHUNK, df
                ).mean(axis=1)

                # Pure Hanning window for tight frequency peaks. Temporal
                # responsiveness comes from the main FFT's bassEnvelope
                # multiplier on the widget side, so no ramp needed here.
                bass_fft = np.abs(np.fft.rfft(bass_decimated * self._bass_window))
                bass_frame_peak = bass_fft.max() if len(bass_fft) > 0 else 0.0
                now_bass = time.monotonic()
                self._bass_peak_history.append((now_bass, bass_frame_peak))
                cutoff_bass = now_bass - self.PEAK_WINDOW_SECS
                while self._bass_peak_history and self._bass_peak_history[0][0] < cutoff_bass:
                    self._bass_peak_history.popleft()
                bass_rolling_peak = max(p for _, p in self._bass_peak_history) if self._bass_peak_history else 1.0
                if bass_rolling_peak > 0:
                    bass_fft = bass_fft / bass_rolling_peak

                with self._lock:
                    self._bass_spectrum = np.round(bass_fft, 4).tolist()


# ---------------------------------------------------------------------------
# SMTC media info (Windows Media Transport Controls)
# ---------------------------------------------------------------------------

class MediaInfo:
    """Reads track info from Windows SMTC."""

    def __init__(self):
        self._lock = threading.Lock()
        self._title = ""
        self._artist = ""
        self._album = ""
        self._playing = False
        self._art_bytes = b""
        self._art_data_url = ""
        self._art_version = 0  # increments on each art change
        self._track_changed = False  # set when title changes
        self._last_title = ""
        self._available = False
        self._error_count = 0
        self._smtc_module = False
        self._SessionManager = None
        self._PlaybackStatus = None

        # Try to import winrt SMTC modules at init time
        try:
            from winrt.windows.media.control import (
                GlobalSystemMediaTransportControlsSessionManager,
                GlobalSystemMediaTransportControlsSessionPlaybackStatus,
            )
            self._SessionManager = GlobalSystemMediaTransportControlsSessionManager
            self._PlaybackStatus = GlobalSystemMediaTransportControlsSessionPlaybackStatus
            self._smtc_module = True
            log.info("SMTC: winrt modules loaded OK")
        except ImportError as e:
            log.warning(
                f"SMTC: winrt import failed ({e}). Media info will be empty.\n"
                f"       Install with: pip install winrt-runtime "
                f"winrt-Windows.Media.Control winrt-Windows.Storage.Streams"
            )
        except Exception as e:
            log.warning(f"SMTC: Unexpected import error: {type(e).__name__}: {e}")

    def consume_track_changed(self):
        """Return True if track changed since last call, and reset the flag."""
        with self._lock:
            if self._track_changed:
                self._track_changed = False
                return True
            return False

    @property
    def data(self):
        with self._lock:
            return {
                "title": self._title,
                "artist": self._artist,
                "album": self._album,
                "playing": self._playing,
            }

    @property
    def art_bytes(self):
        with self._lock:
            return self._art_bytes

    @property
    def art_data_url(self):
        with self._lock:
            return self._art_data_url

    @property
    def art_version(self):
        with self._lock:
            return self._art_version

    def _update_art(self, art_bytes):
        """Store new art bytes and compute base64 data URL."""
        content_type = _detect_image_type(art_bytes)
        data_url = f"data:{content_type};base64,{base64.b64encode(art_bytes).decode()}"
        with self._lock:
            self._art_bytes = art_bytes
            self._art_data_url = data_url
            self._art_version += 1

    def _clear_art(self):
        with self._lock:
            self._art_bytes = b""
            self._art_data_url = ""
            self._art_version += 1

    async def startup_test(self):
        """Run a single SMTC read at startup and report the result."""
        if not self._smtc_module:
            log.info("SMTC startup test: SKIPPED (winrt not available)")
            return

        log.info("SMTC startup test: Querying media sessions...")
        try:
            manager = await asyncio.wait_for(
                self._SessionManager.request_async(), timeout=5.0
            )
            session = manager.get_current_session()
            if not session:
                log.info("SMTC startup test: No active media session found.")
                log.info("  (Play something in Spotify/browser/etc, and it will appear)")
                return

            info = await asyncio.wait_for(
                session.try_get_media_properties_async(), timeout=5.0
            )
            title = info.title or "(empty)"
            artist = info.artist or "(empty)"
            album = info.album_title or "(empty)"

            pb = session.get_playback_info()
            status = "PLAYING" if (
                pb.playback_status == self._PlaybackStatus.PLAYING
            ) else "PAUSED/STOPPED"

            log.info(f"SMTC startup test: SUCCESS")
            log.info(f"  Title:  {title}")
            log.info(f"  Artist: {artist}")
            log.info(f"  Album:  {album}")
            log.info(f"  Status: {status}")
            log.info(f"  Art:    {'yes' if info.thumbnail else 'no'}")

            # Apply the data immediately so widget gets it right away
            with self._lock:
                self._title = info.title or ""
                self._artist = info.artist or ""
                self._album = info.album_title or ""
                self._playing = (
                    pb.playback_status == self._PlaybackStatus.PLAYING
                )
            self._available = True

        except asyncio.TimeoutError:
            log.warning("SMTC startup test: TIMED OUT (winrt async hung)")
            log.warning("  This can happen on some Python/winrt versions.")
            log.warning("  Media info will be unavailable.")
        except Exception as e:
            log.warning(f"SMTC startup test: FAILED — {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()

    async def poll(self):
        """Poll SMTC for current media info. Call periodically (~1s)."""
        if not self._smtc_module:
            return

        try:
            manager = await asyncio.wait_for(
                self._SessionManager.request_async(), timeout=5.0
            )
            session = manager.get_current_session()

            if not session:
                if self._available:
                    self._available = False
                    log.info("SMTC: No active media session")
                with self._lock:
                    self._title = ""
                    self._artist = ""
                    self._album = ""
                    self._playing = False
                return

            # Media properties
            info = await asyncio.wait_for(
                session.try_get_media_properties_async(), timeout=5.0
            )
            title = info.title or ""
            artist = info.artist or ""
            album = info.album_title or ""

            # Playback status
            pb = session.get_playback_info()
            playing = (
                pb.playback_status == self._PlaybackStatus.PLAYING
            )

            # Album art — only re-read when title changes
            if title != self._last_title:
                if info.thumbnail:
                    try:
                        stream_ref = info.thumbnail
                        stream = await asyncio.wait_for(
                            stream_ref.open_read_async(), timeout=5.0
                        )
                        size = stream.size
                        from winrt.windows.storage.streams import (
                            DataReader,
                        )
                        reader = DataReader(stream)
                        await asyncio.wait_for(
                            reader.load_async(size), timeout=5.0
                        )
                        try:
                            buf = reader.read_buffer(size)
                            art = bytes(buf)
                        except (TypeError, ValueError):
                            data = bytearray(size)
                            reader.read_bytes(data)
                            art = bytes(data)
                        self._update_art(art)
                        log.info(f"SMTC: Album art updated ({len(art)} bytes)")
                    except Exception as e:
                        log.warning(f"SMTC: Art read error: {type(e).__name__}: {e}")
                else:
                    self._clear_art()
                self._last_title = title
                with self._lock:
                    self._track_changed = True

            with self._lock:
                self._title = title
                self._artist = artist
                self._album = album
                self._playing = playing

            if not self._available:
                self._available = True
                log.info(f"SMTC: Now tracking: {artist} — {title}")

            # Reset error tracking on success
            if self._error_count > 0:
                log.info(f"SMTC: Recovered after {self._error_count} errors")
                self._error_count = 0

        except asyncio.TimeoutError:
            self._error_count += 1
            if self._error_count == 1 or self._error_count % 30 == 0:
                log.warning(
                    f"SMTC: Poll timed out ({self._error_count}x) — "
                    f"winrt async call hung for >5s"
                )

        except Exception as e:
            self._error_count += 1
            err_msg = f"{type(e).__name__}: {e}"
            # Log first error, then every 30th to avoid spam
            if self._error_count == 1 or self._error_count % 30 == 0:
                log.warning(
                    f"SMTC: Poll error ({self._error_count}x): {err_msg}"
                )
                if self._error_count == 1:
                    import traceback
                    traceback.print_exc()


# ---------------------------------------------------------------------------
# WebSocket + HTTP server
# ---------------------------------------------------------------------------

class NowPlayingServer:
    """WebSocket server that pushes FFT + media data, serves album art over HTTP."""

    def __init__(self, port=16329, fps=60):
        self.port = port
        self.fps = fps
        self.audio = AudioCapture()
        self.media = MediaInfo()
        self._clients = set()

    async def _handle_http(self, arg1, arg2):
        """Serve album art via HTTP GET /art on the same port as WebSocket.

        Compatible with both websockets 10-12 (legacy) and 13+ (new) APIs:
          - Legacy: process_request(path: str, headers)
          - New:    process_request(connection, request)  [request.path]
        """
        if _ws_new_api:
            path = arg2.path  # arg2 is Request object
        else:
            path = arg1  # arg1 is path string

        if not path.startswith("/art"):
            return None

        art = self.media.art_bytes
        content_type = _detect_image_type(art) if art else "image/png"

        if _ws_new_api:
            # websockets 13+: return Response object
            if art:
                return _WsResponse(
                    200, "OK",
                    _WsHeaders({
                        "Content-Type": content_type,
                        "Access-Control-Allow-Origin": "*",
                        "Cache-Control": "no-cache",
                    }),
                    art,
                )
            return _WsResponse(
                204, "No Content",
                _WsHeaders({"Access-Control-Allow-Origin": "*"}),
                b"",
            )
        else:
            # websockets 10-12: return (status, headers_dict, body) tuple
            if art:
                return (
                    HTTPStatus.OK,
                    {
                        "Content-Type": content_type,
                        "Access-Control-Allow-Origin": "*",
                        "Cache-Control": "no-cache",
                    },
                    art,
                )
            return (
                HTTPStatus.NO_CONTENT,
                {"Access-Control-Allow-Origin": "*"},
                b"",
            )

    async def _handler(self, websocket):
        """Handle a single WebSocket client connection."""
        self._clients.add(websocket)
        remote = websocket.remote_address
        log.info(f"Client connected: {remote[0]}:{remote[1]}")
        try:
            # Send current album art immediately on connect
            art_url = self.media.art_data_url
            if art_url:
                await websocket.send(json.dumps({
                    "type": "art", "artUrl": art_url
                }))
            async for _ in websocket:
                pass  # We only push data, ignore incoming messages
        except Exception:
            pass
        finally:
            self._clients.discard(websocket)
            log.info(f"Client disconnected: {remote[0]}:{remote[1]}")

    async def _push_loop(self):
        """Push FFT + media data to all connected clients at target FPS."""
        interval = 1.0 / self.fps
        push_count = 0
        status_interval = self.fps * 60  # log status every ~60 seconds
        while True:
            if self._clients:
                media = self.media.data
                bass = self.audio.bass_spectrum
                payload_dict = {
                    "fft": self.audio.spectrum,
                    "media": media,
                    "sampleRate": self.audio.sample_rate,
                }
                if bass:
                    payload_dict["bassFFT"] = bass
                    payload_dict["bassSampleRate"] = self.audio.bass_sample_rate
                payload = json.dumps(payload_dict)
                dead = set()
                for ws in self._clients.copy():
                    try:
                        await ws.send(payload)
                    except Exception:
                        dead.add(ws)
                self._clients -= dead

                # Periodic status log so user can see what's being sent
                push_count += 1
                if push_count == 1 or push_count % status_interval == 0:
                    t = media.get("title", "") or "(none)"
                    a = media.get("artist", "") or "(none)"
                    p = "playing" if media.get("playing") else "paused"
                    log.info(
                        f"Pushing to {len(self._clients)} client(s) — "
                        f"Media: {a} — {t} [{p}]"
                    )

            await asyncio.sleep(interval)

    async def _broadcast_art(self):
        """Send album art data URL to all connected clients."""
        art_url = self.media.art_data_url
        msg = json.dumps({"type": "art", "artUrl": art_url})
        for ws in self._clients.copy():
            try:
                await ws.send(msg)
            except Exception:
                pass
        if art_url:
            log.info(f"Broadcast art to {len(self._clients)} client(s)")

    async def _media_poll_loop(self):
        """Poll SMTC every ~1 second. Broadcast art when it changes."""
        last_art_version = self.media.art_version
        while True:
            await self.media.poll()
            # Reset rolling peak history on track change so the
            # visualizer adapts quickly to the new track's levels
            if self.media.consume_track_changed():
                self.audio.reset_peaks()
                log.info("Rolling peak history reset (track changed)")
            # Check if art changed since last poll
            current_art_version = self.media.art_version
            if current_art_version != last_art_version and self._clients:
                await self._broadcast_art()
                last_art_version = current_art_version
            await asyncio.sleep(1.0)

    async def run(self):
        """Start everything and run forever."""
        # Run SMTC startup diagnostic
        await self.media.startup_test()

        # Start audio capture thread
        self.audio.start()
        log.info(f"Audio capture started (raw FFT, {self.audio.sample_rate}Hz)")

        import websockets

        server = await websockets.serve(
            self._handler,
            "localhost",
            self.port,
            process_request=self._handle_http,
        )
        log.info(f"Server listening on ws://localhost:{self.port}")
        log.info(f"Album art at http://localhost:{self.port}/art")
        log.info(f"Target FPS: {self.fps}")

        await asyncio.gather(
            self._push_loop(),
            self._media_poll_loop(),
            server.wait_closed() if hasattr(server, 'wait_closed') else asyncio.Future(),
        )


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

async def test_media():
    """One-shot SMTC diagnostic — prints media info and exits."""
    print("\n  SMTC Media Diagnostic\n  =====================\n")
    media = MediaInfo()
    if not media._smtc_module:
        print("  RESULT: winrt modules not available. Install with:")
        print("    pip install winrt-runtime winrt-Windows.Media.Control winrt-Windows.Storage.Streams")
        return

    print("  winrt modules loaded OK. Querying SMTC...\n")
    try:
        manager = await asyncio.wait_for(
            media._SessionManager.request_async(), timeout=5.0
        )
        session = manager.get_current_session()

        if not session:
            print("  RESULT: No active media session found.")
            print("  Make sure something is playing in Spotify, a browser, etc.")
            print("  (Check: does the Windows volume overlay show track info?)")
            return

        info = await asyncio.wait_for(
            session.try_get_media_properties_async(), timeout=5.0
        )
        pb = session.get_playback_info()

        print(f"  Title:    {info.title or '(empty)'}")
        print(f"  Artist:   {info.artist or '(empty)'}")
        print(f"  Album:    {info.album_title or '(empty)'}")
        print(f"  Status:   {pb.playback_status}")
        print(f"  Thumb:    {'yes' if info.thumbnail else 'no'}")

        # List all sessions
        sessions = manager.get_sessions()
        print(f"\n  Total SMTC sessions: {sessions.size}")
        for i in range(sessions.size):
            s = sessions.get_at(i)
            print(f"    [{i}] {s.source_app_user_model_id}")

        print("\n  RESULT: SMTC is working! Media info should appear in the widget.")

    except asyncio.TimeoutError:
        print("  RESULT: TIMED OUT — winrt async call hung.")
        print("  This can happen with certain Python/winrt version combos.")
        print("  Try: pip install --upgrade winrt-runtime winrt-Windows.Media.Control")
    except Exception as e:
        print(f"  RESULT: SMTC query failed — {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


def main():
    parser = argparse.ArgumentParser(
        description="Now Playing companion server for iCUE widget"
    )
    parser.add_argument(
        "--port", type=int, default=16329, help="Server port (default: 16329)"
    )
    parser.add_argument(
        "--fps", type=int, default=60, help="Target push rate (default: 60)"
    )
    parser.add_argument(
        "--test-media", action="store_true",
        help="Test SMTC media detection and exit (no server started)"
    )
    args = parser.parse_args()

    if args.test_media:
        asyncio.run(test_media())
        return

    print(
        f"\n  Now Playing Server\n"
        f"  ==================\n"
        f"  Port:    {args.port}\n"
        f"  FPS:     {args.fps}\n"
        f"  WebSocket: ws://localhost:{args.port}\n"
        f"  Album Art: http://localhost:{args.port}/art\n"
    )

    server = NowPlayingServer(port=args.port, fps=args.fps)
    try:
        asyncio.run(server.run())
    except KeyboardInterrupt:
        print("\nStopped.")
        server.audio.stop()


if __name__ == "__main__":
    main()
