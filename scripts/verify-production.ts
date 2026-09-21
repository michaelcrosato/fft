import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { BattleEngine, createBattle, freshCampaign, SAVE_KEY } from '../src/engine.ts';

const baseURL = process.argv[2] ?? 'http://localhost:4174';
const browser = await chromium.launch({ channel: 'chromium' });
const report: Record<string, unknown>[] = [];
try {
  for (const backend of ['auto', 'webgl2', 'webgl1']) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errors: string[] = [],
      externalRequests: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('request', (r) => {
      if (!r.url().startsWith(baseURL) && !r.url().startsWith('data:'))
        externalRequests.push(r.url());
    });
    const c = freshCampaign();
    c.settings.quality = 'high';
    c.completed = [0, 1, 2, 3, 4];
    c.battle = createBattle(c, 5);
    new BattleEngine(c.battle).nextTurn();
    await page.addInitScript(({ key, c }) => localStorage.setItem(key, JSON.stringify(c)), {
      key: SAVE_KEY,
      c
    });
    await page.goto(`${baseURL}/${backend === 'auto' ? '' : `?renderer=${backend}`}`);
    await page.waitForFunction(() => (window as any).__CINDER__?.ready);
    console.log(`Production ${backend}: scene ready; sampling frames.`);
    // Keep this browser-side sampler as JavaScript so tsx's function-name helper
    // is not captured inside Playwright's serialized evaluation callback.
    const result = await page.evaluate(`(async () => {
      const adapter = await navigator.gpu?.requestAdapter();
      const info = adapter?.info;
      const intervals = [];
      let previous = 0;
      await new Promise((resolve) => {
        const deadline = performance.now() + 5000;
        const timeout = setTimeout(resolve, 6000);
        const frame = (t) => {
          if (previous) intervals.push(t - previous);
          previous = t;
          if (intervals.length >= 720 || performance.now() >= deadline) {
            clearTimeout(timeout);
            resolve();
          }
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      if (intervals.length < 2) throw new Error('Insufficient rendered frames for a sample.');
      const sorted = [...intervals].sort((a, b) => a - b);
      const s = window.__CINDER__;
      return {
        renderer: s.renderer,
        mission: s.campaign.battle.mission,
        drawCalls: s.drawCalls,
        triangles: s.triangles,
        sampledFrames: intervals.length,
        meanFps: Math.round(1000 / (intervals.reduce((a, b) => a + b, 0) / intervals.length)),
        medianFrameMs: Math.round(sorted[Math.floor(sorted.length * 0.5)] * 10) / 10,
        p95FrameMs: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 10) / 10,
        gpuAdapter: info
          ? {
              vendor: info.vendor,
              architecture: info.architecture,
              device: info.device,
              description: info.description
            }
          : null
      };
    })()`);
    if (result.mission !== 5 || (backend !== 'auto' && result.renderer.toLowerCase() !== backend))
      throw new Error(`Wrong scene/backend: ${JSON.stringify(result)}`);
    await page.getByRole('button', { name: 'Move', exact: true }).click();
    await page.screenshot({ path: `artifacts/production-${backend}.png` });
    if (errors.length || externalRequests.length)
      throw new Error(JSON.stringify({ errors, externalRequests }));
    report.push({ requested: backend, ...result, errors, externalRequests });
    await page.close();
  }
  await writeFile(
    'artifacts/production-check.json',
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        viewport: '1920×1080, high quality, headless Chromium',
        report
      },
      null,
      2
    )
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
