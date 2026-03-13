#!/usr/bin/env bash
#
# build-release.sh: Package all widgets into installable ZIPs.
#
# Scans widgets/ for directories containing QK*.html files,
# packages each into a ZIP, and builds an all-widgets bundle.
# Output goes to dist/.
#
# The release tag (e.g., v2026.03) is used in the bundle name.
# Individual widget ZIPs are named {widget}.zip (unversioned).
#
# Usage: ./tools/build-release.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$REPO_ROOT/dist"

rm -rf "$DIST"
mkdir -p "$DIST"

BUNDLE_DIR=$(mktemp -d)
COUNT=0

for WIDGET_DIR in "$REPO_ROOT"/widgets/qk-*/; do
    [ -d "$WIDGET_DIR" ] || continue

    # Skip directories without a widget HTML file
    ls "$WIDGET_DIR"/QK*.html >/dev/null 2>&1 || continue

    WIDGET=$(basename "$WIDGET_DIR")
    ZIP_NAME="${WIDGET}.zip"
    echo "Packaging $ZIP_NAME..."

    # Create a temp staging dir for this widget
    STAGE=$(mktemp -d)

    # Copy installable files: HTML, translation JSON, images/
    cp "$WIDGET_DIR"/QK*.html "$STAGE/" 2>/dev/null || true
    cp "$WIDGET_DIR"/QK*_translation.json "$STAGE/" 2>/dev/null || true
    if [ -d "$WIDGET_DIR/images" ]; then
        mkdir -p "$STAGE/images"
        cp "$WIDGET_DIR"/images/*.svg "$STAGE/images/" 2>/dev/null || true
    fi

    # Build per-widget ZIP
    (cd "$STAGE" && zip -r "$DIST/$ZIP_NAME" . -x ".*") > /dev/null

    # Also copy to bundle staging
    cp "$STAGE"/QK*.html "$BUNDLE_DIR/" 2>/dev/null || true
    cp "$STAGE"/QK*_translation.json "$BUNDLE_DIR/" 2>/dev/null || true
    if [ -d "$STAGE/images" ]; then
        mkdir -p "$BUNDLE_DIR/images"
        cp "$STAGE"/images/*.svg "$BUNDLE_DIR/images/" 2>/dev/null || true
    fi

    rm -rf "$STAGE"
    COUNT=$((COUNT + 1))
done

# Build all-widgets bundle
if [ "$(ls "$BUNDLE_DIR"/*.html 2>/dev/null | wc -l)" -gt 0 ]; then
    TAG="${GITHUB_REF_NAME:-$(date +%Y.%m)}"
    BUNDLE_NAME="all-widgets-${TAG}.zip"
    echo "Packaging $BUNDLE_NAME..."
    (cd "$BUNDLE_DIR" && zip -r "$DIST/$BUNDLE_NAME" . -x ".*") > /dev/null
fi

rm -rf "$BUNDLE_DIR"

# Package companion server as a ZIP
SERVER_DIR="$REPO_ROOT/widgets/qk-xe-visualizer/server"
if [ -f "$SERVER_DIR/NowPlayingServer.pyw" ]; then
    SERVER_STAGE=$(mktemp -d)
    cp "$SERVER_DIR"/NowPlayingServer.pyw "$SERVER_STAGE/"
    cp "$SERVER_DIR"/StartServer.bat "$SERVER_STAGE/" 2>/dev/null || true
    (cd "$SERVER_STAGE" && zip -r "$DIST/NowPlayingServer.zip" . -x ".*") > /dev/null
    rm -rf "$SERVER_STAGE"
    echo "Packaged NowPlayingServer.zip"
fi

echo ""
echo "Packaged $COUNT widgets."
echo "Release artifacts in $DIST/:"
ls -1 "$DIST/"
