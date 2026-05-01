#!/bin/bash
set -e

DEVICE_ID=$(xcrun simctl list devices available | grep -E "iPad" | head -1 | grep -oE "[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}" | head -1)

if [ -z "$DEVICE_ID" ]; then
  echo "No iPad simulator found. Please install one via Xcode."
  exit 1
fi

SCREENSHOT_DIR="$(cd "$(dirname "$0")" && pwd)/screenshots/en-US"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

mkdir -p "$SCREENSHOT_DIR"

echo "Using device: $DEVICE_ID"
echo "Booting iPad simulator..."
xcrun simctl boot "$DEVICE_ID" 2>/dev/null || true
open -a Simulator

echo ""
echo "=========================================="
echo "INSTRUCTIONS:"
echo "1. Wait for Simulator to fully boot"
echo "2. In Simulator, open your Expo app"
echo "3. Navigate to each screen you want to capture"
echo "4. Press ENTER to take a screenshot"
echo "5. Type 'done' + ENTER when finished"
echo "=========================================="
echo ""

COUNTER=1
while true; do
  echo ""
  echo "Current screenshots: $((COUNTER - 1))"
  read -r INPUT

  if [[ "$INPUT" == "done" ]]; then
    echo "Done. iPad screenshots saved to $SCREENSHOT_DIR"
    echo "Files:"
    ls -la "$SCREENSHOT_DIR"
    break
  fi

  FILENAME="$SCREENSHOT_DIR/iPad_Pro_129-$(printf '%02d' $COUNTER).png"
  xcrun simctl io "$DEVICE_ID" screenshot "$FILENAME"
  echo "Saved: $FILENAME"
  COUNTER=$((COUNTER + 1))
done