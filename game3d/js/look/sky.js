// The far view (#365; look/far-flag.js switches it off with ?far=0): a sky in place of the flat grey background, haze
// that thickens with distance in the sky's horizon colour, and the island's far model (scenes/far-model.js). The
// haze, the far model and the skyline's full-height buildings are for the follow camera only; the overview keeps
// what it had, with the sky behind it. Installed by the place lifecycle on every outdoor place (any place with a
// skyline), after the place is built, so nothing in the place itself changes.
//
//   await sliced(farViewSteps(game, place, name, () => sim.period))
//   place.farView: { far, pitchMin }   the follow camera's far plane and lowest pitch (camera/follow.js)
//
// This file only draws. What the sky looks like in each period is the period table's (kit/light/looks.js SKY, a
// look's `sky`): a place with a light rig hands it over on every change (rig.listen), and a place not yet on a rig
// looks its period up in the same table. The fog stays on the scene in both camera modes (pushed out of reach in
// the overview), so switching never recompiles a shader.
import * as THREE from 'three';
import * as LAYOUT from '../scenes/island-layout.js';
import { OUTDOOR, phaseOf, lookFor } from '../kit/light/looks.js';
import { farModelSteps } from '../scenes/far-model.js';
import { FAR_VIEW, farFollow } from './far-flag.js';

// haze: clear to FOG_NEAR, the horizon colour at FOG_FAR; the camera draws a little past it
export const FOG_NEAR = 30,
  FOG_FAR = 140,
  PITCH_MIN = -0.12;
// where the far model begins, from the walk box: its buildings just past where the haze starts, its trees where the
// haze has softened their low-poly crowns, and a crown's second mass only as far as it shows
const FAR_FROM = { buildFrom: FOG_NEAR + 4, treesFrom: FOG_NEAR + 16, sideTo: 80 };
// the mainland, across the bay to the west-south-west in the island's frame (the monorail comes in from it)
const MAINLAND = [-0.92, 0.38];

// ---------- the sky picture: an equirectangular canvas, painted once per period ----------
const W = 1024,
  H = 512;
// column of a direction in the chunk's frame (three's equirect mapping: u = atan2(z, x) / 2pi + 0.5)
const colOf = (x, z) => (Math.atan2(z, x) / (2 * Math.PI) + 0.5) * W;
const rowOf = (elev) => (0.5 - elev / Math.PI) * H;
function paintSky(sky, sunDir, landDir) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d'),
    hz = rowOf(0);
  const grad = g.createLinearGradient(0, 0, 0, hz);
  grad.addColorStop(0, sky.zenith);
  grad.addColorStop(0.55, sky.mid);
  grad.addColorStop(0.93, sky.horizon);
  grad.addColorStop(1, sky.horizon);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, hz);
  g.fillStyle = sky.horizon; // below the horizon: the haze, so the far sea and land fade straight into it
  g.fillRect(0, hz, W, H - hz);
  // the glow round the sun, wrapped across the picture's seam
  const sx = colOf(sunDir.x, sunDir.z),
    sy = rowOf(Math.asin(THREE.MathUtils.clamp(sunDir.y, -1, 1)));
  g.globalAlpha = sky.glowK;
  for (const x of [sx - W, sx, sx + W]) {
    const r = g.createRadialGradient(x, sy, 0, x, sy, H * 0.45);
    r.addColorStop(0, sky.glow);
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(x - H, 0, 2 * H, hz);
  }
  g.globalAlpha = 1;
  // the mainland: a low line of hills a few degrees high over about 70 degrees of the horizon, in haze
  const mx = colOf(landDir[0], landDir[1]),
    span = W * 0.2,
    px = H / Math.PI; // pixels a radian
  g.fillStyle = sky.land;
  g.globalAlpha = 0.55;
  for (const off of [-W, 0, W]) {
    g.beginPath();
    g.moveTo(mx + off - span, hz + 1);
    for (let i = 0; i <= 64; i++) {
      const t = i / 64,
        x = mx + off - span + t * 2 * span,
        rise = Math.sin(t * Math.PI) ** 0.6,
        bumps = 0.55 + 0.25 * Math.sin(t * 23.1) + 0.2 * Math.sin(t * 51.7 + 1.3);
      g.lineTo(x, hz - rise * bumps * 0.05 * px);
    }
    g.lineTo(mx + off + span, hz + 1);
    g.fill();
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// what the sky shows now: the rig's word where the place has one, else the period table for the period
function skyNow(place, period) {
  const st = place.light?.state;
  if (st?.sky) return { sky: st.sky, sun: st.skyDir || st.sun.dir, glow: st.glow };
  const p = period(),
    L = lookFor(OUTDOOR, phaseOf(p), 1, p);
  return { sky: L.sky, sun: L.sun[2], glow: !!L.glow };
}

// ---------- what the place built itself ----------
// own(x, z) in the frame of `frame` (the skyline's parent, the chunk's frame): true where a ray straight down meets
// any of the place's own meshes (its ground, paving, buildings, planting, bands) above OWN_Y, so the far model leaves
// that spot to the place. A place's base land laid under the skyline's ground (the harbour's) doesn't count: the
// skyline's paths show over it. Nor do the skyline's and the far view's meshes, or a sky dome or a sea far wider than
// a place. Only meshes whose box covers the point are cast against.
const WIDE = 300,
  OWN_Y = -0.1; // the skyline's ground lies at -0.2 to -0.12 (scenes/skyline.js), a place's own at 0 or above
function ownGround(scene, frame) {
  scene.updateMatrixWorld(true);
  const list = [];
  scene.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || /^(skyline|far):/.test(o.name) || o.userData.farView) return;
    const box = new THREE.Box3().setFromObject(o);
    if (box.isEmpty() || box.max.x - box.min.x > WIDE || box.max.z - box.min.z > WIDE) return;
    list.push([o, box]);
  });
  const ray = new THREE.Raycaster(),
    p = new THREE.Vector3(),
    down = new THREE.Vector3(0, -1, 0),
    hits = [];
  return (x, z) => {
    frame.localToWorld(p.set(x, 0, z));
    const under = list.filter(([, b]) => p.x >= b.min.x && p.x <= b.max.x && p.z >= b.min.z && p.z <= b.max.z);
    if (!under.length) return false;
    ray.set(p.set(p.x, 1e3, p.z), down);
    for (const [o] of under) {
      hits.length = 0;
      o.raycast(ray, hits);
      if (hits.some((h) => frame.worldToLocal(h.point).y > OWN_Y)) return true;
    }
    return false;
  };
}

// ---------- install on one place ----------
export function* farViewSteps(game, place, name, period) {
  if (!FAR_VIEW) return;
  const scene = place.scene;
  let ground = null;
  scene.traverse((o) => {
    if (o.userData.farModel) ground = o;
  });
  if (!ground) return; // no skyline here: not an outdoor place
  const info = ground.userData.farModel;
  // none on a phone (far-flag.js); nothing of it right at the place's edge, where the follow camera would see it close
  const far = farFollow()
    ? yield* farModelSteps(info, LAYOUT, { own: ownGround(scene, ground.parent), ...FAR_FROM })
    : { stats: null };
  for (const m of [far.mesh, far.lit]) if (m) ground.parent.add(m);
  // which way the mainland lies in this chunk's frame
  const o = LAYOUT.toLocal(info.chunk, 0, 0),
    m = LAYOUT.toLocal(info.chunk, MAINLAND[0], MAINLAND[1]),
    landDir = [m[0] - o[0], m[1] - o[1]];
  const tagged = [];
  scene.traverse((x) => {
    if (x.userData.farView) tagged.push(x);
  });
  scene.fog = new THREE.Fog(OUTDOOR.day.sky.horizon, 1e4, 2e4);
  let shown = null,
    shownSun = null,
    lit = false,
    follow = null;
  function sync() {
    const now = skyNow(place, period);
    if (now.sky !== shown || now.sun !== shownSun) {
      shown = now.sky;
      shownSun = now.sun;
      if (scene.background?.isTexture) scene.background.dispose();
      scene.background = paintSky(now.sky, new THREE.Vector3(...now.sun).normalize(), landDir);
      scene.fog.color.set(now.sky.horizon);
    }
    const cam = !!game.followCamera?.active && game.place === place;
    if (cam === follow && now.glow === lit) return;
    follow = cam;
    lit = now.glow;
    for (const x of tagged) x.visible = (x.userData.farView === 'follow') === cam && (!x.userData.farLit || lit);
    scene.fog.near = cam ? FOG_NEAR : 1e4;
    scene.fog.far = cam ? FOG_FAR : 2e4;
  }
  const before = scene.onBeforeRender;
  scene.onBeforeRender = function (...a) {
    sync();
    return before.apply(this, a);
  };
  sync();
  place.farView = { far: FOG_FAR + 4, pitchMin: PITCH_MIN, stats: far.stats };
  yield;
}
