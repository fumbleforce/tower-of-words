// Metal and glass finishes (#366; Jørgen, 2026-10-09, on the monorail: "I like how you have done the reflective
// surfaces and the metalwork on the monorail, is this something that extends to the rest of the game currently?").
// One set of finishes for everything made of metal or glass, all reflecting the one sky (kit/materials/env.js):
//
//   brushed   bare stainless: the monorail's skin, the train doors, handrails and bare steel
//   painted   painted steel: lamp posts, railings, bike racks, sign frames, machine housings, roof plant
//   glass     window glass that reflects the sky and the street
//
// Ask for one through the material cache: mat(color, { finish: 'painted' }) or a Parts opts { finish: 'painted' }
// (kit/core/mat.js applies it); roughness and metalness given beside it win over the finish's own. envK sets how
// strongly it reflects, horizon makes a pane reflect like a nearby street (kit/materials/glass.js).
// On phones painted steel stays a plain colour (no reflection to sample, the most common metal outdoors); bare
// steel and glass keep theirs, with the smaller picture.
//
// wornMetal(material, tex) is the monorail's baked wear: the vertex colour's alpha says which parts are bare metal,
// the texture shades, rusts and roughens it (see below).
import * as THREE from 'three';
import { skyEnv, phoneSized } from './env.js';
import { localHorizon } from './glass.js';
import { keepPatch } from './patch.js';

export const FINISH = {
  brushed: { roughness: 0.38, metalness: 0.8, envK: 1 },
  painted: { roughness: 0.32, metalness: 0.15, envK: 1.4, phonePlain: true },
  glass: { roughness: 0.1, metalness: 0.2, envK: 1.1 },
};
// the keys a finish adds to material options, which are not three.js material properties
export const FINISH_KEYS = ['finish', 'envK', 'horizon'];

// the material options a finish starts from (explicit options go on top)
export function finishLook(finish) {
  const F = FINISH[finish];
  if (!F) throw new Error('unknown finish ' + finish);
  if (F.phonePlain && phoneSized()) return { roughness: F.roughness, metalness: 0 };
  return { roughness: F.roughness, metalness: F.metalness };
}

// a built material takes its finish's reflection (and a pane's local horizon)
export function applyFinish(material, { finish, envK, horizon } = {}) {
  const F = FINISH[finish];
  if (!F) throw new Error('unknown finish ' + finish);
  material.userData.finish = finish;
  if (F.phonePlain && phoneSized()) return material;
  Object.assign(material, { envMap: skyEnv(), envMapIntensity: envK ?? F.envK });
  if (horizon) localHorizon(material, horizon);
  return material;
}

// rust, linear (#8c4f2e)
const RUST = new THREE.Color('#8c4f2e');

// Baked wear on bare metal. The vertex colour's alpha is the metal class (1 bare metal, 0 paint and rubber), so it
// scales the metalness and never the opacity (the departure fade makes the car's materials transparent). With the
// wear texture (tools/train/monorail_wear.py: R the shade x 1.25, G rust, B roughness) it also shades, rusts and
// roughens. The includes stay, so later patches (look/) can still hook them.
export function wornMetal(material, tex = null) {
  if (tex) Object.assign(material, { map: tex, roughness: 1 });
  material.onBeforeCompile = (s) => {
    const rust = tex ? '\ndiffuseColor.rgb = mix( diffuseColor.rgb, rustColor * wear.r * 1.25, wear.g );' : '';
    let f = s.fragmentShader.replace(
      '#include <color_fragment>',
      'float alphaBeforeColor = diffuseColor.a;\n#include <color_fragment>\n#ifdef USE_COLOR_ALPHA\n' +
        'float metalClass = vColor.a;\ndiffuseColor.a = alphaBeforeColor;\n#else\nfloat metalClass = 1.0;\n#endif' +
        rust,
    );
    if (tex) {
      s.uniforms.rustColor = { value: RUST };
      f = ('uniform vec3 rustColor;\n' + f)
        .replace('#include <map_fragment>', 'vec4 wear = texture2D( map, vMapUv );\ndiffuseColor.rgb *= wear.r * 1.25;')
        .replace(
          '#include <roughnessmap_fragment>',
          '#include <roughnessmap_fragment>\nroughnessFactor = roughness * wear.b;',
        );
    }
    s.fragmentShader = f.replace(
      '#include <metalnessmap_fragment>',
      'float metalnessFactor = metalness * metalClass' + (tex ? ' * ( 1.0 - wear.g );' : ';'),
    );
  };
  material.customProgramCacheKey = () => (tex ? 'mono-wear' : 'mono-metal');
  return keepPatch(material);
}
