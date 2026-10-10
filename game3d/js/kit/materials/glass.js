// A pane that reflects like a street close by (#366): the sky picture (kit/materials/env.js) is infinitely far away,
// so under the near top-down street camera every pane of a facade reflects the same tint. Shifting the reflected
// direction up or down with the height on the pane brings the horizon into it: sky in the upper panes, the street in
// the lower ones, moving as the camera moves. From the sports hall's and the harbour hut's glass, which each had
// their own copy (scenes/sports/gym-facade.js, scenes/harbour/loading-details.js).
//
//   localHorizon(material, [from, at, k])   from: 'uv' (the pane's own v, 0 to 1) or 'y' (the geometry's height);
//                                           at: where on it the horizon is; k: how far the reflection turns per unit
// Through the cache: mat(color, { finish: 'glass', horizon: ['y', 1.55, 1.5] }).
import * as THREE from 'three';
import { keepPatch } from './patch.js';

export function localHorizon(material, [from, at, k]) {
  const src = from === 'uv' ? 'uv.y' : 'position.y';
  const prev = material.onBeforeCompile,
    prevKey = material.customProgramCacheKey,
    had = prev !== THREE.Material.prototype.onBeforeCompile;
  material.onBeforeCompile = function (shader, r) {
    if (had) prev.call(this, shader, r);
    shader.vertexShader =
      'varying float vPaneH;\n' +
      shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\nvPaneH = ${src};`);
    shader.fragmentShader =
      'varying float vPaneH;\n' +
      shader.fragmentShader.replace(
        '#include <envmap_physical_pars_fragment>',
        THREE.ShaderChunk.envmap_physical_pars_fragment.replace(
          'reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );',
          'reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );\n' +
            `reflectVec = normalize( reflectVec + vec3( 0.0, ( vPaneH - ${(+at).toFixed(3)} ) * ${(+k).toFixed(3)}, 0.0 ) );`,
        ),
      );
  };
  const key = `|pane-${from}-${at}-${k}`;
  material.customProgramCacheKey = function () {
    return (had ? prevKey.call(this) : '') + key;
  };
  return keepPatch(material);
}
