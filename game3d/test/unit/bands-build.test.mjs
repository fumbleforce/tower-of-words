// Every place's bands (scenes/bands.js, #260) build without errors, and stay inside a triangle budget per place (the
// static geometry they add before the place's merge; the perf baselines in tools/perf/budgets.json cover the frame).
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

export const BAND_TRIS = 35000; // per place, all its bands

test('every place builds its bands inside the triangle budget', async () => {
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (specifier === 'three')
        return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
      if (specifier.startsWith('three/addons/'))
        return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
      return next(specifier, context);
    },
  });
  const saved = {
    location: globalThis.location,
    window: globalThis.window,
    document: globalThis.document,
    addEventListener: globalThis.addEventListener,
    localStorage: globalThis.localStorage,
    innerWidth: globalThis.innerWidth,
    innerHeight: globalThis.innerHeight,
  };
  // a canvas that draws nothing, for the signs' textures
  const ctx = new Proxy(
    {},
    { get: (t, k) => (k in t ? t[k] : k === 'width' ? 10 : () => ctx), set: (t, k, v) => ((t[k] = v), true) },
  );
  Object.assign(globalThis, {
    location: { search: '' },
    window: {},
    addEventListener() {},
    innerWidth: 1366,
    innerHeight: 860,
    localStorage: { getItem: () => null, setItem() {} },
    document: {
      body: { classList: { contains: () => false, toggle() {}, add() {}, remove() {} } },
      documentElement: { style: { setProperty() {} } },
      createElement: () => ({ width: 1, height: 1, getContext: () => ctx, style: {} }),
    },
  });
  try {
    const THREE = await import('../../vendor/three/three.module.js');
    const { bandSteps, BANDS } = await import('../../js/scenes/bands.js');
    for (const chunk of Object.keys(BANDS)) {
      const root = new THREE.Group(),
        it = bandSteps(root, chunk);
      let r = it.next();
      while (!r.done) r = it.next();
      const total = r.value.stats.reduce((s, b) => s + b.tris, 0);
      console.log(chunk, total, r.value.stats.map((b) => `${b.by} ${b.tris}/${b.meshes}`).join(', '), 'ids', r.value.ids.join(' '));
      assert.ok(total < BAND_TRIS, `${chunk}: its bands are ${total} triangles, over ${BAND_TRIS}`);
    }
  } finally {
    hooks.deregister();
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
