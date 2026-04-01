"""
Simple HTTP server that receives API Probe results from the iCUE widget.
Run this, then load the ApiProbe widget in iCUE — it will auto-POST results.

Usage:
    python probe_server.py

Results are saved to probe-results.txt in the current directory.
"""

from http.server import BaseHTTPRequestHandler, HTTPServer


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        with open("probe-results.txt", "wb") as f:
            f.write(body)

        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(b"OK")
        print(f"\nSaved {length} bytes to probe-results.txt")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


if __name__ == "__main__":
    server = HTTPServer(("", 9876), Handler)
    print("Listening on http://localhost:9876")
    print("Load the ApiProbe widget in iCUE — results will auto-POST here.")
    print("Press Ctrl+C to stop.\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        server.server_close()
