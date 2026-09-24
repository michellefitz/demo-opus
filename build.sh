#!/usr/bin/env bash
# Renders the film, synthesizes the score, and muxes both into opus-5.5-demo.mp4.
# Needs: node, Playwright + Chromium, ffmpeg with libx264 (set FFMPEG to override).
set -euo pipefail
cd "$(dirname "$0")"
FFMPEG="${FFMPEG:-ffmpeg}"
export FFMPEG
node music.js
node render.js video
"$FFMPEG" -y -loglevel error -i out/frames.mp4 -i out/music.wav \
  -c:v copy -af "loudnorm=I=-14:TP=-1.0:LRA=11" -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart \
  opus-5.5-demo.mp4
echo "wrote opus-5.5-demo.mp4"
