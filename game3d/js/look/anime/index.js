// The anime look (#383, parts and ?anime=: look/anime/flags.js). Two hooks:
//   animeSteps(place, game)   at the end of the world look (look/index.js), before the draw-call pass merges the
//                             place: the fountain's water, the material patch
//   animePasses(place)        the post chain's extra passes (post.js): the outlines
// The light follows the period: a place on a light rig (kit/light/) tells every change through rig.listen; every
// place's onPeriod (called on entry and on each change of period, places/lifecycle.js and narrative/hooks/progression.js)
// is wrapped to do the same, which also points the shared uniforms at the place being entered.
import { ANIME } from './flags.js';
import { U, wanted, patchAll } from './shade.js';
import { animeFountain } from './water.js';
import { animeLook } from './periods.js';
import { phaseOf } from '../../kit/light/looks.js';
import { EdgePass } from './edges.js';

export { ANIME };

export function animePasses(place) {
  return ANIME.outline ? [new EdgePass(place.camera)] : [];
}

// the basin's inner radius: the fountain's floor disc (scenes/plaza/fountain.js)
function basinOf(scene) {
  const g = scene.getObjectByName('fountain:ripple')?.parent;
  const floor = g?.children.find((o) => o.geometry?.type === 'CircleGeometry' && !o.material?.transparent);
  return floor ? floor.geometry.parameters.radius : null;
}

export function* animeSteps(place, game) {
  if (!ANIME.on) return null;
  const scene = place.scene,
    stats = {};
  const inner = ANIME.water && basinOf(scene);
  const water = inner ? animeFountain(scene, inner + 0.42) : null;
  stats.water = water?.stats || null;
  const people = () => [game?.player?.root, game?.mioNpc?.root];
  if (wanted()) stats.patched = patchAll(scene, ...people());
  yield;

  function sync(period) {
    const L = animeLook(period);
    U.uAShade.value.setRGB(...L.shade);
    U.uALit.value.setRGB(...L.lit);
    U.uASat.value = L.sat;
    U.uASatAll.value = L.satAll;
    U.uAMid.value = L.mid;
    water?.set(L, phaseOf(period) === 'dusk');
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
