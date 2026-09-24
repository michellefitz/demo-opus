// Synthesizes the soundtrack sample by sample and writes out/music.wav.
// The cue times match the timeline in film.html. 120 BPM, so one beat = 0.5 s.
const fs = require('fs');
const SR = 44100, DUR = 32.0, N = Math.round(SR * DUR);
const L = new Float32Array(N), R = new Float32Array(N);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };

// render helpers: add a mono voice with pan
function add(t0, len, pan, fn) {
  const i0 = Math.max(0, Math.floor(t0 * SR)), i1 = Math.min(N, Math.floor((t0 + len) * SR));
  const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
  for (let i = i0; i < i1; i++) { const v = fn((i - t0 * SR) / SR, i / SR); L[i] += v * gl; R[i] += v * gr; }
}
const saw = p => 2 * (p - Math.floor(p + 0.5));

// ---- pad: detuned saws through a swept one-pole lowpass ----
// D minor world: Dm9 -> Bbmaj7 -> Gm9 -> A7sus, one chord per 8 beats
const chords = [[50, 57, 62, 65, 69, 76], [46, 53, 58, 62, 65, 69], [43, 50, 55, 58, 62, 69], [45, 52, 57, 62, 64, 67]];
function padEnv(t) { return smooth(0.3, 4.0, t) * 0.55 + smooth(4.0, 6.6, t) * 0.25 + smooth(16.5, 17.2, t) * 0.25 - smooth(29.5, 32, t) * 1.05; }
function cutoff(t) { return 250 + 1500 * smooth(3.5, 6.7, t) + 2200 * smooth(16.8, 17.3, t) * (1 - smooth(25, 30, t) * 0.7) + 300 * Math.sin(t * 0.7); }
function chordAt(t) {
  // hold Dm9 through the intro and on the end card; cycle one chord per 8 beats in between
  if (t < 10.5 || t >= 25) return 0;
  return ((Math.floor((t / 0.5 - 21) / 8) + (t < 17 ? 1 : 0)) % 4 + 4) % 4;
}
{
  const voices = chords.map(c => c.flatMap(m => [-1, 0, 1].map(d => ({ m, d: d * 0.11 + rnd() * 0.02, ph: (rnd() + 1) / 2 }))));
  const w = [1, 0, 0, 0];               // per-chord gain, slewed so chord changes crossfade in ~80 ms
  const slew = 1 - Math.exp(-1 / (0.08 * SR));
  const lp = [0, 0], lp2 = [0, 0];
  for (let i = 0; i < N; i++) {
    const t = i / SR, ci = chordAt(t);
    let sL = 0, sR = 0;
    for (let c = 0; c < 4; c++) {
      w[c] += ((c === ci ? 1 : 0) - w[c]) * slew;
      if (w[c] < 1e-4) continue;
      voices[c].forEach((vo, v) => {
        vo.ph += hz(vo.m + vo.d) / SR;
        const s = saw(vo.ph) * (vo.m < 50 ? 1.0 : 0.6) * w[c];
        if (v % 3 === 0) sL += s; else if (v % 3 === 2) sR += s; else { sL += s * 0.5; sR += s * 0.5; }
      });
    }
    const a = 1 - Math.exp(-2 * Math.PI * cutoff(t) / SR);
    lp[0] += a * (sL - lp[0]); lp[1] += a * (sR - lp[1]);
    lp2[0] += a * (lp[0] - lp2[0]); lp2[1] += a * (lp[1] - lp2[1]);
    const g = Math.max(0, padEnv(t)) * 0.045;
    L[i] += lp2[0] * g; R[i] += lp2[1] * g;
  }
}

// ---- key clicks while the prompt types (t 0.5..2.8, 55 chars) ----
for (let c = 1; c <= 55; c++) {
  const t0 = 0.5 + (c / 55) * 2.3 + rnd() * 0.012;
  const tone = 1800 + rnd() * 400;
  add(t0, 0.03, rnd() * 0.3, (t) => rnd() * Math.exp(-t * 260) * 0.18 + Math.sin(2 * Math.PI * tone * t) * Math.exp(-t * 400) * 0.05);
}
// enter key
add(3.0, 0.08, 0, t => rnd() * Math.exp(-t * 90) * 0.3);

// ---- riser 3.4 .. 6.6 : noise through a rising resonant bandpass ----
{
  let b1 = 0, b2 = 0;
  add(3.4, 3.3, 0, (t) => {
    const f = 200 * Math.pow(30, t / 3.3), q = 6;
    const w = 2 * Math.PI * f / SR;
    const x = rnd();
    // state-variable-ish bandpass
    b1 += w * (x - b1 - b2 / q); b2 += w * b1;
    return b1 * 0.25 * smooth(0, 3.2, t) * (1 - smooth(3.15, 3.3, t));
  });
}

// ---- impacts: sub boom + bright hit ----
function boom(t0, amt) {
  add(t0, 3.0, 0, t => { return Math.sin(2 * Math.PI * (30 * t + 70 * (1 - Math.exp(-t * 6)) / 6)) * Math.exp(-t * 1.6) * 0.55 * amt; });
  add(t0, 1.2, 0, t => rnd() * Math.exp(-t * 7) * 0.12 * amt);
}
boom(6.6, 0.9);
boom(17.0, 1.3);
boom(25.0, 0.7);

// ---- kick + hats from the drop until the end card (beats 34..50) ----
function kick(t0, amt = 1) {
  add(t0, 0.45, 0, t => Math.sin(2 * Math.PI * (45 * t + 110 * (1 - Math.exp(-t * 30)) / 30)) * Math.exp(-t * 7) * 0.6 * amt + rnd() * Math.exp(-t * 200) * 0.1);
}
for (let b = 34; b < 50; b++) kick(b * 0.5);
for (let b = 34; b < 50; b++) { let prev = 0; add(b * 0.5 + 0.25, 0.06, 0.35, t => { const x = rnd(), y = x - prev; prev = x; return y * Math.exp(-t * 60) * 0.12; }); }
// light pulse under the attractor (beats 21..34): soft heartbeat kick
for (let b = 22; b < 34; b += 2) kick(b * 0.5, 0.45);

// ---- arpeggio: plucked triangle, 16ths, from the attractor on ----
{
  const arpNotes = [[62, 65, 69, 72, 74, 72, 69, 65], [58, 62, 65, 69, 70, 69, 65, 62], [55, 58, 62, 65, 67, 65, 62, 58], [57, 61, 64, 67, 69, 67, 64, 61]];
  for (let s = 0; s < (25 - 10.5) / 0.125; s++) {
    const t0 = 10.5 + s * 0.125;
    const ci = chordAt(t0);
    const m = arpNotes[ci][s % 8] + (t0 >= 17 && (s % 16) >= 8 ? 12 : 0);
    const f = hz(m);
    const vel = (0.5 + 0.5 * smooth(10.5, 13, t0)) * (s % 4 === 0 ? 1 : 0.7) * (1 - smooth(24, 25, t0));
    const pan = Math.sin(s * 0.9) * 0.6;
    add(t0, 0.4, pan, t => { const p = f * t; const tri = 4 * Math.abs(p - Math.floor(p + 0.5)) - 1; return (tri * 0.7 + Math.sin(2 * Math.PI * 2 * p) * 0.3) * Math.exp(-t * 11) * 0.09 * vel; });
  }
}

// ---- bells on the end card rows ----
function bell(t0, m, amt = 1) {
  const f = hz(m);
  add(t0, 4, rnd() * 0.4, t => (Math.sin(2 * Math.PI * f * t + 1.4 * Math.sin(2 * Math.PI * f * 3.5 * t) * Math.exp(-t * 3)) * Math.exp(-t * 1.3) * 0.13 +
    Math.sin(2 * Math.PI * f * 2 * t) * Math.exp(-t * 3) * 0.04) * amt);
}
bell(6.6, 74, 0.8); bell(6.6, 81, 0.5);
bell(17.0, 86, 0.6);
bell(26.0, 74); bell(27.0, 77); bell(28.0, 81); bell(29.2, 86, 1.1); bell(29.2, 74, 0.6);

// ---- reverb: 4 combs + 2 allpasses per channel (Schroeder), stereo-decorrelated ----
function reverb(x, combs, aps, mix) {
  const y = new Float32Array(x.length);
  const cs = combs.map(d => ({ b: new Float32Array(d), i: 0, lp: 0 }));
  const as = aps.map(d => ({ b: new Float32Array(d), i: 0 }));
  for (let n = 0; n < x.length; n++) {
    let s = 0;
    for (const c of cs) { const o = c.b[c.i]; c.lp = o * 0.7 + c.lp * 0.3; c.b[c.i] = x[n] + c.lp * 0.86; c.i = (c.i + 1) % c.b.length; s += o; }
    s *= 0.25;
    for (const a of as) { const o = a.b[a.i]; const v = s + o * 0.5; a.b[a.i] = v; s = o - v * 0.5; a.i = (a.i + 1) % a.b.length; }
    y[n] = x[n] + s * mix;
  }
  return y;
}
const RL = reverb(L, [1557, 1617, 1491, 1422].map(d => d * 2), [225, 556], 0.55);
const RR = reverb(R, [1277, 1356, 1188, 1116].map(d => d * 2), [241, 579], 0.55);

// ---- master: gentle glue, soft clip, fade, normalise ----
let peak = 0;
for (let i = 0; i < N; i++) { RL[i] = Math.tanh(RL[i] * 1.3); RR[i] = Math.tanh(RR[i] * 1.3); peak = Math.max(peak, Math.abs(RL[i]), Math.abs(RR[i])); }
const g = 0.89 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const fade = Math.min(1, i / (SR * 0.05)) * (1 - smooth(DUR - 1.2, DUR, i / SR));
  buf.writeInt16LE(Math.round(clamp(RL[i] * g * fade, -1, 1) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(clamp(RR[i] * g * fade, -1, 1) * 32767), 46 + i * 4);
}
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/music.wav', buf);
console.log('wrote out/music.wav', DUR + 's', 'peak', peak.toFixed(3));
