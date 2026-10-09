// Close-ups of the trees in outdoor places (the street-style crowns, Jørgen 2026-10-09: "do you mean these
// disconnected brown sticks that are supposed to be trees?"): per place the game's own view from where Eric starts,
// then the tree nearest him from three sides (eye height, low looking up, and high), so a bare limb between trunk and
// crown shows from any of them.
//   node game3d/tools/tree-shots.mjs <width> <out> [place[:day],...]
// Captures go to game3d/shots/trees/<out>/. BASE=.claude/worktrees/<name>/game3d tests a worktree.
import fs from 'node:fs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';

const width = +(process.argv[2] || 1366),
  phone = width < 600,
  label = process.argv[3] || 'run',
  places = (process.argv[4] || 'forecourt,plaza,campus:3,sports:3,east_lane,office_quarter').split(',');
const base = process.env.BASE || 'game3d';
const out = new URL(`../shots/trees/${label}/`, import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const report = { width, places: {}, errors: [] };

await withBrowserJob(
  `tree-shots-${width}`,
  async (browser) => {
    for (const entry of places) {
      const [place, day = 2] = entry.split(':');
      const context = await browser.newContext({
        viewport: { width, height: phone ? 844 : 860 },
        isMobile: phone,
        hasTouch: phone,
      });
      const page = await context.newPage();
      let closing = false;
      await context.route(
        '**/*',
        scopedRoute({
          publicOnly: true,
          isClosing: () => closing,
          onFailure: (e) => report.errors.push(String(e)),
        }),
      );
      page.on('pageerror', (e) => report.errors.push(`${place}: ${e.message}`));
      await page.addInitScript(() =>
        globalThis.localStorage.setItem(
          'amakawa-settings',
          JSON.stringify({
            privateMode: false,
            voiceOn: false,
            textSpeed: 'instant',
            quality: 'high',
          }),
        ),
      );
      try {
        await waitForGame(
          page,
          120000,
          () => page.goto(`http://127.0.0.1:8771/${base}/index.html?day=${day}&place=${place}&mc=eric&q=2`),
          'play',
        );
        await page.waitForFunction(() => !globalThis.__game.busy);
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${out}${width}-${place}-game.png` });
        // the trunks: the bark's vertices near the ground, gathered per metre; the nearest to Eric with room round it
        const tree = await page.evaluate(async () => {
          const T = await import('three'),
            g = globalThis.__game,
            P = g.place,
            p = g.player.root.position,
            v = new T.Vector3(),
            cells = new Map();
          (P.space || P.scene).traverse((o) => {
            if (!o.isMesh || o.userData.surf !== 'bark' || !o.visible) return;
            const pos = o.geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
              v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
              if (v.y > 0.25 || v.y < -0.2) continue;
              const k = Math.round(v.x) + ':' + Math.round(v.z);
              const c = cells.get(k) || [0, 0, 0, 0];
              c[0] += v.x;
              c[1] += v.z;
              c[2] += v.y;
              c[3]++;
              cells.set(k, c);
            }
          });
          const trunks = [...cells.values()]
            .filter((c) => c[3] >= 6)
            .map((c) => [c[0] / c[3], c[2] / c[3], c[1] / c[3]]);
          trunks.sort((a, b) => Math.hypot(a[0] - p.x, a[2] - p.z) - Math.hypot(b[0] - p.x, b[2] - p.z));
          return {
            trunks: trunks.length,
            at: trunks.find((t) => Math.hypot(t[0] - p.x, t[2] - p.z) > 1.5) || trunks[0],
          };
        });
        report.places[place] = tree;
        if (!tree.at) {
          console.log(place, 'no trees found');
          continue;
        }
        const [tx, ty, tz] = tree.at;
        const views = [
          ['eye', [tx + 3.4, ty + 1.7, tz + 3.4], [tx, ty + 1.45, tz]],
          ['low', [tx - 2.6, ty + 0.5, tz + 2.2], [tx, ty + 1.7, tz]],
          ['high', [tx - 3.4, ty + 4.2, tz - 3.0], [tx, ty + 1.3, tz]],
        ];
        for (const [id, eye, at] of views) {
          await page.evaluate(
            ({ eye, at }) => {
              const cam = globalThis.__game.place.cam;
              cam.update = () => {
                cam.camera.position.set(...eye);
                cam.camera.lookAt(...at);
                cam.camera.updateMatrixWorld();
              };
            },
            { eye, at },
          );
          await page.waitForTimeout(700);
          await page.screenshot({ path: `${out}${width}-${place}-${id}.png` });
        }
        console.log(place, JSON.stringify(tree));
      } catch (e) {
        report.errors.push(`${place}: ${e.message}`);
        console.log(place, 'FAILED', e.message);
      } finally {
        closing = true;
        await context.close();
      }
    }
  },
  { timeoutMs: 900000, gpuWaitMs: 600000 },
);
fs.writeFileSync(out + `${width}-report.json`, JSON.stringify(report, null, 2));
console.log(out, report.errors.length ? 'ERRORS ' + report.errors.join(' | ') : 'ok');
