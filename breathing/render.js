// Renders breathing.html loops in headless Chromium.
//   node render.js stills <flow 0-4|all> <frame,frame,...>   -> out/<name>_<frame>.png
//   node render.js video  <flow 0-4|all> [--labels]           -> out/<name>.mp4 (one seamless 16 s cycle)
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const [mode, which = 'all', list = ''] = process.argv.slice(2);
const labels = process.argv.includes('--labels');
const SIZE = 1080;
fs.mkdirSync('out', { recursive: true });

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const flows = which === 'all' ? [0, 1, 2, 3, 4] : which.split(',').map(Number);
  for (const a of flows) {
    const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 });
    page.on('pageerror', e => { console.error('[page error]', e.message); process.exit(1); });
    await page.goto(`file://${path.resolve('breathing.html')}?offline&a=${a}&size=${SIZE}${labels ? '&labels=1' : ''}`);
    await page.waitForFunction(() => window.renderFrame, null, { timeout: 0 });
    const name = (await page.evaluate(() => window.FLOW_NAME)).toLowerCase() + (labels ? '-labels' : '');
    const frames = await page.evaluate(() => window.FRAMES);
    if (mode === 'stills') {
      for (const i of list.split(',').map(Number)) {
        await page.evaluate(i => window.renderFrame(i), i);
        await page.screenshot({ path: `out/${name}_${String(i).padStart(3, '0')}.png`, timeout: 0 });
      }
      console.log('stills', name);
    } else {
      const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `out/${name}.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
      const t0 = Date.now();
      for (let i = 0; i < frames; i++) {
        await page.evaluate(i => window.renderFrame(i), i);
        const buf = await page.screenshot({ type: 'png', timeout: 0 });
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        if (i % 60 === 0) console.log(`${name} frame ${i}/${frames} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
      ff.stdin.end();
      await new Promise(r => ff.on('close', r));
      console.log('done', name);
    }
    await page.close();
  }
  await browser.close();
})();
