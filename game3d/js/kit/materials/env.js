// What metal and glass reflect (#366): one small sky picture for the whole game, repainted for the place and period
// the player is in, so a lamp post, a railing or the monorail's steel reflects the sky that place shows now. Every
// metal and glass material shares the one texture (kit/materials/metal.js), so a repaint changes them all at once.
//
//   skyEnv()                          the shared reflection (an equirectangular canvas; the renderer prefilters it)
//   reflectPlace(place, period, day)  repaint it for a place (kit/light/rig.js lightPlace calls it on entering a place
//                                     and when the clock moves): the place's own picture (scene.userData.reflection:
//                                     the train's sky and sea), else its light rig's sky, else the period table's
//   paintReflection(desc)             repaint it from a description (below); nothing happens if it is already showing
//
// A description is either the period table's sky (kit/light/looks.js SKY: zenith, mid, horizon, glow, glowK, below)
// with the sun's direction, painted with the town around it (rooftops, windows and tree crowns near the horizon,
// lit windows after dark), or a hand-made gradient: { stops: [[k, colour]...], glow: [[k, rgba]...], glowR, sun }.
// Phones get a picture half the size (its prefiltered maps are a quarter).
import * as THREE from 'three';
import { OUTDOOR, phaseOf, lookFor } from '../light/looks.js';

// settings.js isPhone, which the kit can't import (it needs a window at load)
export const phoneSized = () =>
  typeof innerWidth !== 'undefined' &&
  (!!globalThis.document?.body?.classList.contains('phone') || Math.min(innerWidth, innerHeight) < 600);

let tex = null,
  shown = null;

export function skyEnv() {
  if (tex || typeof globalThis.document?.createElement !== 'function') return tex; // none without a page
  const cv = document.createElement('canvas');
  [cv.width, cv.height] = phoneSized() ? [128, 64] : [256, 128];
  tex = new THREE.CanvasTexture(cv);
  tex.name = 'kit:skyEnv';
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  paintReflection(periodSky('morning', 1));
  return tex;
}

// the period table's sky for a period, outside any place
function periodSky(period, day) {
  const L = lookFor(OUTDOOR, phaseOf(period), day, period);
  return { sky: L.sky, sun: L.sun[2], lit: !!L.glow };
}

export function reflectPlace(place, period, day = 1) {
  // a place lit while it is built in the background leaves the one the player is in alone
  const now = globalThis.__game?.place;
  if (now && place && now !== place) return false;
  const own = place?.scene?.userData.reflection;
  if (own) return paintReflection(own);
  const st = place?.light?.state;
  if (st?.sky) return paintReflection({ sky: st.sky, sun: st.skyDir || st.sun.dir, lit: st.glow });
  return paintReflection(periodSky(period, day));
}

export function paintReflection(desc) {
  if (!desc || !skyEnv()) return false;
  const key = JSON.stringify(desc);
  if (key === shown) return false;
  shown = key;
  const cv = tex.image,
    g = cv.getContext?.('2d');
  if (!g?.createImageData?.(1, 1)?.data) return false; // a stand-in canvas (the unit tests'): nothing to paint
  if (desc.stops) paintGradient(g, cv.width, cv.height, desc);
  else paintTown(g, cv.width, cv.height, desc);
  // the renderer keeps one prefiltered copy per texture; letting it go makes the next frame build it from the new
  // picture (same size, so no shader changes)
  tex.dispose();
  tex.needsUpdate = true;
  return true;
}

// three's equirect mapping: u = atan2(z, x) / 2pi + 0.5, v = asin(y) / pi + 0.5, with the canvas top up
const dirAt = (x, y, W, H, out) => {
  const phi = ((x + 0.5) / W - 0.5) * 2 * Math.PI,
    e = (0.5 - (y + 0.5) / H) * Math.PI;
  return out.set(Math.cos(e) * Math.cos(phi), Math.sin(e), Math.cos(e) * Math.sin(phi));
};

// a hand-made gradient and a soft glow round the sun (the train's sky and sea, train/models.js)
function paintGradient(g, W, H, { stops, glow, glowR = 22, sun }) {
  const grad = g.createLinearGradient(0, 0, 0, H);
  for (const [k, c] of stops) grad.addColorStop(k, c);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  if (!glow || !sun) return;
  const s = new THREE.Vector3(...sun).normalize();
  const su = (Math.atan2(s.z, s.x) / (2 * Math.PI) + 0.5) * W,
    sv = (0.5 - Math.asin(s.y) / Math.PI) * H,
    r = (glowR * W) / 256;
  for (const dx of [-W, 0, W]) {
    const rg = g.createRadialGradient(su + dx, sv, 0, su + dx, sv, r);
    for (const [k, c] of glow) rg.addColorStop(k, c);
    g.fillStyle = rg;
    g.fillRect(0, 0, W, H);
  }
}

// '#rrggbb' to [r, g, b] as written (sRGB, as the canvas wants it)
const rgb = (c) => {
  const n = parseInt(c.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];

// The sky from the period table, the sun's glow, and a street round it: walls with rows of windows, tree crowns
// between them, the paving below. Low and hazed (a few storeys across the street, the trees greyed by the air between),
// so glass and steel still show mostly sky; shaded with the sky's light, its windows lit after dark. Its shapes come from
// the street style's own reflection (scenes/diorama/), which this replaces.
const DAY_HORIZON = lum(rgb(OUTDOOR.day.sky.horizon));
function paintTown(g, W, H, { sky, sun, lit }) {
  const zen = rgb(sky.zenith),
    mid = rgb(sky.mid),
    hor = rgb(sky.horizon),
    glow = rgb(sky.glow),
    below = rgb(sky.below || '#505b42');
  const light = Math.min(1, lum(hor) / DAY_HORIZON); // how much light the street gets: 1 by day, less at dusk
  const haze = (c, k) => mix(c, hor, k).map((v) => v * light);
  const wall = haze([133, 140, 137], 0.3),
    pane = haze([58, 79, 92], 0.2),
    crown = haze([64, 85, 46], 0.45),
    warm = [255, 206, 140];
  const s = new THREE.Vector3(...sun).normalize(),
    d = new THREE.Vector3();
  const img = g.createImageData(W, H),
    px = img.data;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      dirAt(x, y, W, H, d);
      let c;
      const angle = Math.atan2(d.x, d.z),
        block = Math.floor((angle + Math.PI) * 3),
        roof = 0.24 + 0.12 * Math.sin(block * 4.7),
        building = d.y > -0.18 && d.y < roof && Math.sin(angle * 2 + 0.8) > -0.2,
        tree = !building && d.y > -0.2 && d.y < 0.13 + 0.06 * Math.sin(angle * 7);
      if (building) {
        const win = Math.sin(angle * 45) > 0.05 && Math.sin(d.y * 90) > -0.3;
        // after dark about a third of the windows are lit, the same ones every time
        const on =
          lit &&
          win &&
          Math.sin(Math.floor((angle * 45) / Math.PI) * 12.9898 + Math.floor((d.y * 90) / Math.PI) * 78.233) > 0.35;
        c = on ? warm : win ? pane : wall;
      } else if (tree) c = crown;
      else if (d.y >= 0) {
        const t = Math.sqrt(d.y);
        c = t < 0.55 ? mix(hor, mid, t / 0.55) : mix(mid, zen, (t - 0.55) / 0.45);
        const sunK = Math.max(0, d.dot(s));
        c = mix(c, glow, sky.glowK * sunK ** 6);
      } else c = mix(hor, below, Math.min(1, Math.sqrt(-d.y) * 1.6));
      const i = (y * W + x) * 4;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
      px[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
}
