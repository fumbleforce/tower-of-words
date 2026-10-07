import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366),
  height = width < 600 ? 844 : 860;
const base = process.env.BASE || 'game3d',
  trial = process.env.TRIAL || '1',
  quality = +(process.env.Q || '2');
const out = new URL(`../shots/diorama-street/${process.env.OUT || Date.now()}-${width}/`, import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const report = { errors: [], frames: [] };
await withBrowserJob(
  'diorama-street-' + width,
  async (browser) => {
    const context = await browser.newContext({
        viewport: { width, height },
        isMobile: width < 600,
        hasTouch: width < 600,
      }),
      page = await context.newPage();
    let closing = false;
    await context.route(
      '**/*',
      scopedRoute({
        publicOnly: true,
        isClosing: () => closing,
        onFailure: (e) => report.errors.push(e),
      }),
    );
    page.on('pageerror', (e) => report.errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') report.errors.push(m.text());
    });
    await page.addInitScript(
      (quality) =>
        globalThis.localStorage.setItem(
          'amakawa-settings',
          JSON.stringify({
            privateMode: false,
            voiceOn: false,
            textSpeed: 'instant',
            quality: ['low', 'medium', 'high'][quality],
          }),
        ),
      quality,
    );
    try {
      await waitForGame(
        page,
        90000,
        () =>
          page.goto(
            `http://127.0.0.1:8771/${base}/index.html?day=2&place=forecourt&mc=eric&q=${quality}&perf&diorama=${trial}`,
          ),
        'play',
      );
      await page.waitForFunction(() => !globalThis.__game.busy);
      if (trial === '0' && width >= 600) {
        await page.evaluate(async () => {
          const T = await import('three'),
            g = globalThis.__game,
            cam = g.place.cam;
          // Only match the camera for the material/performance comparison; retain stock scene and grade.
          cam.elev = T.MathUtils.degToRad(48);
          cam.yaw = 0.35;
          cam.fit(
            globalThis.innerWidth / globalThis.innerHeight,
            [new T.Vector3(-5.7, 0, -5.7 * 0.66), new T.Vector3(5.7, 0, 5.7 * 0.66), new T.Vector3(0, 3, 0)],
            new T.Vector3(),
            { follow: true, clamp: [-1, 32, -12, 14], lead: -0.7 },
          );
          await g.walkTo(9.7, 9.8);
          cam.snap(g.player.root.position);
        });
        report.matchedDesktopCamera = true;
      }
      report.setup = await page.evaluate(async () => {
        const P = await import('./js/scenes/forecourt/plan.js'),
          g = globalThis.__game;
        const groups = [],
          glazing = [];
        g.place.space.traverse((o) => {
          if (o.userData.diorama) groups.push(o.userData.diorama);
          if (o.isMesh && /^(ho:.*[Gg]lass|station:(glass|roof))/.test(o.name))
            glazing.push({
              name: o.name,
              transparent: o.material.transparent,
              color: o.material.color?.getHexString(),
              roughness: o.material.roughness,
              metalness: o.material.metalness,
              env: !!o.material.envMap,
              map: !!o.material.map,
            });
        });
        return {
          station: P.STATION,
          bikes: P.BIKES,
          garden: P.GARDEN,
          groups,
          glazing,
        };
      });
      if (trial === '1') {
        const panes = report.setup.glazing.filter((p) => p.name !== 'station:roof');
        assert(
          panes.length >= 3 && panes.every((p) => p.env && p.map),
          'All station and office panes receive the trial glazing',
        );
      }
      if (process.env.PROBE) {
        await page.waitForTimeout(1200);
        report.probe = await page.evaluate(async () => {
          const T = await import('three'),
            g = globalThis.__game,
            r = new T.Raycaster(),
            lights = [];
          g.place.scene.traverse((o) => {
            if (o.isLight)
              lights.push({
                type: o.type,
                intensity: o.intensity,
                position: o.getWorldPosition(new T.Vector3()).toArray(),
              });
          });
          const rays = [];
          for (const [x, y] of [
            [0.4, 0.18],
            [0.39, 0.14],
            [0.402, 0.23],
          ]) {
            r.setFromCamera(new T.Vector2(x * 2 - 1, 1 - y * 2), g.place.camera);
            rays.push(
              r
                .intersectObjects(g.place.scene.children, true)
                .slice(0, 5)
                .map((h) => {
                  const m = h.object.material;
                  return {
                    name: h.object.name,
                    point: h.point.toArray(),
                    type: m?.type,
                    color: m?.color?.getHexString(),
                    emissive: m?.emissive?.getHexString(),
                    intensity: m?.emissiveIntensity,
                    userData: h.object.userData,
                  };
                }),
            );
          }
          return { lights, rays };
        });
      }
      if (process.env.TRIP) {
        await page.evaluate(() => globalThis.__game.travel('gate'));
        await page.waitForFunction(() => !globalThis.__game.busy);
        assert.equal(await page.evaluate(() => globalThis.__game.place.name), 'gate');
        await page.evaluate(() => globalThis.__game.travel('forecourt'));
        await page.waitForFunction(() => !globalThis.__game.busy && !globalThis.__game.place.cam.releasing);
        report.stationReturn = await page.evaluate(() => {
          const g = globalThis.__game;
          return {
            place: g.place.name,
            yaw: g.place.cam.yaw,
            elev: g.place.cam.elev,
            shadowType: g.renderer.shadowMap.type,
            position: g.player.root.position.toArray(),
          };
        });
        assert.equal(report.stationReturn.place, 'forecourt');
        assert.equal(report.stationReturn.shadowType, 1);
        if (trial === '1') {
          assert.equal(report.stationReturn.yaw, 0.35);
          assert.ok(Math.abs(report.stationReturn.elev - (48 * Math.PI) / 180) < 1e-8);
        }
        await page.screenshot({ path: out + 'station-return.png' });
        await page.evaluate(() => globalThis.__game.walkTo(9.7, 9.8));
      }
      for (const [name, point] of [
        ['arrival', null],
        ['bikes', [10, 7.5]],
        ['south', [9.7, 10]],
        ['street', [9.7, 10.65]],
        ['garden', [17, 2.15]],
      ]) {
        if (point)
          await page.evaluate(async (p) => {
            await globalThis.__game.walkTo(...p);
          }, point);
        if (point) {
          const at = await page.evaluate(() => globalThis.__game.player.root.position.toArray());
          assert.ok(Math.hypot(at[0] - point[0], at[2] - point[1]) < 0.2, `${name}: target not reached ${at}`);
        }
        await page.waitForTimeout(1200);
        assert.equal(await page.evaluate(() => globalThis.__game.place.name), 'forecourt');
        await page.screenshot({ path: out + name + '.png' });
        if (process.env.RAY && name === 'street') {
          report.crownRays = await page.evaluate(async () => {
            const T = await import('three'),
              g = globalThis.__game,
              r = new T.Raycaster(),
              rows = [];
            for (const [x, y] of [
              [270, 750],
              [300, 780],
              [270, 710],
              [320, 770],
              [350, 740],
            ]) {
              r.setFromCamera(
                new T.Vector2((x / globalThis.innerWidth) * 2 - 1, 1 - (y / globalThis.innerHeight) * 2),
                g.place.camera,
              );
              rows.push({
                pixel: [x, y],
                hits: r
                  .intersectObjects(g.place.scene.children, true)
                  .slice(0, 6)
                  .map((h) => ({
                    name: h.object.name,
                    point: h.point.toArray(),
                    surface: h.object.userData.surf,
                    color: h.object.material?.color?.getHexString(),
                    instance: h.instanceId,
                    type: h.object.type,
                    vertices: h.object.geometry.attributes.position.count,
                  })),
              });
            }
            return rows;
          });
        }
        report.frames.push(
          await page.evaluate((name) => {
            const g = globalThis.__game;
            return {
              name,
              position: g.player.root.position.toArray(),
              draw: globalThis.__perfReport?.(),
              place: g.place.name,
            };
          }, name),
        );
      }
      report.rackLight = await page.evaluate(async () => {
        const { sim } = await import('./js/sim.js'),
          { flags } = await import('./js/narrative/state.js'),
          T = await import('three'),
          g = globalThis.__game;
        let rack;
        g.place.scene.traverse((o) => {
          if (
            (o.isPointLight || o.isSpotLight) &&
            o.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(6.35, 2.3, 6.4)) < 0.01
          )
            rack = o;
        });
        if (!rack) throw new Error('Rack lamp missing');
        const oldPeriod = sim.period,
          oldFlag = flags.going_home,
          values = [];
        for (const [period, home] of [
          ['morning', true],
          ['evening', true],
          ['morning', true],
          ['evening', false],
        ]) {
          sim.period = period;
          flags.going_home = home;
          g.place.onPeriod(period);
          values.push(rack.intensity);
        }
        sim.period = oldPeriod;
        flags.going_home = oldFlag;
        g.place.onPeriod(oldPeriod);
        return values;
      });
      assert.deepEqual(report.rackLight, [0, 14, 0, 0]);
      assert.deepEqual(report.errors, []);
      report.pass = true;
    } catch (e) {
      report.failure = e.stack;
      fs.writeFileSync(out + 'report.json', JSON.stringify(report, null, 2));
      await page.screenshot({ path: out + 'failure.png', timeout: 5000 }).catch(() => {});
      throw e;
    } finally {
      fs.writeFileSync(out + 'report.json', JSON.stringify(report, null, 2));
      closing = true;
      await context.close();
    }
  },
  { timeoutMs: 280000 },
);
console.log('DIORAMA', report.pass, out);
