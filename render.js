// Renders film.html frame by frame in headless Chromium.
//   node render.js stills 60,150,300      -> PNG stills in out/
//   node render.js video                  -> out/frames.mp4 (no audio)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const [mode = 'video', list = ''] = process.argv.slice(2);
fs.mkdirSync('out', { recursive: true });

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => { console.error('[page error]', e.message); process.exit(1); });
  await page.goto('file://' + path.resolve('film.html') + '?offline');
  await page.waitForFunction(() => window.renderFrame);
  const total = Math.round(await page.evaluate(() => window.DURATION * window.FPS));

  if (mode === 'stills') {
    const want = new Set(list.split(',').map(Number));
    const last = Math.max(...want);
    for (let i = 0; i <= last; i++) {
      await page.evaluate(([i, r]) => r ? window.renderFrame(i) : window.advance(i), [i, want.has(i)]);
      if (want.has(i)) { await page.screenshot({ timeout: 0, path: `out/still_${String(i).padStart(4, '0')}.png` }); console.log('still', i); }
    }
  } else {
    const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', 'out/frames.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let i = 0; i < total; i++) {
      await page.evaluate(i => window.renderFrame(i), i);
      const buf = await page.screenshot({ type: 'png', timeout: 0 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 30 === 0) console.log(`frame ${i}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
