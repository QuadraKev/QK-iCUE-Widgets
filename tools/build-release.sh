#!/usr/bin/env bash
#
# build-release.sh: Package release-ready widgets into installable ZIPs.
#
# Reads widgets.csv, builds one ZIP per release-ready widget plus an
# all-widgets bundle. Output goes to dist/.
#
# Usage: ./tools/build-release.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CSV="$REPO_ROOT/widgets.csv"
DIST="$REPO_ROOT/dist"

rm -rf "$DIST"
mkdir -p "$DIST"

if [ ! -f "$CSV" ]; then
    echo "ERROR: widgets.csv not found at $CSV"
    exit 1
fi

BUNDLE_DIR=$(mktemp -d)
COUNT=0

# Skip header line, read CSV
tail -n +2 "$CSV" | while IFS=',' read -r widget device version reviewed tested quality release_ready; do
    # Skip widgets that are not release-ready
    if [ "$release_ready" != "Y" ]; then
        continue
    fi

    WIDGET_DIR="$REPO_ROOT/widgets/$widget"
    if [ ! -d "$WIDGET_DIR" ]; then
        echo "WARNING: Widget directory not found: $WIDGET_DIR (skipping)"
        continue
    fi

    ZIP_NAME="${widget}-v${version}.zip"
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
    DATE=$(date +%Y.%m)
    BUNDLE_NAME="all-widgets-v${DATE}.zip"
    echo "Packaging $BUNDLE_NAME..."
    (cd "$BUNDLE_DIR" && zip -r "$DIST/$BUNDLE_NAME" . -x ".*") > /dev/null
fi

rm -rf "$BUNDLE_DIR"

echo ""
echo "Release artifacts in $DIST/:"
ls -1 "$DIST/"
