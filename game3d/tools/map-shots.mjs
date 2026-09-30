// Exports the island map as PNGs, so the built places can be checked against island-map-4 without clicking:
// the compare view (built places and the island layout over the reference, rectified and as drawn) and the map of
// the built places (plain, with B2, with each place's backdrop). Also writes the landmark distances (gaps.json).
//   node game3d/tools/map-shots.mjs [out dir]        (BASE=.claude/worktrees/<name>/game3d for a worktree)
// Default out dir: game3d/shots/map/<time>/ (git-ignored). Desktop size, 1600 x 1000; SIZE=390x844 for a phone.
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const out = path.resolve(process.argv[2] || fileURLToPath(new URL(`../shots/map/${stamp}`, import.meta.url)));
fs.mkdirSync(out, { recursive: true });
const SHOTS = [
  ['compare-route', 'compare', { opacity: 0.75 }],
  ['compare-route-faint', 'compare', { opacity: 0.35 }],
  ['compare-route-nolayout', 'compare', { opacity: 1, layout: false }],
  ['compare-whole', 'compare', { opacity: 0.75, whole: true }],
  ['compare-drawn', 'compare', { opacity: 0.75, drawn: true, whole: true }],
  ['compare-drawn-route', 'compare', { opacity: 0.75, drawn: true }],
  ['map', 'map', {}],
  ['map-b2', 'map', { basement: true }],
  ['map-backdrop', 'map', { backdrop: true }],
  // close-ups of each outdoor place: from above, then over the reference as drawn with the layout
  ...['forecourt', 'plaza', 'dorm_court'].flatMap((focus) => [
    [`${focus}-map`, 'map', { focus, layout: true }],
    [`${focus}-drawn`, 'compare', { focus, drawn: true, opacity: 0.6 }],
  ]),
  ['office-map', 'map', { focus: 'office', basement: true, layout: true }],
];
const errors = [];
await withBrowserJob(
  'map-shots',
  async (browser) => {
    const url = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html?q=1&place=forecourt&map=1`;
    const [width, height] = (process.env.SIZE || '1600x1000').split('x').map(Number);
    const phone = width < 700;
    const context = await browser.newContext({ viewport: { width, height }, isMobile: phone, hasTouch: phone });
    try {
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errors.push(m.text()));
      await page.goto(url, { timeout: 30000 });
      await page.waitForFunction(() => window.__game?.place && window.__map, null, { timeout: 90000 });
      await page.evaluate(() => window.__map.open('map'));
      for (const [name, view, opts] of SHOTS) {
        await page.evaluate(([v, o]) => window.__map.open(v, o), [view, opts]);
        await page.waitForTimeout(200);
        await page.screenshot({ path: path.join(out, name + '.png') });
        console.log('wrote', path.join(out, name + '.png'));
      }
      const gaps = await page.evaluate(() => ({ landmarks: window.__map.gaps, seams: window.__map.seams }));
      fs.writeFileSync(path.join(out, 'gaps.json'), JSON.stringify(gaps, null, 1));
      for (const g of gaps.landmarks) console.log(`${g.label}: ${g.anchor ? 'anchor' : g.units.toFixed(1) + ' units off'}`);
      for (const s of gaps.seams) console.log(`walk ${s.from} -> ${s.to} skips ${s.units.toFixed(1)} units`);
    } finally {
      await context.close();
    }
  },
  { timeoutMs: 240000 },
);
if (errors.length) console.log('page errors:\n' + errors.join('\n'));
console.log(errors.length ? 'DONE WITH PAGE ERRORS' : 'DONE', out);
