// Destination arrow keeps the current objective and controls readable at every UI scale.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const base = process.env.BASE || 'game3d';
const out = process.env.OUT || `game3d/shots/destination-pin/${Date.now()}`;
const baseline = process.env.BASELINE === '1';
const directions = process.env.DIRECTIONS === '1';
fs.mkdirSync(out, { recursive: true });
const report = { errors: [], frames: [] };
await withBrowserJob(
  'destination-pin',
  async (browser) => {
    const context = await browser.newContext({ viewport: { width: 2560, height: 1440 } });
    const page = await context.newPage();
    let closing = false;
    await context.route(
      '**/*',
      scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (e) => report.errors.push(e) }),
    );
    page.on('pageerror', (e) => report.errors.push(e.message));
    await page.addInitScript(() =>
      globalThis.localStorage.setItem(
        'amakawa-settings',
        JSON.stringify({ v: 2, privateMode: false, voiceOn: false, textSpeed: 'instant' }),
      ),
    );
    try {
      await waitForGame(
        page,
        90000,
        () => page.goto(`http://127.0.0.1:8771/${base}/index.html?day=2&place=forecourt&perf`),
        'play',
      );
      await page.waitForFunction(() => !globalThis.__game.busy);
      await page.keyboard.press('F3');
      for (const [width, height, scale] of [
        [2560, 1440, 1],
        [2560, 1440, 1.4],
        [1366, 860, 1],
        [1366, 860, 1.4],
        [390, 844, 1],
      ]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(async (scale) => {
          (await import('./js/settings.js')).setSetting('uiSize', scale);
          if (globalThis.innerWidth < 700) return;
          const T = await import('three'),
            cam = globalThis.__game.place.cam;
          // Use the street trial's native overview lens with the stock scene geometry.
          cam.elev = T.MathUtils.degToRad(48);
          cam.yaw = 0.35;
          cam.fit(
            globalThis.innerWidth / globalThis.innerHeight,
            [new T.Vector3(-5.7, 0, -5.7 * 0.66), new T.Vector3(5.7, 0, 5.7 * 0.66), new T.Vector3(0, 3, 0)],
            new T.Vector3(),
            { follow: true, clamp: [-1, 32, -12, 14], lead: -0.7 },
          );
        }, scale);
        for (const [label, point, goal] of directions
          ? [
              ['office', [2, 9.8], 'office_entrance'],
              ['plaza', [17, 2.15], 'plaza_lane'],
            ]
          : [
              ['arrival', [9.7, 9.8]],
              ['garden', [17, 2.15]],
              ['north', [9.7, -5]],
              ['hint', [9.7, 9.8]],
            ]) {
          await page.evaluate(
            ({ p, label, goal }) => {
              const g = globalThis.__game;
              if (goal) {
                g.story.goal = { [goal]: true };
                // Isolate this existing exit from the current ticket's forced goal pin.
                for (const m of g.markers.list) m.goal = () => m.id === goal;
                g.ui.goal(goal === 'office_entrance' ? 'Go to head office.' : 'Go to the shopping district.');
              }
              if (label === 'hint')
                g.ui.hint('Use the map to find the station entrance. The ticket stays available while you explore.');
              else g.ui.hideHint();
              g.player.root.position.set(p[0], g.player.root.position.y, p[1]);
              g.walker.sync?.();
              g.place.cam.snap(g.player.root.position);
            },
            { p: point, label, goal },
          );
          await page.waitForTimeout(700);
          const frame = await page.evaluate(async () => {
            const a = globalThis.document.getElementById('goalArrow');
            const box = (el) => {
              const r = el.getBoundingClientRect();
              return { x0: r.left, x1: r.right, y0: r.top, y1: r.bottom };
            };
            const arrow = box(a),
              hud = {};
            for (const id of ['goal', 'top', 'minimap', 'perfHud']) {
              const el = globalThis.document.getElementById(id);
              if (el && !el.hidden && el.offsetWidth) hud[id] = box(el);
            }
            const hits = Object.entries(hud)
              .filter(([, b]) => arrow.x0 < b.x1 && arrow.x1 > b.x0 && arrow.y0 < b.y1 && arrow.y1 > b.y0)
              .map(([id]) => id);
            const T = await import('three'),
              g = globalThis.__game,
              m = g.markers.list.find(
                (m) => m.enabled() && m.goal?.() && m.label === a.querySelector('.gn').textContent,
              );
            const v = m?.anchor(new T.Vector3()).project(g.place.camera) || new T.Vector3();
            let x = ((v.x + 1) * globalThis.innerWidth) / 2,
              y = ((1 - v.y) * globalThis.innerHeight) / 2;
            if (v.z > 1) {
              x = globalThis.innerWidth - x;
              y = globalThis.innerHeight - y;
            }
            const anchor = a.style.transform.match(/translate\(([-.\d]+)px, ([-.\d]+)px\)/);
            const angle = Number(a.querySelector('.ar').style.transform.match(/rotate\(([-.\d]+)rad\)/)?.[1]);
            const expected = anchor ? Math.atan2(y - Number(anchor[2]), x - Number(anchor[1])) : angle;
            const directionError = Math.abs(Math.atan2(Math.sin(angle - expected), Math.cos(angle - expected)));
            return {
              directionError,
              hidden: a.hidden,
              label: a.textContent,
              arrow,
              hud,
              hits,
              direction: a.querySelector('.ar').style.transform,
              goal: globalThis.__game.ui.goalText,
              ui: globalThis.getComputedStyle(globalThis.document.documentElement).getPropertyValue('--ui'),
            };
          });
          const id = `${width}-${scale}-${label}`;
          report.frames.push({ id, ...frame });
          await page.screenshot({ path: `${out}/${id}.png` });
        }
      }
      fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
      assert.deepEqual(report.errors, []);
      const visible = report.frames.filter((f) => !f.hidden);
      assert.ok(visible.length >= 5, 'enough native offscreen destination cases');
      if (!baseline)
        for (const f of visible) {
          assert.deepEqual(f.hits, [], f.id);
          assert.ok(f.directionError < 0.01, `${f.id}: arrow still points at the destination`);
        }
      console.log(
        JSON.stringify(
          {
            shown: visible.length,
            overlaps: visible.filter((f) => f.hits.length).map((f) => ({ id: f.id, hits: f.hits })),
            errors: report.errors,
          },
          null,
          2,
        ),
      );
    } finally {
      closing = true;
      fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
      await context.close();
    }
  },
  { timeoutMs: 285000 },
);
