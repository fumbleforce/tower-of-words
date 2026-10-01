// Stills of the outdoor places (and the lobby) with Eric at given spots, desktop and phone, morning or evening, for
// checking geometry close up. One browser job, one page per shot.
//   node game3d/tools/place-shots.mjs <outdir> name:place:x:z[:face][:eve][:lift=<state>][:look[=<dist>]][:elev=<deg>]
// look: x, z are an island point (scenes/island-layout.js) and the place's own play camera, same angle and field of
// view, is aimed at it (at <dist>, default the place's), Eric and the markers hidden: for backdrop the play camera
// never reaches. elev: a steeper (or flatter) camera than the place's, for a look over tall blocks.
// Sizes: SIZES=1366x860,390x844 (default both); each shot is written as <name>-desk.png / <name>-phone.png.
// BASE=.claude/worktrees/<name>/game3d for a worktree. Quality q=1 unless Q is set.
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [out, ...specs] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'game3d';
const sizes = (process.env.SIZES || '1366x860,390x844').split(',').map((s) => s.split('x').map(Number));
const errors = [];
await withBrowserJob(
  'place-shots',
  async (browser) => {
    for (const [w, h] of sizes) {
      const phone = w < 700;
      const context = await browser.newContext({
        viewport: { width: w, height: h },
        isMobile: phone,
        hasTouch: phone,
      });
      for (const spec of specs) {
        const [name, place, x, z, ...rest] = spec.split(':');
        const face = rest.find((r) => /^-?[\d.]+$/.test(r));
        const eve = rest.includes('eve');
        const lift = rest.find((r) => r.startsWith('lift='))?.slice(5);
        const look = rest.find((r) => r === 'look' || r.startsWith('look='));
        const elev = rest.find((r) => r.startsWith('elev='))?.slice(5);
        const page = await context.newPage();
        page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
        page.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errors.push(`${name}: ${m.text()}`));
        const at = look ? '' : `&mx=${x}&mz=${z}`;
        const q = `cap&q=${process.env.Q || 1}&place=${place}${at}${face ? '&face=' + face : ''}`;
        await page.goto(`http://127.0.0.1:8771/${base}/index.html?${q}`, {
          timeout: 60000,
        });
        await page
          .waitForFunction(() => globalThis.__done, null, { timeout: 120000 })
          .catch(() => errors.push(`${name}: timeout`));
        if (eve) await page.evaluate(() => globalThis.__game.place.onPeriod?.('evening'));
        if (lift) await page.evaluate((s) => globalThis.__lift?.state(s), lift);
        if (look)
          await page.evaluate(
            async ([place, x, z, dist, elev]) => {
              const { toLocal } = await import('./js/scenes/island-layout.js');
              const g = globalThis.__game,
                c = g.place.cam;
              if (elev) c.elev = (+elev * Math.PI) / 180;
              globalThis.document.head.insertAdjacentHTML('beforeend', '<style>.mark{display:none!important}</style>');
              const t = c.toWorld(...toLocal(place, x, z), 0);
              const d = dist ? +dist : c.fitDist;
              g.player.root.visible = false;
              c.wanted = () => [t, d];
              c.target.copy(t);
              c.dist = d;
              c.place();
            },
            [place, +x, +z, look.slice(5), elev],
          );
        await page.waitForTimeout(700);
        const file = path.join(out, `${name}-${phone ? 'phone' : 'desk'}.png`);
        await page.screenshot({ path: file });
        console.log('wrote', file);
        await page.close();
      }
      await context.close();
    }
  },
  { timeoutMs: 280000 },
);
if (errors.length) console.log('page errors:\n' + errors.join('\n'));
