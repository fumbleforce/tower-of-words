// Walk the southern loop, use a real bench and jump onto its stone play route in public mode.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const base = process.env.BASE || 'game3d';
const out = process.env.OUT || new URL('../shots/island-southeast/routes/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const rows = [],
  errors = [];
await withBrowserJob(
  'southeast-routes',
  async (browser) => {
    for (const width of [1366, 390]) {
      const phone = width < 600;
      const context = await browser.newContext({
        viewport: { width, height: phone ? 844 : 860 },
        isMobile: phone,
        hasTouch: phone,
      });
      let closing = false;
      await context.route(
        '**/*',
        scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (e) => errors.push(String(e)) }),
      );
      await context.addInitScript(
        (mode) =>
          globalThis.localStorage.setItem(
            'amakawa-settings',
            JSON.stringify({ privateMode: false, voiceOn: false, cameraMode: mode }),
          ),
        phone ? 'overview' : 'follow',
      );
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      try {
        await waitForGame(
          page,
          120000,
          () =>
            page.goto(
              `http://127.0.0.1:8771/${base}/index.html?day=${process.env.DAY2_ONLY ? 2 : 3}&place=east_coast&q=${phone ? 0 : 2}${process.env.JUMP_ONLY ? '&jumpOnly=1' : ''}`,
            ),
          'play',
        );
        await page.waitForFunction(() => globalThis.__done && !globalThis.__game.busy);
        if (process.env.NAV_ONLY) {
          const navigation = await page.evaluate(() => {
            const g = globalThis.__game,
              P = g.place;
            const destinations = {
              row: P.start,
              onsen: P.things.onsen.spot(),
              sports: P.things.courts_walk.spot(),
              commons: P.things.commons.spot(),
              lookout: P.spots.east_coast_lookout,
              shrine: P.spots.east_coast_shrine,
              terrace: [0, 0.7],
              pergola: P.spots.coast_garden_pergola,
              lawn: P.spots.coast_garden_lawn,
              rest: P.spots.coast_garden_rest,
            };
            const routes = [];
            for (const [from, start] of Object.entries(destinations))
              for (const [to, end] of Object.entries(destinations)) {
                if (from === to) continue;
                const began = performance.now(),
                  path = P.nav.path(...start, ...end);
                let safe = !!path?.length,
                  previous = start;
                for (const point of path || []) {
                  safe &&= P.nav.clear(previous, point);
                  previous = point;
                }
                routes.push({
                  from,
                  to,
                  safe,
                  points: path?.length,
                  exact: JSON.stringify(path?.at(-1)) === JSON.stringify(end),
                  ms: performance.now() - began,
                });
              }
            return { cell: P.nav.cell, routes };
          });
          for (const route of navigation.routes) assert.ok(route.safe && route.exact, JSON.stringify(route));
          rows.push({ width, navigation });
          continue;
        }
        if (process.env.DAY2_ONLY) {
          const day2 = await page.evaluate(async () => {
            const g = globalThis.__game;
            const { flags } = await import(new URL('js/narrative/state.js', globalThis.location.href).href);
            const { canTravel } = await import(new URL('js/places/definitions.js', globalThis.location.href).href);
            flags.d2_shift_done = true;
            await g.place.hooks.coastVisit({ state: 'arrive' });
            const p = g.player.root.position;
            const landmarks = ['east_coast_lookout', 'east_coast_shrine'].map((id) => {
              const target = g.place.spots[id],
                path = g.place.nav.path(p.x, p.z, ...target),
                end = path.at(-1);
              return {
                id,
                pathPoints: path.length,
                error: end ? Math.hypot(end[0] - target[0], end[1] - target[1]) : Infinity,
              };
            });
            g.player.root.position.set(5.2, 0, -44.5);
            g.walker.sync();
            await g.walkTo(...g.place.spots.east_coast_lookout);
            g.place.cam.snap(g.player.root.position);
            return {
              landmarks,
              hamadaAvailable: g.place.things.kuroda.enabled(),
              sportsClosed: !canTravel('east_coast', 'sports', 2),
              privateMode: globalThis.__settings.privateMode,
            };
          });
          assert.equal(day2.hamadaAvailable, true);
          assert.equal(day2.sportsClosed, true);
          assert.equal(day2.privateMode, false);
          for (const l of day2.landmarks) assert.ok(l.pathPoints > 0 && l.error < 0.4, JSON.stringify(l));
          await page.waitForTimeout(650);
          await page.screenshot({ path: `${out}/${width}-day2-lookout.png` });
          rows.push({ width, day2 });
          continue;
        }
        const route = await page.evaluate(async () => {
          const g = globalThis.__game;
          const points = [
            [89.45, 10.2],
            [89.45, 15],
            [89.45, 18.1],
            [94.8, 17.9],
            [94.8, 23.9],
            [101, 23.9],
            [107.5, 26.5],
            [116, 23.9],
            [117.9, 18],
            [117.9, 10.2],
            [126.1, 10.8],
            [117.9, 10.2],
            [100.9, 10.2],
            [100.9, 3.3],
          ];
          g.player.root.position.set(points[0][0] - 126.5, 0, points[0][1] - 10.5);
          g.walker.sync();
          const reached = [];
          for (const [ix, iz] of globalThis.location.search.includes('jumpOnly') ? [] : points) {
            const target = [ix - 126.5, iz - 10.5];
            await g.walkTo(...target);
            let end = g.player.root.position;
            let error = Math.hypot(end.x - target[0], end.z - target[1]);
            for (let retry = 0; error > 0.4 && retry < 3; retry++) {
              await new Promise((resolve) => globalThis.setTimeout(resolve, 500));
              await g.walkTo(...target);
              end = g.player.root.position;
              error = Math.hypot(end.x - target[0], end.z - target[1]);
            }
            reached.push({ island: [ix, iz], error, end: end.toArray() });
          }
          return reached;
        });
        fs.writeFileSync(`${out}/${width}-walk.json`, JSON.stringify(route, null, 2));
        route.forEach((r) => assert.ok(r.error < 0.4, `${width} route ${r.island}: ${r.error}`));
        const seat = await page.evaluate(() => {
          const g = globalThis.__game;
          const s = [...g.place.seating.seats.values()].find(
            (s) => Math.abs(s.x + 21.4) < 0.6 && Math.abs(s.z - 17.32) < 0.2 && g.place.seating.reachable(s),
          );
          if (!s?.out) throw Error('No reachable shore bench');
          g.player.root.position.set(s.out[0], 0, s.out[1]);
          g.walker.sync();
          g.place.cam.snap(g.player.root.position);
          return { id: s.id, out: s.out, sat: g.place.seating.sit(s.id), seated: g.player.seated };
        });
        assert.equal(seat.sat, true);
        assert.equal(seat.seated, true);
        await page.waitForTimeout(800);
        await page.screenshot({ path: `${out}/${width}-seated.png` });
        assert.equal(await page.evaluate(() => globalThis.__game.place.seating.stand()), true);
        await page.evaluate((phone) => {
          const g = globalThis.__game;
          g.player.root.position.set(100.4 - 126.5, 0, 25.25 - 10.5);
          g.player.root.rotation.y = 0;
          g.walker.sync();
          g.place.cam.yaw = Math.PI;
          g.place.cam.snap(g.player.root.position);
          if (!phone) g.followCamera.aim(0, -0.12);
        }, phone);
        await page.waitForTimeout(600);
        // Native camera-relative movement and a held running jump.
        const forward = phone ? 's' : 'w';
        await page.keyboard.down('Shift');
        await page.keyboard.down(forward);
        await page.waitForTimeout(350);
        await page.keyboard.down('Space');
        await page.keyboard.up(forward);
        await page.keyboard.up('Shift');
        await page.waitForTimeout(350);
        const peak = await page.evaluate(() => ({
          air: globalThis.__game.jump.air,
          height: globalThis.__game.jump.height,
          position: globalThis.__game.player.root.position.toArray(),
        }));
        await page.screenshot({ path: `${out}/${width}-jump.png` });
        await page.keyboard.up('Space');
        await page.waitForTimeout(1000);
        const landed = await page.evaluate(() => ({
          air: globalThis.__game.jump.air,
          height: globalThis.__game.jump.height,
          position: globalThis.__game.player.root.position.toArray(),
          privateMode: globalThis.__settings.privateMode,
        }));
        await page.screenshot({ path: `${out}/${width}-landed.png` });
        fs.writeFileSync(`${out}/${width}-jump.json`, JSON.stringify({ seat, peak, landed }, null, 2));
        assert.equal(peak.air, true, `${width}: jump did not leave the floor`);
        assert.equal(landed.air, false, `${width}: jump failed to land`);
        assert.equal(landed.privateMode, false);
        assert.ok(landed.height > 0.35, `${width}: missed raised stone ${JSON.stringify(landed)}`);
        const continuity = [];
        if (!process.env.JUMP_ONLY) {
          await page.evaluate(async () => {
            const g = globalThis.__game;
            await g.walkTo(100.4 - 126.5, 25.2 - 10.5);
          });
          for (const [to, exitThing, returnThing] of [
            ['east_lane', 'dorm_street', 'dorm_row'],
            ['sports', 'courts_walk', 'onsen_path'],
            ['dorm_commons', 'commons', null],
          ]) {
            await page.evaluate(
              async ({ to, exitThing }) => {
                const g = globalThis.__game;
                const at = g.place.things[exitThing].spot();
                g.player.root.position.set(at[0], 0, at[1]);
                g.walker.sync();
                await g.travel(to);
              },
              { to, exitThing },
            );
            await page.waitForFunction((to) => globalThis.__game.place.name === to && !globalThis.__game.busy, to);
            const destination = await page.evaluate(() => {
              const g = globalThis.__game,
                P = g.place,
                p = g.player.root.position;
              return { name: P.name, navFree: P.nav.free(p.x, p.z), gym: !!P.things.gym, pool: !!P.things.pool };
            });
            assert.equal(destination.name, to);
            assert.equal(destination.navFree, true);
            if (to === 'sports') {
              assert.equal(destination.gym, true);
              assert.equal(destination.pool, true);
            }
            await page.evaluate(async (returnThing) => {
              const g = globalThis.__game;
              if (returnThing) {
                const at = g.place.things[returnThing].spot();
                g.player.root.position.set(at[0], 0, at[1]);
                g.walker.sync();
              }
              await g.travel('east_coast');
            }, returnThing);
            await page.waitForFunction(() => globalThis.__game.place.name === 'east_coast' && !globalThis.__game.busy);
            const back = await page.evaluate(() => {
              const g = globalThis.__game,
                p = g.player.root.position;
              return { name: g.place.name, navFree: g.place.nav.free(p.x, p.z), position: p.toArray() };
            });
            assert.equal(back.navFree, true);
            continuity.push({ destination, back });
            await page.screenshot({ path: `${out}/${width}-return-${to}.png` });
          }
          const landmarks = await page.evaluate(() => {
            const g = globalThis.__game,
              p = g.player.root.position;
            return ['east_coast_lookout', 'east_coast_shrine'].map((id) => {
              const target = g.place.spots[id],
                path = g.place.nav.path(p.x, p.z, ...target),
                end = path.at(-1);
              return {
                id,
                target,
                pathPoints: path.length,
                error: end ? Math.hypot(end[0] - target[0], end[1] - target[1]) : Infinity,
              };
            });
          });
          for (const l of landmarks) assert.ok(l.pathPoints > 0 && l.error < 0.4, JSON.stringify(l));
          fs.writeFileSync(`${out}/${width}-continuity.json`, JSON.stringify({ continuity, landmarks }, null, 2));
        }
        rows.push({ width, route, seat, peak, landed, continuity });
      } finally {
        closing = true;
        await context.close();
      }
    }
  },
  { timeoutMs: 300000, gpuWaitMs: 900000 },
);
fs.writeFileSync(`${out}/report.json`, JSON.stringify({ rows, errors }, null, 2));
assert.deepEqual(errors, []);
console.log(
  `PASS ${process.env.NAV_ONLY ? 'all original and garden routes in both directions' : process.env.DAY2_ONLY ? 'day2 lookout, Hamada and existing sports closure' : process.env.JUMP_ONLY ? 'focused bench and native jump' : 'southern loops, bench, native jump and both return routes'}: ${out}`,
);
