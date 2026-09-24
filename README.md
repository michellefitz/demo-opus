# demo-opus

A 32-second film made from one HTML file. It uses no libraries and no assets.

**Watch:** [`opus-5.5-demo.mp4`](opus-5.5-demo.mp4) (1920×1080, 30 fps, with sound)

## What is on screen

| Time | Scene | How it works |
|---|---|---|
| 0–4 s | The prompt types itself | DOM text, timed per character |
| 4–10.5 s | 262,144 particles form "OPUS 5.5" | GPU ping-pong float textures. Curl-noise flow, then a spring to targets sampled from rasterized glyphs |
| 10.5–17 s | The letters come apart into an Aizawa strange attractor | One long RK4 trajectory on the CPU gives each particle its own phase. The GPU then advects each particle along the ODE flow |
| 17–25 s | Mandelbulb, power 8 | Per-pixel raymarch with a distance estimator, soft shadows, and orbit-trap colour |
| 25–32 s | End card | — |

The film uses HDR buffers, bloom, tone mapping, vignette and grain.

The soundtrack (`music.js`) is synthesized sample by sample: detuned-saw pads through a swept lowpass, an arpeggio, kicks, a riser, FM bells, and a Schroeder reverb. Its cues match the film's timeline.

## Watch it live

Open `film.html` in a browser that supports WebGL2.

## Render the video

```sh
FFMPEG=/path/to/ffmpeg ./build.sh
```

`render.js` drives `window.renderFrame(i)` in headless Chromium, one frame at a time. Frames are deterministic and do not depend on GPU speed.
