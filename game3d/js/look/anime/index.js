// The anime look trial (#383, flags: look/anime/flags.js). Two hooks, both doing nothing without the flag:
//   animeSteps(place, game)   at the end of the world look (look/index.js), before the draw-call pass merges the
//                             place: soft crowns, the leaf-shade map, the fountain's water, the material patch
//   animePasses(place)        the post chain's extra passes (post.js): the outlines
// The light follows the period: a place on a light rig (kit/light/) tells every change through rig.listen; every
// place's onPeriod (called on entry and on each change of period, places/lifecycle.js and narrative/hooks/progression.js)
// is wrapped to do the same, which also points the shared uniforms at the place being entered.
import * as THREE from 'three';
import { ANIME } from './flags.js';
import { U, wanted, patchAll } from './shade.js';
import { foliageMeshes, softCrownSteps } from './crowns.js';
import { canopyMap } from './canopy.js';
import { animeFountain } from './water.js';
import { animeLook } from './periods.js';
import { phaseOf } from '../../kit/light/looks.js';
import { EdgePass } from './edges.js';

export { ANIME };
const phone = () => !!globalThis.matchMedia?.('(pointer: coarse)').matches;

export function animePasses(place) {
  return ANIME.outline ? [new EdgePass(place.camera)] : [];
}

// the basin's inner radius: the fountain's floor disc (scenes/plaza/fountain.js)
function basinOf(scene) {
  const g = scene.getObjectByName('fountain:ripple')?.parent;
  const floor = g?.children.find((o) => o.geometry?.type === 'CircleGeometry' && !o.material?.transparent);
  return floor ? floor.geometry.parameters.radius : null;
}

const _d = new THREE.Vector3();
function sunDir(place) {
  const s = place.light?.state?.sun?.dir;
  if (s) return _d.set(...s).normalize();
  const sun = place.sun || place.light?.sun;
  if (!sun) return _d.set(0.8, 0.52, -0.3).normalize();
  return _d
    .copy(sun.position)
    .sub(sun.target?.position || new THREE.Vector3())
    .normalize();
}

export function* animeSteps(place, game) {
  if (!ANIME.on) return null;
  const scene = place.scene,
    stats = {};
  let canopy = null,
    water = null;
  if (ANIME.crowns || ANIME.dapple) {
    const meshes = foliageMeshes(scene);
    const clumps = yield* softCrownSteps(meshes, { edit: ANIME.crowns });
    Object.assign(stats, { foliage: meshes.length, clumps: clumps.length });
    // the biggest crowns, for shot tools (tools/anime-shots.mjs stands under one)
    stats.bigCrowns = clumps
      .filter((c) => c.y > 2)
      .sort((a, b) => b.rx * b.rz - a.rx * a.rz)
      .slice(0, 24)
      .map((c) => [c.x, c.y, c.z].map((v) => +v.toFixed(2)));
    if (ANIME.dapple) canopy = canopyMap(clumps, { size: phone() ? 256 : 512 });
    stats.crowns = canopy?.crowns || 0;
  }
  yield;
  const inner = ANIME.water && basinOf(scene);
  if (inner) water = animeFountain(scene, inner + 0.42);
  stats.water = water?.stats || null;
  const people = () => [game?.player?.root, game?.mioNpc?.root];
  if (wanted()) stats.patched = patchAll(scene, ...people());
  yield;

  function sync(period) {
    const L = animeLook(period),
      dusk = phaseOf(period) === 'dusk';
    U.uAShade.value.setRGB(...L.shade);
    U.uALit.value.setRGB(...L.lit);
    U.uASat.value = L.sat;
    U.uASatAll.value = L.satAll;
    U.uAMid.value = L.mid;
    const dir = sunDir(place);
    U.uASunDir.value.copy(dir);
    if (canopy) {
      canopy.draw(dir);
      U.uACanopy.value = canopy.texture;
      U.uACanBox.value.copy(canopy.box);
      U.uACanTop.value = Math.max(1.2, canopy.top);
    }
    U.uADapple.value = canopy ? 1 : 0;
    water?.set(L, dusk);
    if (wanted()) patchAll(scene, ...people()); // what came in later: the creatures, a scene's own people
  }
  place.light?.listen?.((s) => sync(s.period));
  const own = place.onPeriod;
  place.onPeriod = function (period) {
    const r = own?.call(this, period);
    sync(period);
    return r;
  };
  return stats;
}
