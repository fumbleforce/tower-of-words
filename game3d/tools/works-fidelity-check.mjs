import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';

const quality = Number(process.env.QUALITY ?? 1);
const out = process.env.OUT || 'game3d/shots/works-fidelity/native-1';
const base = new URL((process.env.BASE || 'game3d') + '/', 'http://127.0.0.1:8771/').href;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  'works-fidelity',
  async (browser) => {
    for (const width of [1366, 390]) {
      const phone = width < 600,
        height = phone ? 844 : 860;
      const context = await browser.newContext({ viewport: { width, height }, isMobile: phone, hasTouch: phone });
      const page = await context.newPage(),
        errors = [],
        checks = [],
        captures = [];
      let closing = false;
      await context.route(
        '**/*',
        scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (e) => errors.push(e) }),
      );
      page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript(() => {
        globalThis.localStorage.setItem(
          'amakawa-settings',
          JSON.stringify({ privateMode: false, voiceOn: false, textSpeed: 'instant' }),
        );
        globalThis.localStorage.setItem(
          'amakawa-onboard',
          JSON.stringify({ moved: true, talked: true, uses: 5, sayUsed: true }),
        );
      });
      const shot = async (id, diagnostic = false) => {
        await page.screenshot({ path: `${out}/${width}-${id}.png` });
        captures.push({
          id,
          diagnostic,
          state: await page.evaluate(() => {
            const g = globalThis.__game;
            return {
              at: g.player.root.position.toArray(),
              camera: {
                yaw: g.place.cam.yaw,
                elev: g.place.cam.elev,
                distance: g.place.cam.dist,
                close: !!g.place.cam.close,
              },
            };
          }),
        });
      };
      async function position(point) {
        await page.evaluate(async (point) => {
          const g = globalThis.__game,
            p = await import('./js/scenes/works/plan.js'),
            local = p.pt(point);
          g.player.root.position.set(local[0], 0, local[1]);
          g.walker.sync();
          g.place.cam.release();
          g.place.cam.snap(g.player.root.position);
        }, point);
        await page.waitForTimeout(900);
      }
      async function clickWalk(point, label) {
        const projection = await page.evaluate(async (point) => {
          const g = globalThis.__game,
            THREE = await import('three'),
            p = await import('./js/scenes/works/plan.js');
          const [x, z] = p.pt(point),
            v = g.place.space.localToWorld(new THREE.Vector3(x, 0, z)).project(g.place.camera);
          return {
            x: ((v.x + 1) * globalThis.innerWidth) / 2,
            y: ((1 - v.y) * globalThis.innerHeight) / 2,
            target: [x, z],
            start: g.player.root.position.toArray(),
          };
        }, point);
        assert(
          projection.x > 10 && projection.x < width - 10 && projection.y > 115 && projection.y < height - 90,
          `${label}: floor target must be in clear viewport ${JSON.stringify(projection)}`,
        );
        if (phone) await page.touchscreen.tap(projection.x, projection.y);
        else await page.mouse.click(projection.x, projection.y);
        await page.waitForFunction(
          ([x, z]) => {
            const g = globalThis.__game;
            return Math.hypot(g.player.root.position.x - x, g.player.root.position.z - z) < 0.16;
          },
          projection.target,
          { timeout: 20000 },
        );
        await page.waitForTimeout(700);
        const end = await page.evaluate(() => globalThis.__game.player.root.position.toArray());
        assert(
          Math.hypot(end[0] - projection.start[0], end[2] - projection.start[2]) > 0.2,
          `${label}: actor actually moved`,
        );
        checks.push({ label, input: phone ? 'touchscreen.tap' : 'mouse.click', ...projection, end });
      }
      // These inspection shots suspend player framing. They are never counted as normal camera evidence.
      async function detail(point, id, distance = 7, reverse = false) {
        if (process.env.DETAIL && process.env.DETAIL !== id) return;
        const prior = await page.evaluate(() => ({
          busy: globalThis.__game.busy,
          yaw: globalThis.__game.place.cam.yaw,
        }));
        await page.evaluate(
          async ({ point, distance, reverse }) => {
            const g = globalThis.__game,
              p = await import('./js/scenes/works/plan.js');
            g.busy = true;
            if (reverse) {
              const direction = g.place.cam.dir.clone();
              direction.set(0.7, 0.8, 1).normalize();
              Object.defineProperty(g.place.cam, 'dir', { configurable: true, get: () => direction.clone() });
            }
            g.place.cam.closeOn(p.pt(point), g.place.cam.fitDist / distance, 0.35);
            g.place.cam.snap(g.player.root.position);
          },
          { point, distance, reverse },
        );
        await page.waitForTimeout(300);
        await shot(id, true);
        await page.evaluate((prior) => {
          const g = globalThis.__game;
          g.busy = prior.busy;
          if (Object.hasOwn(g.place.cam, 'dir')) delete g.place.cam.dir;
          g.place.cam.yaw = prior.yaw;
          g.place.cam.release();
          g.place.cam.snap(g.player.root.position);
        }, prior);
      }
      try {
        await waitForGame(
          page,
          60000,
          () => page.goto(`${base}index.html?day=6&place=works&mc=${phone ? 'carina' : 'eric'}&q=${quality}`),
          'play',
        );
        await page.waitForFunction(() => !globalThis.__game.busy && !globalThis.document.querySelector('#boot'));
        const plan = await page.evaluate(async () => {
          const p = await import('./js/scenes/works/plan.js');
          return { gate: p.STATION_GATE, station: p.STATION, street: p.STREET, walk: p.RWALK, court: p.W2_COURT };
        });
        checks.push({ plan });
        const gateX = (plan.gate[0] + plan.gate[1]) / 2,
          gateZ = plan.station[3],
          walkZ = (plan.walk[2] + plan.walk[3]) / 2;
        if (process.env.DETAIL_ONLY) {
          await position([gateX, walkZ]);
          await detail([plan.station[1] - 0.65, gateZ], 'station-board-detail', phone ? 10 : 7);
          await detail([-42.9, plan.station[2] + 2], 'station-feet-detail', phone ? 10 : 7);
          const firstZ = plan.court[3] + 0.9;
          await position([(plan.street[0] + plan.street[1]) / 2, firstZ + 1.2]);
          await detail([plan.street[1] + 0.55, firstZ + 1.275], 'bins-front-detail', phone ? 15 : 12);
          await detail([plan.street[1] + 0.55, firstZ + 1.275], 'bins-rear-detail', phone ? 15 : 12, true);
          assert.deepEqual(errors, []);
          continue;
        }
        await position([gateX, walkZ]);
        await shot('gate-approach');
        await clickWalk([gateX, gateZ - 0.9], 'through-station-gate');
        await shot('gate-inside');
        await clickWalk([gateX, gateZ - 2.1], 'along-service-slabs');
        await shot('instruments');
        await detail([plan.station[1] - 0.65, gateZ], 'station-board-detail', phone ? 10 : 7);
        await detail([-42.9, plan.station[2] + 2], 'station-feet-detail', phone ? 10 : 7);
        await clickWalk([gateX, gateZ - 0.5], 'toward-gate');
        await clickWalk([gateX, walkZ], 'back-through-gate');
        await shot('gate-return');
        const streetX = (plan.street[0] + plan.street[1]) / 2,
          firstZ = plan.court[3] + 0.9;
        await position([streetX, firstZ + 3.5]);
        await shot('bins-approach');
        for (const [label, z] of [
          ['south', firstZ + 2.5],
          ['middle', firstZ + 1.2],
          ['north', firstZ - 0.5],
        ]) {
          await clickWalk([streetX, z], `past-bins-${label}`);
          await shot('bins-' + label);
        }
        await detail([plan.street[1] + 0.55, firstZ + 1.275], 'bins-front-detail', phone ? 15 : 12);
        await detail([plan.street[1] + 0.55, firstZ + 1.275], 'bins-rear-detail', phone ? 15 : 12, true);
        assert.deepEqual(errors, []);
      } catch (error) {
        checks.push({ failure: error.stack });
        await shot('failure');
        throw error;
      } finally {
        fs.writeFileSync(`${out}/${width}-report.json`, JSON.stringify({ quality, checks, captures, errors }, null, 2));
        closing = true;
        await context.close();
      }
    }
  },
  { timeoutMs: 295000 },
);
