// Observe the production renderer; never repair world matrices or skeleton palettes.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const base = process.env.BASE || 'game3d',
  mode = process.env.MODE || 'normal';
const out = process.env.OUT || `/tmp/codex-crowd-bag-live-${Date.now()}`;
const sourceDir = process.env.SOURCE_DIR || new URL('../js/crowd/', import.meta.url).pathname;
const seconds = Number(process.env.SECONDS || 8),
  width = Number(process.env.WIDTH || 1366),
  fixture = process.env.FIXTURE || 'population',
  focusKind = process.env.FOCUS || 'briefcase';
const report = {
  mode,
  fixture,
  focusKind,
  sourceDir,
  observerSha256: createHash('sha256')
    .update(fs.readFileSync(new URL(import.meta.url)))
    .digest('hex'),
  sourceSha256: {},
  errors: [],
  blocked: [],
  frames: [],
};
fs.mkdirSync(out, { recursive: true });
const sources = Object.fromEntries(
  ['looks', 'motion', 'stops', 'bag-pose'].map((n) => {
    const body = fs.readFileSync(path.join(sourceDir, n + '.js'), 'utf8');
    fs.mkdirSync(path.join(out, 'source'), { recursive: true });
    fs.writeFileSync(path.join(out, 'source', n + '.js'), body);
    report.sourceSha256[n] = createHash('sha256').update(body).digest('hex');
    return [n, body];
  }),
);
await withBrowserJob(
  'crowd-bag-live',
  async (browser) => {
    const context = await browser.newContext({
      viewport: { width, height: width < 700 ? 844 : 860 },
    });
    let closing = false;
    await context.route(
      '**/*',
      scopedRoute({
        publicOnly: true,
        isClosing: () => closing,
        onFailure: (e) => report.errors.push(e),
      }),
    );
    if (mode === 'bridge')
      for (const glob of ['**/assets/characters/crowd-*/**', '**/assets/characters/chibi-gen-suit/**'])
        await context.route(glob, (route) => {
          report.blocked.push(route.request().url());
          return route.fulfill({
            status: 404,
            body: 'Diagnostic bridge fallback',
          });
        });
    for (const [n, body] of Object.entries(sources))
      await context.route(`**/js/crowd/${n}.js*`, (route) => route.fulfill({ contentType: 'text/javascript', body }));
    const page = await context.newPage();
    page.on('pageerror', (e) => report.errors.push(e.message));
    await page.addInitScript(() =>
      globalThis.localStorage.setItem(
        'amakawa-settings',
        JSON.stringify({
          v: 2,
          privateMode: false,
          voiceOn: false,
          textSpeed: 'instant',
        }),
      ),
    );
    try {
      await waitForGame(
        page,
        90000,
        () =>
          page.goto(
            `http://127.0.0.1:8771/${base}/index.html?day=2&place=plaza&cap&chibi=${mode === 'bridge' ? 1 : 0}`,
          ),
        'play',
      );
      await page.waitForFunction(() => !globalThis.__game.busy);
      report.setup = await page.evaluate(
        async ({ fixture, focusKind }) => {
          const g = globalThis.__game,
            T = await import('three'),
            { legClearance } = await import('./tools/crowd-bag-clearance.mjs'),
            rows = [],
            actors = [];
          g.sim.period = 'early';
          g.place.ambient.enter('early');
          globalThis.__run = true;
          let routeFixture = null;
          if (fixture === 'bridge-route') {
            const pool = g.place.ambient.pool,
              target = pool.find((b) => b.r.bridge && Math.round(b.r.ph / 1.37) % 4 === 0),
              donor = pool.find((b) => b.state === 'walk' && b.r.kind === 'office' && !b.r.bridge);
            if (!target || !donor) throw Error('Bridge route fixture bodies unavailable');
            const rig = target.r;
            routeFixture = {
              target: pool.indexOf(target),
              donor: pool.indexOf(donor),
              fromState: target.state,
              line: donor.line,
            };
            rig.root.position.copy(donor.r.root.position);
            rig.root.quaternion.copy(donor.r.root.quaternion);
            rig.root.visible = true;
            Object.assign(target, donor, { r: rig });
            donor.state = 'off';
            donor.r.root.visible = false;
          }

          // Diagnostic camera only: retain the actual unpaused population and animation loop.
          g.place.cam.wanted = function () {
            return globalThis.__liveBags?.focus
              ? [
                  new T.Vector3()
                    .setFromMatrixPosition(composed(globalThis.__liveBags.focus.r.root))
                    .add(new T.Vector3(0, 0.45, 0)),
                  4,
                ]
              : this.close
                ? [this.close.target, this.fitDist / this.close.zoom]
                : [this.base, this.fitDist];
          };
          const delta = (a, b) => Math.max(...a.elements.map((v, i) => Math.abs(v - b.elements[i])));
          const composed = (o) => {
            const chain = [];
            for (let p = o; p; p = p.parent) chain.unshift(p);
            const m = new T.Matrix4();
            for (const p of chain)
              m.multiply(p.matrixAutoUpdate ? new T.Matrix4().compose(p.position, p.quaternion, p.scale) : p.matrix);
            return m;
          };
          for (const [id, b] of g.place.ambient.pool.entries()) {
            const r = b.r,
              bag = r.root.getObjectByName('crowd-bag');
            if (!bag) continue;
            const entry = {
              id,
              base: r.base || null,
              index: Math.round(r.ph / 1.37),
              kind: r.kind,
              variant: Math.round(r.ph / 1.37) % 4,
              approved: r.approvedCrowd || null,
              bridge: !!r.bridge,
              meshy: !!r.meshy,
              scale: r.root.scale.toArray(),
              b,
              r,
              bag,
            };
            actors.push(entry);
            const body = bag.children[0],
              handle = bag.children[1],
              grip = handle.geometry.boundingBox.getCenter(new T.Vector3());
            let handLocal = bag.parent.parent?.name === 'LeftHand' ? bag.parent.position.clone() : null;
            let drawnBag = null;
            const before = body.onAfterRender;
            body.onAfterRender = function (...args) {
              before?.apply(this, args);
              if (rows.length >= 12000) return;
              if (bag.parent.parent?.name === 'LeftHand') handLocal = bag.parent.position.clone();
              const up = new T.Vector3(0, 1, 0).transformDirection(body.matrixWorld);
              drawnBag = {
                frame: args[0].info.render.frame,
                matrix: body.matrixWorld.clone(),
              };
              rows.push({
                id,
                part: 'bag',
                frame: args[0].info.render.frame,
                t: g.t,
                paused: !!g.paused,
                state: b.state,
                seated: r.seated,
                walk: r._walk,
                position: r.root.position.toArray(),
                yaw: r.root.rotation.y,
                grip: grip.clone().applyMatrix4(body.matrixWorld).toArray(),
                matrix: body.matrixWorld.toArray(),
                matrixError: delta(body.matrixWorld, composed(body)),
                verticalTilt: Math.acos(Math.min(1, Math.abs(up.y))),
                local: bag.parent.position.toArray(),
              });
            };
            r.root.traverse((mesh) => {
              if (!mesh.isSkinnedMesh) return;
              const prior = mesh.onAfterRender;
              const drawnBody = {
                  geometry: body.geometry,
                  matrixWorld: new T.Matrix4(),
                  updateWorldMatrix() {},
                },
                vertex = new T.Vector3(),
                weighted = new T.Vector3(),
                boneMatrix = new T.Matrix4();
              const rawMesh = {
                isMesh: true,
                isSkinnedMesh: true,
                name: mesh.name,
                geometry: mesh.geometry,
                skeleton: mesh.skeleton,
                matrixWorld: mesh.matrixWorld,
                getVertexPosition(i, result) {
                  vertex.fromBufferAttribute(mesh.geometry.attributes.position, i).applyMatrix4(mesh.bindMatrix);
                  result.set(0, 0, 0);
                  for (let k = 0; k < 4; k++) {
                    const weight = mesh.geometry.attributes.skinWeight.getComponent(i, k);
                    if (!weight) continue;
                    const bone = mesh.geometry.attributes.skinIndex.getComponent(i, k);
                    boneMatrix.fromArray(mesh.skeleton.boneMatrices, bone * 16);
                    result.addScaledVector(weighted.copy(vertex).applyMatrix4(boneMatrix), weight);
                  }
                  return result.applyMatrix4(mesh.bindMatrixInverse);
                },
              };
              let clearance = null;
              try {
                clearance = legClearance(
                  T,
                  {
                    model: {
                      traverse(fn) {
                        fn(rawMesh);
                      },
                    },
                  },
                  { children: [drawnBody] },
                );
              } catch (e) {
                if (!e.message.includes('No leg triangles')) throw e;
              }
              let lastClearance = -1;

              mesh.onAfterRender = function (...args) {
                prior?.apply(this, args);
                if (rows.length >= 12000) return;
                const sk = mesh.skeleton,
                  palette = [];
                for (let i = 0; i < sk.bones.length; i++) {
                  const bone = sk.bones[i];
                  if (!/Hand|Leg|Foot/.test(bone.name)) continue;
                  const raw = new T.Matrix4().fromArray(sk.boneMatrices, i * 16),
                    expected = new T.Matrix4().multiplyMatrices(bone.matrixWorld, sk.boneInverses[i]);
                  const palm =
                    bone.name === 'LeftHand' && handLocal
                      ? handLocal
                          .clone()
                          .applyMatrix4(new T.Matrix4().multiplyMatrices(raw, sk.boneInverses[i].clone().invert()))
                      : null;
                  palette.push({
                    name: bone.name,
                    palm: palm?.toArray(),
                    error: delta(raw, expected),
                    worldError: delta(bone.matrixWorld, composed(bone)),
                    raw: raw.toArray(),
                    expected: expected.toArray(),
                  });
                }
                let renderedClearance = null;
                if (clearance && drawnBag?.frame === args[0].info.render.frame && g.t - lastClearance >= 0.1) {
                  drawnBody.matrixWorld.copy(drawnBag.matrix);
                  renderedClearance = clearance();
                  lastClearance = g.t;
                }
                rows.push({
                  renderedClearance,
                  id,
                  part: 'skin',
                  frame: args[0].info.render.frame,
                  t: g.t,
                  paused: !!g.paused,
                  state: b.state,
                  seated: r.seated,
                  walk: r._walk,
                  mesh: mesh.name,
                  meshUuid: mesh.uuid,
                  geometryUuid: mesh.geometry.uuid,
                  observerGeometryUuid: rawMesh.geometry.uuid,
                  matrix: mesh.matrixWorld.toArray(),
                  palette,
                });
              };
            });
          }
          globalThis.__liveBags = { actors, rows, focusKind, fixture };
          return {
            routeFixture,
            paused: !!g.paused,
            period: g.sim.period,
            periodFixture: 'actual early-period population configuration',
            characterScale: (await import('./js/character-scale.js')).CHARACTER_SCALE,
            gpu: g.renderer.userData.gpu,
            actors: actors.map(({ b, r, bag, ...x }) => ({
              ...x,
              state: b.state,
              visible: r.root.visible,
              seated: r.seated,
              position: r.root.position.toArray(),
            })),
          };
        },
        { fixture, focusKind },
      );
      for (let i = 0; i < seconds; i++) {
        const focus = await page.evaluate(() => {
          const g = globalThis.__game,
            a = globalThis.__liveBags.actors;
          const actor =
            (globalThis.__liveBags.focusKind === 'briefcase-b'
              ? a.find((x) => x.r.root.visible && x.b.state === 'walk' && x.kind === 'office' && x.variant === 1)
              : null) ||
            (globalThis.__liveBags.focusKind === 'tote'
              ? a.find((x) => x.r.root.visible && x.b.state === 'walk' && x.kind === 'office' && x.variant === 2)
              : null) ||
            a.find((x) => x.r.root.visible && x.b.state === 'walk' && x.bridge && x.variant === 0) ||
            a.find((x) => x.r.root.visible && x.b.state === 'walk' && x.kind === 'office' && x.variant === 0) ||
            a.find((x) => x.r.root.visible && x.b.state === 'walk' && x.kind === 'office') ||
            a.find((x) => x.r.root.visible);
          if (!actor) return null;
          globalThis.__liveBags.focus = actor;
          const p = actor.r.root.position;
          g.place.cam.closeOn([p.x, p.z], g.place.cam.fitDist / 4, 0.45);
          g.place.cam.snap(g.player.root.position);
          return {
            id: actor.id,
            kind: actor.kind,
            variant: actor.variant,
            approved: actor.approved,
            bridge: actor.bridge,
            state: actor.b.state,
            seated: actor.r.seated,
            position: p.toArray(),
          };
        });
        await page.waitForTimeout(1000);
        const file = `${String(i).padStart(2, '0')}-live.png`;
        await page.screenshot({ path: path.join(out, file) });
        report.frames.push({ file, focus });
      }
      report.observation = await page.evaluate(() => ({
        rows: globalThis.__liveBags.rows,
        paused: globalThis.__game.paused,
        endTime: globalThis.__game.t,
      }));
      const rows = report.observation.rows;
      report.live = {
        firstTime: rows[0]?.t,
        lastTime: rows.at(-1)?.t,
        walkingRows: rows.filter((r) => r.walk && r.state === 'walk').length,
      };
      if (!(report.live.lastTime > report.live.firstTime + 1) || !report.live.walkingRows)
        throw new Error('Live fixture did not advance with walking draw samples');
    } catch (error) {
      report.error = error.stack;
      await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
      throw error;
    } finally {
      fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
      closing = true;
      await context.close();
    }
  },
  { timeoutMs: 180000, gpuWaitMs: 1200000 },
);
