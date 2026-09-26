// node probe.js "<query>" <frame> <out.png>  — one still with arbitrary URL params
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const jobs = process.argv.slice(2).join(' ').split(';').map(s => s.trim().split(/\s+/)).filter(j => j.length === 3);
  await Promise.all(jobs.map(async ([q, f, out]) => {
    const p = await b.newPage({ viewport: { width: 540, height: 540 } });
    await p.goto(`file://${path.resolve('breathing.html')}?offline&size=540&${q}`);
    await p.waitForFunction(() => window.renderFrame, null, { timeout: 0 });
    await p.evaluate(f => window.renderFrame(+f), f);
    await p.screenshot({ path: out, timeout: 0 });
  }));
  await b.close();
})();
