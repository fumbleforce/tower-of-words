import { SRGBColorSpace } from 'three';
import { loadSkin } from '../perf/skin-tex.js';
import { CDIR, V } from '../mio.js';

// The coast already holds its full resident cast. Reuse the approved world-size skin for
// the extra travelling person there; phone keeps its existing 1024 copy via loadSkin.
const coast =
  typeof addEventListener === 'function' ? await loadSkin(CDIR + 'kenji/base.webp' + V(), { desktop: 512 }) : null;
if (coast) {
  coast.flipY = false;
  coast.colorSpace = SRGBColorSpace;
}

export function outingSkin(rig) {
  const maps = new Map();
  if (coast && rig.meshy && !rig.chibi)
    rig.root.traverse((object) => {
      for (const material of [object.material].flat()) if (material?.map) maps.set(material, material.map);
    });
  return (place) => {
    for (const [material, original] of maps) material.map = place === 'east_coast' ? coast : original;
  };
}
