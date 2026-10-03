// A lift for the people in a dim place: each character's own surface colour added back as a little emission, and a
// soft rim of sky light round their edges, so dark clothes (Mio's hoodie, Mr. Hamada's suit) keep their shape against
// the dusk on a phone, while the street, the lamps and the sky keep their light. It touches only the people (the player, Mio and the place's people), never
// the scene. A place asks for it with `charLift` in its grade (scenes/town.js, day 2 after work): the lift's
// strength, the rim's following from it, strongest on dark surfaces (pale hair and shirts need none); 0 or none: off.
//   liftPeople(game, place)   on entering a place (places/lifecycle.js): sets the strength, patches the people
import * as THREE from 'three';

const LIFT = { value: 0 }; // one strength for every patched material: changing it needs no recompile
const RIM = { value: new THREE.Color('#aebfe8') }; // the dusk sky's colour, at the rim's full strength
const LIT = ['isMeshStandardMaterial', 'isMeshLambertMaterial', 'isMeshPhongMaterial', 'isMeshToonMaterial'];

function patch(m) {
  // a body's own colours come from a texture or vertex colours; a plain-colour material may be shared with the scene
  // (props.js mat() caches them), so it is left alone
  // (a clone keeps userData and the patched onBeforeCompile: it is patched already)
  if (m.userData.charLift || !LIT.some((k) => m[k]) || !(m.map || m.vertexColors)) return;
  m.userData.charLift = true;
  const before = m.onBeforeCompile,
    key =
      m.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey
        ? m.customProgramCacheKey.bind(m)
        : () => before.toString();
  m.onBeforeCompile = (sh, r) => {
    before.call(m, sh, r);
    if (sh.fragmentShader.includes('uCharLift')) return;
    sh.uniforms.uCharLift = LIFT;
    sh.uniforms.uCharRim = RIM;
    sh.fragmentShader =
      'uniform float uCharLift;\nuniform vec3 uCharRim;\n' +
      sh.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
 float charRim = 1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0);
 float charDark = 1.0 - clamp(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
 totalEmissiveRadiance += diffuseColor.rgb * uCharLift + uCharRim * (uCharLift * 4.0 * charRim * charRim * charRim * charDark * charDark);`,
      );
  };
  m.customProgramCacheKey = () => key() + '|charlift';
  m.needsUpdate = true;
}

export function liftPeople(game, place) {
  LIFT.value = place.grade?.charLift || 0;
  if (!LIFT.value) return;
  const roots = [game.player?.root, game.mioNpc?.root, ...Object.values(place.people || {}).map((p) => p?.root || p)];
  for (const r of roots)
    r?.traverse?.((o) => {
      if (!o.isMesh) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m) patch(m);
    });
}
