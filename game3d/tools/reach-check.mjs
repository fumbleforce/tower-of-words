// Checks that Eric can walk up to everything he can select: in each place (morning, and after work where the place
// has an evening), from where he arrives, the walk grid must reach every enabled thing's approach spot, and come
// within reach of every person (a thing marked `reachAfter` once that walk-grid block is lifted), and every nook's
// spot (places/catalog*.js `nooks`). Prints a FAIL line
// for each one he can't get to, and PASS at the end if none.
//   node game3d/tools/reach-check.mjs            (PLACES=plaza,dorm_court to limit; BASE=<worktree>/game3d)
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';

const base = process.env.BASE || 'game3d';
const PLACES = (process.env.PLACES || 'train,gate,forecourt,plaza,office,dorm_court,dorms,shotengai,east_lane,east_coast,sports,office_quarter,harbour,works').split(',');
const EVENING = new Set(['forecourt', 'plaza', 'dorm_court', 'dorms', 'shotengai', 'east_lane', 'east_coast', 'sports', 'office_quarter', 'harbour', 'works']);
const fails = [],
  errors = [];
let checked = 0;
await withBrowserJob('reach-check', async (browser) => {
  const context = await browser.newContext({ viewport: { width: 1366, height: 860 } });
  for (const place of PLACES)
    for (const eve of EVENING.has(place) ? [false, true] : [false]) {
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(`${place}: ${e.message}`));
      await page.goto(`http://127.0.0.1:8771/${base}/index.html?cap&q=1&place=${place}`, { timeout: 60000 });
      await page.waitForFunction(() => globalThis.__done, null, { timeout: 120000 }).catch(() => errors.push(`${place}: timeout`));
      const res = await page.evaluate(async (eve) => {
        const { reachableNear } = await import('./js/movement/navigation.js');
        const { flags } = await import('./js/narrative/state.js');
        const g = globalThis.__game,
          P = g.place;
        if (eve) {
          flags.going_home = true;
          P.onPeriod?.('evening');
        }
        const nav = P.nav,
          [sx, sz] = P.start,
          out = [];
        const V = g.player.root.position.clone();
        // things marked `reachAfter: <walk-grid tag>` are reached once the story lifts that block (the train's doors,
        // the gate) and talked to across it before: checked last, with those blocks lifted (issue #129)
        const later = Object.entries(P.things).filter(([, t]) => t.reachAfter);
        const things = [...Object.entries(P.things).filter(([, t]) => !t.reachAfter), ...later];
        const first = things.length - later.length;
        for (const [i, [id, t]] of things.entries()) {
          if (i === first) for (const [, u] of later) nav.unblock(u.reachAfter);
          if (id === 'mio') continue;
          if (typeof t.enabled === 'function' && !t.enabled()) continue;
          const person = /person/.test(t.kind || '');
          let target, need;
          if (!person && t.spot && t.spot()) {
            target = t.spot();
            need = 0.3;
          } else {
            const a = P.space.worldToLocal(t.anchor(V.clone()));
            target = [a.x, a.z];
            need = person ? 1.3 : 1.6; // a person can be talked to across a desk
          }
          const r = reachableNear(nav, sx, sz, target[0], target[1]);
          const d = r ? Math.hypot(r[0] - target[0], r[1] - target[1]) : 1e9;
          out.push({ id, d: +d.toFixed(2), need, target: target.map((v) => +v.toFixed(2)), after: t.reachAfter });
        }
        // and every nook (docs/game/places.md, "Nooks"): its named spot, from where he arrives
        const { PLACE_DETAILS } = await import('./js/places/catalog.js');
        for (const id of PLACE_DETAILS[P.name]?.nooks || []) {
          const target = P.spots[id];
          const r = target && reachableNear(nav, sx, sz, target[0], target[1]);
          const d = r ? Math.hypot(r[0] - target[0], r[1] - target[1]) : 1e9;
          out.push({ id: `nook ${id}`, d: +d.toFixed(2), need: 0.3, target: (target || [NaN, NaN]).map((v) => +v.toFixed(2)) });
        }
        return out;
      }, eve);
      for (const r of res) {
        checked++;
        if (r.d > r.need) fails.push(`FAIL ${place}${eve ? ' (after work)' : ''}: ${r.id} at ${r.target} is ${r.d} from where he can get (needs ${r.need})${r.after ? ` with the ${r.after} open` : ''}`);
      }
      await page.close();
    }
});
for (const f of fails) console.log(f);
for (const e of errors) console.log('ERROR', e);
console.log(fails.length || errors.length ? `FAIL ${fails.length} unreachable of ${checked}` : `PASS ${checked} things and people reachable`);
process.exit(fails.length || errors.length ? 1 : 0);
