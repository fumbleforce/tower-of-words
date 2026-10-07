import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366),
  phone = width < 600,
  height = phone ? 844 : 860;
const poseOnly = process.env.POSE_ONLY === '1';
const base = process.env.BASE || '.claude/worktrees/codex-shotengai-clearance/game3d';
const out = `game3d/shots/shotengai-clearance/${process.env.ROUND || 'benches-seated'}`;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  `seafront-clearance-${width}`,
  async (browser) => {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: phone, hasTouch: phone }),
      page = await context.newPage(),
      errors = [];
    let closing = false;
    await context.route(
      '**/*',
      scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (m) => errors.push(m) }),
    );
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() =>
      globalThis.localStorage.setItem(
        'amakawa-settings',
        JSON.stringify({ privateMode: false, voiceOn: false, textSpeed: 'instant' }),
      ),
    );
    try {
      await waitForGame(
        page,
        60000,
        () =>
          page.goto(
            `http://127.0.0.1:8771/${base}/index.html?day=2&place=shotengai&mc=${phone ? 'carina' : 'eric'}&q=${process.env.QUALITY || 2}`,
          ),
        'play',
      );
      await page.waitForFunction(() => !globalThis.__game.busy);
      let result = {
        fixture: 'Pose-only QA from actual bench metadata; normal approach has separate hardware evidence',
      };
      if (!poseOnly) {
        result = await page.evaluate(async () => {
          const g = globalThis.__game,
            S = await import('./js/scenes/island-south.js'),
            P = await import('./js/scenes/shotengai/plan.js'),
            { startMoveCheck } = await import('./js/movement/checks.js');
          startMoveCheck(g);
          const x = S.BENCH_X.at(-1),
            points = [
              P.local([x - 2, S.BENCH_Z - 1.5]),
              P.local([x, S.BENCH_Z - 0.95]),
              P.local([x - 1.3, S.BENCH_Z]),
              P.local([x, S.BENCH_Z + 0.8]),
            ];
          const reached = [];
          for (const p of points) {
            await g.walkTo(...p);
            const r = g.player.root.position;
            reached.push({ target: p, actual: [r.x, r.z], error: Math.hypot(r.x - p[0], r.z - p[1]) });
          }
          return { reached, railClearance: S.WALL_Z - 0.25 - (S.BENCH_Z + 0.2) };
        });
        await page.waitForTimeout(900);
        await page.screenshot({ path: `${out}/${width}-sea-approach.png` });
        await page.evaluate(async () => {
          const g = globalThis.__game,
            S = await import('./js/scenes/island-south.js'),
            P = await import('./js/scenes/shotengai/plan.js');
          await g.walkTo(...P.local([S.BENCH_X.at(-1) - 1.3, S.BENCH_Z]));
          await g.walkTo(...P.local([S.BENCH_X.at(-1), S.BENCH_Z - 1]));
        });
        await page.waitForTimeout(900);
        await page.screenshot({ path: `${out}/${width}-shop-approach.png` });
      }
      const seated = [];
      for (const orientation of ['sea', 'shop']) {
        await page.evaluate(
          async ({ orientation, poseOnly }) => {
            const g = globalThis.__game,
              THREE = await import('three'),
              S = await import('./js/scenes/island-south.js');
            let found;
            g.place.space.updateMatrixWorld(true);
            g.place.space.traverse((o) => {
              for (const b of o.userData.seats || []) {
                if (
                  Math.abs(b.x - S.BENCH_X.at(-1)) > 0.001 ||
                  Math.abs(b.z - (S.BENCH_Z + (orientation === 'sea' ? 0.2 : -0.4))) > 0.001
                )
                  continue;
                const point = g.place.space.worldToLocal(o.localToWorld(new THREE.Vector3(b.x, 0.34, b.z)));
                const face = g.place.space.worldToLocal(
                  o.localToWorld(new THREE.Vector3(b.x + Math.sin(b.facing), 0.34, b.z + Math.cos(b.facing))),
                );
                const ry = Math.atan2(face.x - point.x, face.z - point.z);
                found = {
                  x: point.x,
                  z: point.z,
                  top: point.y,
                  ry,
                  out: [point.x + Math.sin(ry) * 0.6, point.z + Math.cos(ry) * 0.6],
                };
              }
            });
            if (!found) throw new Error('real paired bench metadata not found');
            if (poseOnly) {
              g.player.root.position.set(found.out[0], 0, found.out[1]);
              g.walker.sync();
              g.place.cam.snap(g.player.root.position);
            }
            g.place.seats.__bench_clearance_fixture = found;
            await g.hooks.sit({ who: 'eric', at: '__bench_clearance_fixture' });
            g.place.cam.closeOn([found.x, found.z], 1.65);
          },
          { orientation, poseOnly },
        );
        await page.waitForTimeout(1800);
        const measure = await page.evaluate(async () => {
          const g = globalThis.__game,
            THREE = await import('three'),
            S = await import('./js/scenes/island-south.js'),
            P = await import('./js/scenes/shotengai/plan.js');
          const rail = P.local([S.BENCH_X.at(-1), S.WALL_Z - 0.25]),
            inside = P.local([S.BENCH_X.at(-1), S.WALL_Z - 1.25]);
          const nx = inside[0] - rail[0],
            nz = inside[1] - rail[1];
          let minimum = Infinity,
            count = 0;
          const bones = [];
          g.player.root.updateMatrixWorld(true);
          g.player.root.traverse((o) => {
            if (o.isBone && /(leg|foot|toe)/i.test(o.name)) {
              const p = g.place.space.worldToLocal(o.getWorldPosition(new THREE.Vector3()));
              bones.push({ name: o.name, p: p.toArray(), clearance: (p.x - rail[0]) * nx + (p.z - rail[1]) * nz });
            }
            if (!o.isSkinnedMesh) return;
            o.skeleton.update();
            for (let i = 0; i < o.geometry.attributes.position.count; i++) {
              const p = g.place.space.worldToLocal(o.localToWorld(o.getVertexPosition(i, new THREE.Vector3())));
              if (p.y > 0.5) continue;
              count++;
              minimum = Math.min(minimum, (p.x - rail[0]) * nx + (p.z - rail[1]) * nz);
            }
          });
          return { seated: g.player.seated, minimumLowerBodyToRail: minimum, sampledLowerVertices: count, bones };
        });
        seated.push({ orientation, ...measure });
        await page.screenshot({ path: `${out}/${width}-${orientation}-seated.png` });
        await page.evaluate(async () => {
          const g = globalThis.__game;
          await g.hooks.stand({ who: 'eric' });
          g.place.cam.release();
          delete g.place.seats.__bench_clearance_fixture;
        });
      }
      const ambient = await page.evaluate(async () => {
        const g = globalThis.__game,
          S = await import('./js/scenes/island-south.js'),
          P = await import('./js/scenes/shotengai/plan.js');
        const sea = P.local([0, S.WALL_Z]),
          land = P.local([0, S.WALL_Z - 1]);
        const r = g.place.crowd.find(
          (r) =>
            r.root.visible &&
            r.seated &&
            Math.sin(r.root.rotation.y) * (sea[0] - land[0]) + Math.cos(r.root.rotation.y) * (sea[1] - land[1]) > 0.9,
        );
        if (!r) return { available: false };
        g.place.cam.closeOn([r.root.position.x, r.root.position.z], 1.65);
        return { available: true, position: r.root.position.toArray(), yaw: r.root.rotation.y };
      });
      if (ambient.available) {
        await page.waitForTimeout(1200);
        await page.screenshot({ path: `${out}/${width}-ambient-sea-seated.png` });
      }
      const checks = await page.evaluate(() => ({ move: globalThis.__moveCheck, gait: globalThis.__gaitCheck }));
      fs.writeFileSync(
        `${out}/${width}-report.json`,
        JSON.stringify({ result, seated, ambient, checks, errors }, null, 2),
      );
      if (!poseOnly)
        assert.ok(
          result.reached.length === 4 && result.reached.every((p) => p.error < 0.2),
          'native walking reaches both usable bench sides',
        );
      for (const pose of seated) {
        assert.equal(pose.seated, true);
        assert.ok(pose.sampledLowerVertices > 100);
        assert.ok(pose.minimumLowerBodyToRail > 0.1, `${pose.orientation}: posed knees/feet remain clear of the rail`);
      }
      assert.deepEqual(errors, []);
      if (!poseOnly) assert.deepEqual(checks.move.overlaps, []);
      if (!poseOnly) assert.deepEqual(checks.move.spins, []);
      if (!poseOnly) assert.deepEqual(checks.gait.episodes, []);
      console.log('PASS bench clearance', width, {
        poseOnly,
        rail: seated.map((s) => [s.orientation, s.minimumLowerBodyToRail]),
      });
    } finally {
      closing = true;
      await context.close();
    }
  },
  { timeoutMs: 280000 },
);
