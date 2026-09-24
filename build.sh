#!/usr/bin/env bash
# Renders the film, synthesizes the score, and muxes both into opus-5.5-demo.mp4.
# Needs: node, Playwright + Chromium, ffmpeg with libx264 (set FFMPEG to override).
set -euo pipefail
cd "$(dirname "$0")"
FFMPEG="${FFMPEG:-ffmpeg}"
export FFMPEG
node music.js
node render.js video
# two-pass 7 Mbps keeps the film grain clean at ~29 MB
(cd out && "$FFMPEG" -y -loglevel error -i frames.mp4 -c:v libx264 -preset slow -b:v 7M -pass 1 -an -f null /dev/null)
(cd out && "$FFMPEG" -y -loglevel error -i frames.mp4 -i music.wav \
  -c:v libx264 -preset slow -b:v 7M -maxrate 10M -bufsize 14M -pass 2 -pix_fmt yuv420p \
  -af "loudnorm=I=-14:TP=-1.0:LRA=11" -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart \
  ../opus-5.5-demo.mp4)
echo "wrote opus-5.5-demo.mp4"
