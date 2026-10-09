// What each world kit piece costs at each detail level (game3d/js/kit/core/detail.js), for the Asset library: every
// variant of every piece in the registry (game3d/js/kit/index.js PIECES) built at phone, standard and high, with
// its triangles and the draws it adds (one per kind of surface it uses; a place's merge pass folds same-kind draws
// across pieces, so these are what one piece alone costs). Runs in Node, no browser.
//   node tools/assets/kit-costs.mjs     prints JSON (scan.py reads it into tools/assets/kit-library.json)
import { registerHooks } from 'node:module';

const VENDOR = new URL('../../game3d/vendor/', import.meta.url);
registerHooks({
  resolve(s, c, next) {
    if (s === 'three') return next(new URL('three/three.module.js', VENDOR).href, c);
    if (s.startsWith('three/addons/')) return next(new URL(s.slice(13), VENDOR).href, c);
    return next(s, c);
  },
});
const THREE = await import(new URL('three/three.module.js', VENDOR).href);
const kit = await import('../../game3d/js/kit/index.js');
const { Parts } = await import('../../game3d/js/kit/core/parts.js');

const count = (root) => {
  let tris = 0, draws = 0;
  root.traverse((o) => {
    if (!o.isMesh) return;
    draws++;
    tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
  });
  return { tris: Math.round(tris), draws };
};

export function kitCosts() {
  const out = {};
  for (const place of kit.PIECES) {
    const d = place.decl, variants = {};
    for (const v of Object.keys(d.variants || { default: {} })) {
      variants[v] = {};
      for (const level of kit.LEVELS) {
        const p = new Parts();
        place(p, d.run ? { from: [-1.5, 0], to: [1.5, 0], variant: v, level, seed: 1 } : { at: [0, 0], variant: v, level, seed: 1 });
        const root = new THREE.Group();
        kit.buildKit(p, root);
        variants[v][level] = count(root);
      }
    }
    out[d.id] = { variants };
  }
  return {
    levels: kit.LEVELS.map((l) => [l, kit.LEVEL_ABOUT[l]]),
    fidelity: kit.FIDELITY,
    pieces: out,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(kitCosts()));
