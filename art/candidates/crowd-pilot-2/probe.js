// Motion probe for Review crowd-pilot-2 (#232): builds each person with the game's own loader (avatar.js meshyFrom,
// mio.js loadMio) and measures their walk and run the way the game plays them: the root moved along a straight line
// at a set ground speed, the gait (movement/gait.js) timing the clip to it. Also replays what round 1's viewer did
// (set 'walk' and never move the root). Numbers are in the person's own leg lengths (hip height at rest) and degrees.
//   probe.html?cfg=<url of a json list [{ label, dir, idle, height, tex? } | { label, mio: true }]>
// Result in window.__probe (probe.mjs prints it).
import * as THREE from 'three';
import { GLTFLoader } from '../../../game3d/vendor/loaders/GLTFLoader.js';
import { meshyFrom } from '../../../game3d/js/avatar.js';
import { loadMio } from '../../../game3d/js/mio.js';

const gl = new GLTFLoader();
const load = (u) => gl.loadAsync(u);
const idleClip = (u) => fetch(u).then((r) => r.json()).then((j) => THREE.AnimationClip.parse(j));

async function person(p) {
  if (p.mio) return loadMio({ height: p.height || 1.12 });
  const d = p.dir;
  const files = await Promise.all([load(d + 'walk.glb'), load(d + 'run.glb'), idleClip(p.idle), load(d + 'sit.glb'),
    new THREE.TextureLoader().loadAsync(p.tex || d + 'base.webp')]);
  return meshyFrom(p.label, [...files, null], { height: p.height });
}

function bones(m) {
  const b = {};
  m.model.traverse((o) => {
    if (!o.isBone) return;
    const n = o.name.replace(/[^a-z]/gi, '').toLowerCase().replace(/^mixamorig/, '');
    for (const k of ['hips', 'head', 'leftupleg', 'leftleg', 'leftfoot', 'rightupleg', 'rightleg', 'rightfoot',
      'leftarm', 'leftforearm', 'lefthand', 'rightarm', 'rightforearm', 'righthand'])
      if (n === k && !b[k]) b[k] = o;
  });
  return b;
}
const W = (o) => o.getWorldPosition(new THREE.Vector3());

// the feet as drawn: the skinned vertices in the bottom 6% of the body at rest, one set per side (x < 0, x > 0),
// matched to the nearer foot bone; feetNow() gives each set's middle in world space. A rig whose shins are skinned to
// the thigh (round 1's B on Meshy's weights) moves its foot bones while the drawn feet lag behind them.
function meshFeet(m, B) {
  m.root.updateMatrixWorld(true);
  const all = [];
  m.model.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const n = o.geometry.attributes.position.count;
    for (let i = 0; i < n; i++) all.push([o, i, o.localToWorld(o.getVertexPosition(i, new THREE.Vector3()))]);
  });
  const ys = all.map((a) => a[2].y), y0 = Math.min(...ys), H = Math.max(...ys) - y0;
  const low = all.filter((a) => a[2].y < y0 + 0.06 * H);
  const lf = W(B.leftfoot);
  const sideL = lf.x < 0;
  const sets = { leftfoot: low.filter((a) => (a[2].x < 0) === sideL), rightfoot: low.filter((a) => (a[2].x < 0) !== sideL) };
  const v = new THREE.Vector3();
  return () => Object.fromEntries(Object.entries(sets).map(([k, list]) => {
    const c = new THREE.Vector3();
    for (const [o, i] of list) c.add(o.localToWorld(o.getVertexPosition(i, v)));
    return [k, c.divideScalar(Math.max(1, list.length))];
  }));
}

// sagittal angle (forward +) of the segment a->b from straight down, degrees; the body faces +z
const sag = (a, b) => (Math.atan2(b.z - a.z, a.y - b.y) * 180) / Math.PI;
const ang3 = (a, b, c) => {
  const u = a.clone().sub(b).normalize(), v = c.clone().sub(b).normalize();
  return 180 - (Math.acos(Math.max(-1, Math.min(1, u.dot(v)))) * 180) / Math.PI;
};

async function measure(m, B, motion, speed, dir = 1) {
  const dt = 1 / 60;
  m.root.position.set(0, 0, 0);
  m.root.rotation.set(0, 0, 0);
  m.setState('idle');
  for (let i = 0; i < 30; i++) m.update(dt);
  m.root.updateMatrixWorld(true);
  const L = W(B.hips).y;
  const feetNow = meshFeet(m, B);
  const rest = feetNow();
  const off = { leftfoot: rest.leftfoot.clone().sub(W(B.leftfoot)), rightfoot: rest.rightfoot.clone().sub(W(B.rightfoot)) };
  m.setState('walk');
  m.setGait(null, { run: motion === 'run' });
  const rows = [];
  const N = 60 * 4;
  for (let i = 0; i < N; i++) {
    m.root.position.z += dir * speed * dt;
    m.update(dt);
    m.root.updateMatrixWorld(true);
    if (i < 60) continue; // the first second: getting going
    const r = { z: m.root.position.z, state: m.state };
    for (const k of Object.keys(B)) r[k] = W(B[k]);
    const mf = feetNow();
    // how far each drawn foot is from where its bone puts it (beyond the rest offset), in leg lengths
    r.follow = Math.max(...['leftfoot', 'rightfoot'].map((k) => mf[k].clone().sub(r[k]).sub(off[k]).length())) / L;
    r.mleft = mf.leftfoot;
    r.mright = mf.rightfoot;
    rows.push(r);
  }
  const out = { motion, speed: +(speed / L).toFixed(3), states: [...new Set(rows.map((r) => r.state))] };
  // planted foot (the lower one, lower at the last sample too): how fast it moves over the ground, against the body
  let slip = 0, n = 0, switches = 0;
  for (let i = 1; i < rows.length; i++) {
    const lo = rows[i].leftfoot.y < rows[i].rightfoot.y ? 'leftfoot' : 'rightfoot';
    const loW = rows[i - 1].leftfoot.y < rows[i - 1].rightfoot.y ? 'leftfoot' : 'rightfoot';
    if (lo !== loW) { switches++; continue; }
    const v = Math.hypot(rows[i][lo].x - rows[i - 1][lo].x, rows[i][lo].z - rows[i - 1][lo].z) / dt;
    slip += v; n++;
  }
  const T = rows.length * dt;
  const range = (f) => { const v = rows.map(f); return [Math.min(...v), Math.max(...v)]; };
  const span = (f) => { const [a, b] = range(f); return b - a; };
  const ft = ['leftfoot', 'rightfoot'];
  const minFoot = Math.min(...rows.flatMap((r) => ft.map((k) => r[k].y)));
  out.slip = +(slip / Math.max(1, n) / speed).toFixed(2); // planted foot speed over body speed: 0 planted, 1 skating
  // the same for the drawn feet (the lowest skinned vertices), which is what the eye sees
  let ms = 0, mn = 0;
  for (let i = 1; i < rows.length; i++) {
    const lo = rows[i].mleft.y < rows[i].mright.y ? 'mleft' : 'mright';
    const loW = rows[i - 1].mleft.y < rows[i - 1].mright.y ? 'mleft' : 'mright';
    if (lo !== loW) continue;
    ms += Math.hypot(rows[i][lo].x - rows[i - 1][lo].x, rows[i][lo].z - rows[i - 1][lo].z) / dt; mn++;
  }
  out.meshSlip = +(ms / Math.max(1, mn) / speed).toFixed(2);
  out.meshLift = +((Math.max(...rows.flatMap((r) => [r.mleft.y, r.mright.y])) - Math.min(...rows.flatMap((r) => [r.mleft.y, r.mright.y]))) / L).toFixed(3);
  out.follow = +Math.max(...rows.map((r) => r.follow)).toFixed(3);
  out.stepsPerSec = +(switches / T).toFixed(2);
  out.footLift = +(Math.max(...rows.flatMap((r) => ft.map((k) => r[k].y))) - minFoot) / L;
  out.stride = +Math.max(...rows.map((r) => Math.abs(r.leftfoot.z - r.rightfoot.z))) / L;
  out.thigh = ['left', 'right'].map((s) => range((r) => sag(r[s + 'upleg'], r[s + 'leg'])).map((x) => +x.toFixed(0)));
  out.knee = +Math.max(...rows.flatMap((r) => ['left', 'right'].map((s) => ang3(r[s + 'upleg'], r[s + 'leg'], r[s + 'foot'])))).toFixed(0);
  out.arm = ['left', 'right'].map((s) => B[s + 'forearm'] ? range((r) => sag(r[s + 'arm'], r[s + 'forearm'])).map((x) => +x.toFixed(0)) : null);
  out.bob = span((r) => r.hips.y) / L;
  out.sway = span((r) => r.hips.x) / L;
  out.headBob = span((r) => r.head.y) / L;
  for (const k of ['footLift', 'stride', 'bob', 'sway', 'headBob']) out[k] = +out[k].toFixed(3);
  out.L = +L.toFixed(3);
  return out;
}

// the walk's spread: feet apart sideways (leg lengths) and the thighs' sideways angle (degrees out from straight down),
// over one walk cycle with the hips held, as the game holds them
function lateral(m, B) {
  const dt = 1 / 60;
  m.root.position.set(0, 0, 0);
  m.setState('walk');
  m.setGait(null);
  let spread = [9, 0], abd = 0;
  const L = W(B.hips).y;
  for (let i = 0; i < 120; i++) {
    m.root.position.z += 0.55 * L * dt;
    m.update(dt);
    m.root.updateMatrixWorld(true);
    const d = Math.abs(W(B.leftfoot).x - W(B.rightfoot).x) / L;
    spread = [Math.min(spread[0], d), Math.max(spread[1], d)];
    for (const s of ['left', 'right']) {
      const a = W(B[s + 'upleg']), b = W(B[s + 'leg']);
      abd = Math.max(abd, (Math.abs(Math.atan2(b.x - a.x, a.y - b.y)) * 180) / Math.PI);
    }
  }
  return { feetApart: spread.map((x) => +x.toFixed(3)), thighOut: +abd.toFixed(1) };
}

// the idle: how far the hips and head move over 6 s (leg lengths), and the arms' and thighs' angles (min, max)
function idle(m, B) {
  const dt = 1 / 60;
  m.root.position.set(0, 0, 0);
  m.setState('idle');
  const rows = [];
  for (let i = 0; i < 360; i++) {
    m.update(dt);
    m.root.updateMatrixWorld(true);
    const r = {};
    for (const k of Object.keys(B)) r[k] = W(B[k]);
    rows.push(r);
  }
  const L = rows[0].hips.y;
  const span = (f) => { const v = rows.map(f); return +((Math.max(...v) - Math.min(...v)) / L).toFixed(3); };
  const rg = (f) => { const v = rows.map(f); return [Math.min(...v), Math.max(...v)].map((x) => +x.toFixed(0)); };
  const side = (a, b) => (Math.atan2(Math.abs(b.x - a.x), a.y - b.y) * 180) / Math.PI;
  return {
    hipsMove: span((r) => r.hips.x) + span((r) => r.hips.z) + span((r) => r.hips.y),
    headMove: span((r) => r.head.x) + span((r) => r.head.z) + span((r) => r.head.y),
    armOut: ['left', 'right'].map((s) => rg((r) => side(r[s + 'arm'], r[s + 'forearm']))),
    elbow: ['left', 'right'].map((s) => rg((r) => ang3(r[s + 'arm'], r[s + 'forearm'], r[s + 'hand']))),
    thighOut: ['left', 'right'].map((s) => rg((r) => side(r[s + 'upleg'], r[s + 'leg']))),
    feetApart: +(Math.abs(rows[0].leftfoot.x - rows[0].rightfoot.x) / L).toFixed(3),
  };
}

// round 1's viewer: 'walk' set, the root never moved
async function standingWalk(m, B) {
  const dt = 1 / 60;
  m.root.position.set(0, 0, 0);
  m.setState('idle');
  for (let i = 0; i < 30; i++) m.update(dt);
  m.setState('walk');
  m.setGait(null);
  const seen = [];
  let y0 = null, lift = 0;
  for (let i = 0; i < 180; i++) {
    m.update(dt);
    m.root.updateMatrixWorld(true);
    const l = W(B.leftfoot).y, r = W(B.rightfoot).y;
    if (y0 === null) y0 = Math.min(l, r);
    lift = Math.max(lift, Math.abs(l - r));
    if (i % 15 === 14) seen.push(`${((i + 1) * dt).toFixed(2)}s ${m.state}`);
  }
  return { states: seen, maxFootGap: +(lift / W(B.hips).y).toFixed(3) };
}

const cfg = await fetch(new URLSearchParams(location.search).get('cfg')).then((r) => r.json());
const res = [];
for (const p of cfg) {
  try {
    const m = await person(p);
    const B = bones(m);
    const r = { label: p.label, bones: Object.keys(B).length, strides: m.strides };
    r.viewerWalk = await standingWalk(m, B);
    const L = (m.root.updateMatrixWorld(true), W(B.hips).y);
    r.walk = await measure(m, B, 'walk', 0.55 * L);
    r.walkFast = await measure(m, B, 'walk', 0.9 * L);
    r.run = await measure(m, B, 'run', 2.0 * L);
    r.walkBack = await measure(m, B, 'walk', 0.55 * L, -1);
    r.lateral = lateral(m, B);
    r.idle = idle(m, B);
    res.push(r);
  } catch (e) {
    res.push({ label: p.label, error: String(e && e.stack || e) });
  }
}
window.__probe = res;
