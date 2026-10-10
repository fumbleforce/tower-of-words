import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

// Issue #233 (Codex X-0537 on d4e9b1db): a held press steering Eric round a prop takes the nav route; when someone
// held him up on it, the walker planned round them (walker.js, blockT) and the new route lost its steer tag, so
// letting go (steer.js end) didn't cancel it and he walked on another couple of metres. The real SmoothWalker, Nav
// and installSteer: Eric at (0,0) steered at (0,6), a prop across x[-0.8,0.8] z[2,3], someone fixed at (0,0.48).
test('letting go of a steer stops Eric after a detour round someone', async () => {
  const vendor = new URL('../../vendor/three/three.module.js', import.meta.url).href;
  registerHooks({
    resolve(specifier, context, next) {
      if (specifier === 'three') return { url: vendor, shortCircuit: true };
      if (specifier.startsWith('three/addons/'))
        return { url: new URL(`../../vendor/${specifier.slice(13)}`, import.meta.url).href, shortCircuit: true };
      return next(specifier, context);
    },
    load(url, context, next) {
      // the walker's footstep sounds aren't under test
      if (url.endsWith('/js/sfx.js'))
        return { format: 'module', source: 'export const sfx = () => {};', shortCircuit: true };
      return next(url, context);
    },
  });
  const listeners = {};
  const saved = {
    window: globalThis.window,
    add: globalThis.addEventListener,
    document: globalThis.document,
    location: globalThis.location,
  };
  globalThis.location = { search: '', hostname: 'localhost', href: 'http://localhost/' };
  globalThis.addEventListener = (t, f) => (listeners[t] ||= []).push(f);
  globalThis.window = globalThis;
  globalThis.document = { body: { classList: { contains: () => false } }, activeElement: null };
  try {
    const THREE = await import(vendor);
    const { SmoothWalker } = await import('../../js/movement/walker.js');
    const { Nav } = await import('../../js/movement/navigation.js');
    const { installSteer } = await import('../../js/movement/steer.js');
    const nav = new Nav(-4, 4, -4, 8).block(-0.8, 0.8, 2, 3);
    const space = new THREE.Group(),
      eric = new THREE.Group(),
      other = new THREE.Group();
    space.add(eric, other);
    other.position.set(0, 0, 0.48);
    const person = { x: 0, z: 0.48, r: 0.24, root: other, id: 'staff', rig: { _noAvoid: true } };
    const walker = new SmoothWalker(eric, nav, { others: () => [person] });
    const camera = new THREE.PerspectiveCamera();
    const game = {
      walker,
      t: 0,
      place: { space, camera, floorY: 0, charScale: 1, pick: () => ({ x: 0, z: 6 }) },
    };
    globalThis.__game = game;
    const canvas = { addEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) };
    const steer = installSteer(game, canvas);
    steer.press({ button: 0, isPrimary: true, pointerId: 1, pointerType: 'mouse', clientX: 50, clientY: 50 });
    const t0 = performance.now();
    while (performance.now() - t0 < 260); // past the hold time
    const dt = 1 / 60;
    let detoured = false;
    for (let f = 0; f < 240 && !detoured; f++) {
      steer.update(dt);
      const before = walker.path;
      walker.update(dt, camera);
      detoured = !!before && !!walker.path && walker.path !== before && walker.blockT < 0;
    }
    assert.ok(detoured, 'the walker planned round the person while steering');
    for (const f of listeners.pointerup) f({ pointerId: 1 });
    const at = [eric.position.x, eric.position.z];
    for (let f = 0; f < 120; f++) walker.update(dt, camera);
    const went = Math.hypot(eric.position.x - at[0], eric.position.z - at[1]);
    assert.equal(walker.path, null);
    assert.ok(went < 0.5, `he braked to a stop after letting go (moved ${went.toFixed(2)} m)`);
  } finally {
    globalThis.window = saved.window;
    globalThis.addEventListener = saved.add;
    globalThis.document = saved.document;
    globalThis.location = saved.location;
  }
});
