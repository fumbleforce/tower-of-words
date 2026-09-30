// Checks the goal's edge arrow ("To head office", "To the dorms") in the outdoor places: with each exit made the goal,
// Eric is stood on a spread of free spots and the arrow must not cover Eric, a person or thing he can use (the plaza's
// fountain basin included), a pin or the action prompt (ui/goal-arrow.js, issue #84). Writes a still of every spot
// where the arrow shows, and prints FAIL lines for overlaps.
//   node game3d/tools/goal-arrow-check.mjs <outdir>
// SIZES=390x844,1366x860,1920x1080 (default). BASE=.claude/worktrees/<name>/game3d for a worktree.
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || 'game3d/shots/goal-arrow';
fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'game3d';
const sizes = (process.env.SIZES || '390x844,1366x860,1920x1080').split(',').map((s) => s.split('x').map(Number));
// place, the goal thing, evening or not
const CASES = [
  ['forecourt', 'office_entrance', false],
  ['forecourt', 'plaza_lane', false],
  ['plaza', 'office_lane', false],
  ['plaza', 'dorm_lane', true],
  ['dorm_court', 'dorm_entry', true],
  ['dorm_court', 'stairs', true],
  ['dorms', 'door_203', true],
];
const fails = [],
  errors = [];
let shown = 0;
await withBrowserJob(
  'goal-arrow-check',
  async (browser) => {
    for (const [W, H] of sizes) {
      const phone = W < 700;
      const context = await browser.newContext({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone });
      for (const [place, goal, eve] of CASES) {
        const page = await context.newPage();
        page.on('pageerror', (e) => errors.push(`${place}: ${e.message}`));
        await page.goto(`http://127.0.0.1:8771/${base}/index.html?cap&q=1&place=${place}`, { timeout: 60000 });
        await page.waitForFunction(() => globalThis.__done, null, { timeout: 120000 }).catch(() => errors.push(`${place}: timeout`));
        const spots = await page.evaluate(
          ({ place, goal, eve }) => {
            const g = globalThis.__game;
            if (eve) g.place.onPeriod?.('evening');
            g.story.goal = { [goal]: true };
            // the place's own spots (the fountain's rim on the plaza), either side of the fountain, and free ground on an 8 x 6 grid over the walkable area
            const nav = g.place.nav;
            const { x0, z0, x1, z1 } = nav;
            const pts = Object.values(g.place.spots || {}).filter(Array.isArray).map(([x, z]) => [+x.toFixed(2), +z.toFixed(2)]);
            for (let i = 0; i < 8; i++)
              for (let k = 0; k < 6; k++) {
                const x = x0 + ((i + 0.5) / 8) * (x1 - x0),
                  z = z0 + ((k + 0.5) / 6) * (z1 - z0);
                if (nav.free(x, z)) pts.push([+x.toFixed(2), +z.toFixed(2)]);
              }
            if (place === 'plaza') pts.push([4.8, -0.27], [-4.8, -0.27]);
            return pts;
          },
          { place, goal, eve },
        );
        for (const [x, z] of spots) {
          const r = await page.evaluate(
            async ({ x, z }) => {
              const g = globalThis.__game;
              g.player.root.position.set(x, g.player.root.position.y, z);
              g.walker.sync?.();
              g.place.cam?.snap?.(g.player.root.position);
              await new Promise((res) => setTimeout(res, 450));
              const a = globalThis.document.getElementById('goalArrow');
              if (a.hidden) return null;
              const b = a.getBoundingClientRect();
              const hit = (a._keep || []).find((o) => b.left < o.x1 && b.right > o.x0 && b.top < o.y1 && b.bottom > o.y0);
              return { box: [b.left, b.top, b.right, b.bottom].map(Math.round), hit: hit || null };
            },
            { x, z },
          );
          if (!r) continue;
          shown++;
          const name = `${place}-${goal}-${x}_${z}-${W}x${H}.png`;
          await page.screenshot({ path: path.join(out, name) });
          if (r.hit) fails.push(`FAIL ${name}: arrow ${r.box} over ${JSON.stringify(r.hit)}`);
        }
        await page.close();
      }
      await context.close();
    }
  },
  { timeoutMs: 290000 },
);
console.log(`${shown} spots with the arrow showing; stills in ${out}`);
if (errors.length) console.log('page errors:\n' + errors.join('\n'));
console.log(fails.length ? fails.join('\n') : 'PASS: the arrow covers nothing it keeps clear of');
process.exit(fails.length || errors.length ? 1 : 0);
