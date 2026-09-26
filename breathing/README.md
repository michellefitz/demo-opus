# Box Breathing Flows

Five particle animations for a breathing app. Each one is a strange attractor that billows to a box-breathing pattern.

| Phase | Time | What the flow does |
|---|---|---|
| Breathe in | 0–4 s | The form swells outward. The centre moves first and the edge follows, so it billows. The flow speeds up and the halo fills. |
| Hold | 4–8 s | The form stays full. The flow slows to a drift. |
| Breathe out | 8–12 s | The form settles back in, centre first. The flow speeds up again. |
| Hold | 12–16 s | The form stays small and dim. The flow drifts. |

The videos are in `videos/`. Each video is exactly one 16 s cycle and loops with no seam: frame 480 is pixel-identical to frame 0. Set the player to loop.

| File | Attractor | Palette |
|---|---|---|
| `tide.mp4` | Aizawa | teal / seafoam |
| `lavender.mp4` | Thomas (b = 0.1) | lavender / violet |
| `dawn.mp4` | Lorenz | amber / peach |
| `moon.mp4` | Rössler | moonlight blue |
| `rose.mp4` | Wang–Sun four-wing (one wing per phase) | rose / pink |

`tide-labels.mp4` shows the same Tide loop with the "Breathe in / Hold / Breathe out / Hold" labels and a count. It is a preview of how app text could sit on top. The other videos have no text, so the app can draw its own.

`preview-grid.mp4` plays all six in sync, so you can compare them.

All loops are 1080×1080 at 30 fps, H.264 at 5 Mbps (about 10 MB each), with no audio.

## How it works

1. A long trajectory of each attractor is integrated on the CPU with RK4. It is then resampled by arc length, so particles move at an even visual speed.
2. 262,144 particles each own a random start point and a random phase on that trajectory. A particle's position is a pure function of time, so the loop is exact.
3. The breath curve `b(t)` scales the form. The scale is applied with a small delay that grows with radius, which makes the billow. A noise field swells the surface unevenly.
4. The flow speed follows how fast `b` changes, plus a slow drift. The particles therefore move with the breath and almost rest during holds.

## Live and custom timing

Open `breathing.html` in a browser that supports WebGL2.

| Parameter | Effect |
|---|---|
| `?a=0` … `4` | Selects the flow (tide, lavender, dawn, moon, rose) |
| `&phase=5` | Sets the seconds per side of the box (default 4) |
| `&labels=1` | Shows the phase text and count |
| `&size=720` | Sets the canvas size |

To render the videos again:

```sh
FFMPEG=/path/to/ffmpeg node render.js video all
FFMPEG=/path/to/ffmpeg node render.js video 0 --labels
```
