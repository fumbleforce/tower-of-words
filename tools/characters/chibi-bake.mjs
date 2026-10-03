// Bake the game's clips onto the Meshy chibis (game3d/assets/characters/chibi-<id>/model.glb, made by chibi_game.py)
// with the parts viewer's retarget (tools/characters/parts/retarget.js), as Review chibi-cast-meshy-1 showed them.
// Eric and the men take Eric's game clips (walk, run, sit, the approved idle, the phone pose and his four gestures);
// Mio and the women take Mio's; so do the generic islanders (gen-<base>, Review chibi-crowd-1), at half the frame rate
// and with four decimals, since a crowd loads eight of them. The legs keep only STEP of the walk and run swing, for the
// short chibi legs. Writes
// chibi-<id>/clips.json: { gait, clips: { name: AnimationClip JSON } }, gait being the walk and run speeds at which
// the feet keep pace with the ground (the source's, scaled by the stride measured on both).
// Usage: node tools/characters/chibi-bake.mjs [id ...]   (all by default; files are served straight from this checkout)
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../lib/browser-job.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const STEP = 0.85;
const LEAN = 0.5; // share of the walk's and run's lean kept in the hips, spine, neck and head
const SOURCES = {
  eric: {
    dir: '/game3d/assets/eric/',
    idle: 'eric',
    phone: '/game3d/assets/characters/eric/phone.json',
    gestures: ['bow', 'wave', 'shrug', 'nod'].map((g) => [g, `/game3d/assets/characters/eric/${g}.json`]),
    h: 1.2,
    gait: { walkV: 0.44, runV: 1.1, runOff: 0.03 },
  },
  mio: {
    dir: '/game3d/assets/mio/',
    idle: 'mio',
    phone: '/game3d/assets/characters/mio/phone.json',
    gestures: [],
    h: 1.12,
    gait: { walkV: 0.47, runV: 0.77, runOff: 0.04 },
  },
};
// the same standing heights as game3d/js/chibi.js
export const CHIBI_HEIGHTS = { eric: 1.2, mio: 1.12, kuro: 1.12, mori: 1.09, kenji: 1.12, emi: 1.09, guard: 1.09 };
Object.assign(CHIBI_HEIGHTS, { kuroda: 1.09, aoi: 1.09, rei: 1.09 });
// the generics: [base, clips from, standing height] (game3d/js/chibi-crowd.js has the same heights)
export const GEN = [
  ['suit', 'eric', 1.1],
  ['shirt', 'eric', 1.1],
  ['blouse', 'mio', 1.06],
  ['cardigan', 'mio', 1.03],
  ['polo', 'eric', 1.06],
  ['hoodie', 'mio', 1.05],
  ['apron', 'mio', 1.06],
  ['dock', 'eric', 1.11],
];
for (const [b, , h] of GEN) CHIBI_HEIGHTS['gen-' + b] = h;
const ALL = { eric: 'eric', mio: 'mio', kuro: 'mio', mori: 'eric', kenji: 'eric', emi: 'mio', guard: 'eric' };
Object.assign(ALL, { kuroda: 'eric', aoi: 'mio', rei: 'mio' });
for (const [b, from] of GEN) ALL['gen-' + b] = from;
const pick = process.argv.slice(2);
const TARGETS = Object.fromEntries(Object.entries(ALL).filter(([id]) => !pick.length || pick.includes(id)));
const HOST = 'http://chibi.bake/';
const MIME = { js: 'text/javascript', json: 'application/json', glb: 'model/gltf-binary', html: 'text/html' };

const out = await withBrowserJob('chibi-bake', async (browser) => {
  const page = await browser.newPage();
  page.on('console', (m) => console.log('page:', m.text()));
  await page.route(HOST + '**', (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === '/') {
      return route.fulfill({
        contentType: 'text/html',
        body: `<script type="importmap">{"imports":{"three":"/game3d/vendor/three/three.module.js","three/addons/":"/game3d/vendor/"}}</script>`,
      });
    }
    const f = path.join(ROOT, decodeURIComponent(u.pathname));
    if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ body: fs.readFileSync(f), contentType: MIME[f.split('.').pop()] || 'application/octet-stream' });
  });
  await page.goto(HOST);
  return page.evaluate(
    async ({ SOURCES, TARGETS, HEIGHTS, STEP, LEAN }) => {
      const THREE = await import('three');
      const { GLTFLoader } = await import('/game3d/vendor/loaders/GLTFLoader.js');
      const R = await import('/tools/characters/parts/retarget.js');
      const loader = new GLTFLoader();
      const json = (u) => fetch(u).then((r) => r.json());
      const parse = (j) => THREE.AnimationClip.parse(j);
      const heightOf = (o) => {
        const b = new THREE.Box3().setFromObject(o);
        return b.max.y - b.min.y;
      };
      const round = (a, k) => Array.from(a, (v) => Math.round(v * k) / k);
      const results = {};
      for (const [id, sid] of Object.entries(TARGETS)) {
        const S = SOURCES[sid];
        const src = (await loader.loadAsync(S.dir + 'walk.glb')).scene;
        const clips = {
          walk: (await loader.loadAsync(S.dir + 'walk.glb')).animations[0],
          run: (await loader.loadAsync(S.dir + 'run.glb')).animations[0],
          sit: (await loader.loadAsync(S.dir + 'sit.glb')).animations[0],
          idle: parse(await json(`/game3d/assets/characters/relaxed-idle-${S.idle}.json`)),
          phone: parse(await json(S.phone)),
        };
        // the generics only nod (talked to in passing: gameplay/idle-talk.js)
        for (const [g, u] of S.gestures) if (!id.startsWith('gen-') || g === 'nod') clips[g] = parse(await json(u));
        const model = (await loader.loadAsync(`/game3d/assets/characters/chibi-${id}/model.glb`)).scene;
        const srcRest = [];
        src.traverse((o) => o.isBone && srcRest.push([o, o.position.clone(), o.quaternion.clone()]));
        const rt = R.bindRetarget(src, model);
        const HS = heightOf(src),
          HT = heightOf(model);
        const mixer = new THREE.AnimationMixer(src);
        const wp = (o) => o.getWorldPosition(new THREE.Vector3());
        const baked = {},
          stride = {};
        for (const [name, clip] of Object.entries(clips)) {
          for (const [b, p, q] of srcRest) b.position.copy(p), b.quaternion.copy(q);
          R.resetPose(rt);
          mixer.stopAllAction();
          const a = mixer.clipAction(clip);
          a.reset().play();
          const gen = id.startsWith('gen-');
          const fps = name === 'sit' ? 10 : ['walk', 'run', 'idle'].includes(name) && !gen ? 30 : 15;
          const r5 = (a) => round(a, gen ? 1e4 : 1e5);
          const n = Math.max(0, Math.round(clip.duration * fps));
          const times = Array.from({ length: n + 1 }, (_, i) => Math.min(clip.duration, i / fps));
          const moving = name === 'walk' || name === 'run';
          const legShare = moving ? STEP : 1,
            upperShare = moving ? LEAN : 1;
          const hips = name === 'sit' ? 'follow' : 'ground';
          const tracks = rt.map.map((b) => ({ b, v: [] }));
          const hipsV = [];
          const zs = { s: [], t: [] };
          for (const t of times) {
            a.time = t;
            mixer.update(0);
            src.updateMatrixWorld(true);
            R.applyRetarget(rt, { legShare, upperShare, hips });
            model.updateMatrixWorld(true);
            for (const tr of tracks) tr.v.push(...tr.b.t.quaternion.toArray());
            hipsV.push(...rt.T.Hips.position.toArray());
            zs.s.push(wp(rt.S.LeftFoot).z - wp(rt.S.Hips).z);
            zs.t.push(wp(rt.T.LeftFoot).z - wp(rt.T.Hips).z);
          }
          const amp = (v) => Math.max(...v) - Math.min(...v);
          stride[name] = { s: amp(zs.s) / HS, t: amp(zs.t) / HT };
          const kt = name === 'phone' ? [0] : times;
          const all = [
            ...tracks.map((tr) => ({
              name: tr.b.t.name + '.quaternion',
              type: 'quaternion',
              times: kt,
              values: r5(tr.v.slice(0, kt.length * 4)),
            })),
          ];
          if (name !== 'phone')
            all.push({ name: rt.T.Hips.name + '.position', type: 'vector', times: kt, values: r5(hipsV) });
          baked[name] = { name, duration: name === 'phone' ? 0 : clip.duration, tracks: all };
        }
        const k = (c) => (stride[c].t / stride[c].s) * (HEIGHTS[id] / S.h);
        const gait = {
          walkV: +(S.gait.walkV * k('walk')).toFixed(3),
          runV: +(S.gait.runV * k('run')).toFixed(3),
          runOff: S.gait.runOff,
        };
        results[id] = { gait, clips: baked, from: sid, step: STEP, lean: LEAN };
        console.log(id, JSON.stringify(gait), 'stride', JSON.stringify(stride.walk));
      }
      return results;
    },
    { SOURCES, TARGETS, HEIGHTS: CHIBI_HEIGHTS, STEP, LEAN },
  );
});
for (const [id, data] of Object.entries(out)) {
  const f = path.join(ROOT, `game3d/assets/characters/chibi-${id}/clips.json`);
  fs.writeFileSync(f, JSON.stringify(data));
  console.log(f, fs.statSync(f).size);
}
