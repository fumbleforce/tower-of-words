// In-game check for Review crowd-pilot-2 (#232): the candidate people in the real game (index.html, test capture
// mode), built by the game's own loader (avatar.js meshyFrom wrapped by cast3d.js meshyPerson, as the cast), at the
// place's scale, and walked and run by the game's own scripted mover (movement/scripted.js walkRig, routed over the
// place's walk grid) across the camera's view, one at a time, while the others stand in idle. The game's gait check
// (movement/gait-watch.js: stepping on the spot, sliding) watches everyone in view the whole time. Mio and Kenji walk
// the same route for comparison. Nothing is added to the game's files: the candidates load from art/parts/.
//   node art/candidates/crowd-pilot-2/game-walk.mjs <cfg url path> <out dir> [place=forecourt] [w h]
// cfg: [{ id, label, dir, idle, height }] (paths from the served root). Writes <out>/<id>-walk|run/frame-NN.png with
// boxes.json, <out>/<place>-wide.png and <out>/report.json (the gait check per person, page errors).
import fs from 'node:fs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const WT = 'http://127.0.0.1:8771/.claude/worktrees/agent-a65d0e4170275dcf7/';
const [cfg, out, place = 'forecourt', W = 1366, H = 860] = process.argv.slice(2);
const FRAMES = +(process.env.FRAMES || 16), EVERY = +(process.env.EVERY || 0.1); // game seconds between frames
fs.mkdirSync(out, { recursive: true });
const errors = [];
await withBrowserJob('crowd-pilot-2-game', async (browser) => {
  const page = await browser.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${WT}game3d/index.html?cap&q=1&place=${place}`, { timeout: 90000 });
  await page.waitForFunction(() => globalThis.__done, null, { timeout: 180000 });
  const who = await page.evaluate(async (cfgUrl) => {
    const THREE = await import('three');
    const g = globalThis.__game, P = g.place;
    const { GLTFLoader } = await import('./vendor/loaders/GLTFLoader.js');
    const { meshyFrom } = await import('./js/avatar.js');
    const { meshyPerson } = await import('./js/cast3d.js');
    const { startGaitCheck } = await import('./js/movement/gait-watch.js');
    const { reachableNear } = await import('./js/movement/navigation.js');
    globalThis.__run = true;
    // daylight with the crowd about, as the game's own gait check runs it
    const { sim } = await import('./js/sim.js');
    sim.period = 'lunch';
    P.onPeriod?.('lunch');
    P.ambient?.enter('lunch');
    const gl = new GLTFLoader();
    const list = await fetch(cfgUrl).then((r) => r.json());
    const K = P.charScale || 1, e = g.player.root.position;
    // the camera's ground directions: people walk across the view (right), a little in front of Eric (fwd)
    const f = new THREE.Vector3();
    P.camera.getWorldDirection(f);
    f.y = 0;
    f.normalize();
    const rt = new THREE.Vector3(-f.z, 0, f.x);
    const spot = (a, b) => {
      const x = e.x + rt.x * a * K + f.x * b * K, z = e.z + rt.z * a * K + f.z * b * K;
      return reachableNear(P.nav, e.x, e.z, x, z) || [x, z];
    };
    const people = {};
    let i = 0;
    for (const p of list) {
      const files = await Promise.all([gl.loadAsync(p.dir + 'walk.glb'), gl.loadAsync(p.dir + 'run.glb'),
        fetch(p.idle).then((r) => r.json()).then((j) => THREE.AnimationClip.parse(j)), gl.loadAsync(p.dir + 'sit.glb'),
        new THREE.TextureLoader().loadAsync(p.dir + 'base.webp')]);
      const m = meshyPerson(meshyFrom(p.id, [...files, null], { height: p.height }));
      m.root.scale.setScalar(K);
      const [x, z] = spot(-2.4 + i * 1.2, 2.6);
      m.root.position.set(x, 0, z);
      m.root.rotation.y = Math.atan2(-f.x, -f.z); // facing the camera
      P.space.add(m.root);
      P.people['cand_' + p.id] = m;
      people[p.id] = m;
      i++;
    }
    const mio = g.mioNpc;
    if (!mio.root.parent) P.space.add(mio.root);
    mio.root.visible = true;
    mio.root.scale.setScalar(K);
    const m0 = spot(-2.4 + i * 1.2, 2.6);
    mio.root.position.set(m0[0], 0, m0[1]);
    people.mio = mio;
    globalThis.__cand = { people, spot, K };
    startGaitCheck(g);
    await new Promise((r) => setTimeout(r, 1500));
    return Object.keys(people);
  }, cfg);
  await page.screenshot({ path: `${out}/${place}-wide.png` });
  // one at a time: walk across the view, wait, run back; frames while each moves
  for (const id of who) {
    for (const [mode, from, to, speed] of [['walk', -3.2, 3.2, 1.2], ['run', 3.2, -3.2, 3.4]]) {
      await page.evaluate(async ({ id, mode, from, to, speed }) => {
        const { walkRig } = await import('./js/move.js');
        const { people, spot } = globalThis.__cand;
        const g = globalThis.__game, m = people[id];
        if (mode === 'walk') {
          const [x, z] = spot(from, 1.3);
          await walkRig(g, m, [x, z], { speed: 1.0 }); // to the start of the line
          await new Promise((r) => setTimeout(r, 900));
        }
        globalThis.__move = walkRig(g, m, spot(to, 1.3), { speed, run: mode === 'run' }).then(() => (globalThis.__move = null));
        await new Promise((r) => setTimeout(r, mode === 'run' ? 250 : 500)); // up to speed
      }, { id, mode, from, to, speed });
      const dir = `${out}/${id}-${mode}`;
      fs.mkdirSync(dir, { recursive: true });
      const boxes = [];
      // frames on the game's own clock (?cap: __advance steps game time exactly), a crop round the person each
      await page.evaluate(() => (globalThis.__run = false));
      for (let k = 0; k < FRAMES; k++) {
        const b = await page.evaluate(({ id, dt }) => {
          globalThis.__advance(dt);
          const g = globalThis.__game, cam = g.place.camera, r = globalThis.__cand.people[id];
          const p = r.root.getWorldPosition(r.root.position.clone()), s = r.root.getWorldScale(r.root.position.clone()).x;
          const px = (v) => [((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight];
          return { t: g.t, state: r.state, moving: !!globalThis.__move, feet: px(p.clone().project(cam)),
            head: px(p.clone().setY(p.y + 1.25 * s).project(cam)) };
        }, { id, dt: EVERY });
        boxes.push(b);
        const h = Math.max(40, b.feet[1] - b.head[1]);
        const x = Math.max(0, b.feet[0] - 0.75 * h), y = Math.max(0, b.head[1] - 0.25 * h);
        await page.screenshot({ path: `${dir}/frame-${String(k).padStart(2, '0')}.png`,
          clip: { x, y, width: Math.min(+W - x, 1.5 * h), height: Math.min(+H - y, 1.45 * h) } });
        if (k === FRAMES >> 1) await page.screenshot({ path: `${dir}/wide.png` });
      }
      await page.evaluate(() => (globalThis.__run = true));
      fs.writeFileSync(`${dir}/boxes.json`, JSON.stringify(boxes));
      await page.waitForFunction(() => !globalThis.__move, null, { timeout: 30000 }).catch(() => errors.push(`${id} ${mode}: did not arrive`));
      await page.waitForTimeout(900);
    }
  }
  const rep = await page.evaluate(() => {
    const C = globalThis.__gaitCheck;
    const people = Object.fromEntries(Object.entries(C.people).map(([id, p]) => {
      const s = [...p.ratio].sort((a, b) => a - b);
      return [id, { windows: p.windows, walking: p.walking, bad: p.bad, medianRatio: s.length ? s[s.length >> 1] : null, ratios: s }];
    }));
    return { windows: C.windows, reports: C.reports(), people };
  });
  fs.writeFileSync(`${out}/report.json`, JSON.stringify({ place, ...rep, errors }, null, 1));
  console.log(JSON.stringify({ reports: rep.reports, people: Object.fromEntries(Object.entries(rep.people).map(([k, v]) => [k, { walking: v.walking, bad: v.bad, median: v.medianRatio }])) }, null, 1));
}, { timeoutMs: 1500000, loadWaitMs: 900000, gpuWaitMs: 900000 });
for (const e of errors) console.log('ERROR', e);
console.log(errors.length ? 'FAIL' : 'done', out);
