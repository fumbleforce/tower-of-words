// The far view (?far=1, look/far-flag.js): a sky in place of the flat grey background, haze that thickens with
// distance in the sky's horizon colour, and the island's far model (scenes/far-model.js), all following the time of
// day. The haze, the far model and the skyline's full-height buildings are for the follow camera only; the overview
// keeps what it had, with the sky behind it. Installed by the place lifecycle for any place the flag names, after
// the place is built, so nothing in the place itself changes.
//
//   await sliced(farViewSteps(game, place, name, () => sim.period))
//   place.farView: { far, pitchMin }   the follow camera's far plane and lowest pitch (camera/follow.js)
//
// The fog stays on the scene in both camera modes (pushed out of reach in the overview), so switching never
// recompiles a shader.
import * as THREE from 'three';
import * as LAYOUT from '../scenes/island-layout.js';
import { SUN } from '../scenes/town.js';
import { farModelSteps } from '../scenes/far-model.js';
import { farWanted } from './far-flag.js';

// haze: clear to FOG_NEAR, the horizon colour at FOG_FAR; the camera draws a little past it
export const FOG_NEAR = 30,
  FOG_FAR = 140,
  PITCH_MIN = -0.12;
// The only input is the period (a getter, read each frame) mapped to one of these colour sets, so a shared
// time-of-day system (#370) can feed or replace SKIES and SKY_OF without touching the rest.
// the sky by time of day (sRGB): zenith, the sky a third of the way up, the horizon (also the haze), the glow
// round the sun and how strong it is, the mainland's hills on the horizon
export const SKIES = {
  morning: {
    zenith: '#6c8fbb',
    mid: '#9cb3cb',
    horizon: '#c4c8c8',
    glow: '#f6d6a8',
    glowK: 0.5,
    land: '#98a1a8',
  },
  day: {
    zenith: '#5f89ba',
    mid: '#93b0cd',
    horizon: '#bccad4',
    glow: '#fbeccd',
    glowK: 0.3,
    land: '#93a2ad',
  },
  evening: {
    zenith: '#3f4f7a',
    mid: '#7b809f',
    horizon: '#b2a0a6',
    glow: '#ff9d5e',
    glowK: 0.85,
    land: '#7f7a8a',
  },
  night: {
    zenith: '#0e1324',
    mid: '#1c2338',
    horizon: '#2e3448',
    glow: '#4a5272',
    glowK: 0.2,
    land: '#1f2433',
  },
};
// the game's periods (sim.js PERIODS) onto the four skies
export const SKY_OF = {
  early: 'morning',
  morning: 'day',
  lunch: 'day',
  afternoon: 'day',
  evening: 'evening',
  night: 'night',
};
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

// ---------- install on one place ----------
export function* farViewSteps(game, place, name, period) {
  if (!farWanted(name)) return;
  const scene = place.scene;
  let ground = null;
  scene.traverse((o) => {
    if (o.userData.farModel) ground = o;
  });
  if (!ground) return; // no skyline here: nothing to fit round
  const info = ground.userData.farModel;
  const far = yield* farModelSteps(info, LAYOUT);
  for (const m of [far.mesh, far.lit]) if (m) ground.parent.add(m);
  // which way the sun and the mainland lie in this chunk's frame
  const o = LAYOUT.toLocal(info.chunk, 0, 0),
    m = LAYOUT.toLocal(info.chunk, MAINLAND[0], MAINLAND[1]),
    landDir = [m[0] - o[0], m[1] - o[1]];
  const tagged = [];
  scene.traverse((x) => {
    if (x.userData.farView) tagged.push(x);
  });
  scene.fog = new THREE.Fog(SKIES.day.horizon, 1e4, 2e4);
  let shown = null,
    follow = null;
  function sync() {
    const id = SKY_OF[period()] || 'day';
    if (id !== shown) {
      shown = id;
      const sky = SKIES[id],
        sun = new THREE.Vector3(...(id === 'evening' || id === 'night' ? SUN.evening : SUN.morning)).normalize();
      if (scene.background?.isTexture) scene.background.dispose();
      scene.background = paintSky(sky, sun, landDir);
      scene.fog.color.set(sky.horizon);
      follow = null; // the lit windows follow the period below
    }
    const now = !!game.followCamera?.active && game.place === place;
    if (now === follow) return;
    follow = now;
    const lit = shown === 'evening' || shown === 'night';
    for (const x of tagged) x.visible = (x.userData.farView === 'follow') === now && (!x.userData.farLit || lit);
    scene.fog.near = now ? FOG_NEAR : 1e4;
    scene.fog.far = now ? FOG_FAR : 2e4;
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
