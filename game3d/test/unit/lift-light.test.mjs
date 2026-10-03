import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

// Codex X-0336: the morning ride left the forecourt away (the ride's dark background); the evening relight then
// took that dark as the place's own background, and it stayed dark for good.
test('a morning ride, then the evening relight, then the ride home give the place its own background back', async () => {
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (specifier === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
      return next(specifier, context);
    },
  });
  try {
    const THREE = await import('../../vendor/three/three.module.js');
    const { setDark, setAway, forgetLight } = await import('../../js/places/lift-light.js');
    const scene = new THREE.Scene(), space = new THREE.Group(), carG = new THREE.Group();
    scene.background = new THREE.Color('#5d636c');
    const sun = new THREE.DirectionalLight('#ffffff', 2);
    scene.add(space, sun);
    space.add(carG);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 9, 7);
    scene.add(camera);
    const L = {
      place: { scene, space }, cam: { camera }, car: { g: carG, land: 0 },
      site: { x: 0, zBack: 0, wallH: 2.4 }, box: { half: 0.85, back: -1.7, front: 0.2, top: 1.55, landing: 1.2 },
      dark: 0, away: 0,
    };
    const own = scene.background.getHex();
    setDark(L, 1); // on board, doors closed
    setAway(L, 1); // the car leaves floor 1
    assert.notEqual(scene.background.getHex(), own);
    assert.equal(L.shroud.visible, true);
    forgetLight(L); // the evening relight, while the forecourt still holds the morning's ride
    assert.equal(scene.background.getHex(), own, 'the relight puts the place back as built');
    assert.equal(sun.intensity, 2);
    assert.equal(L.shroud.visible, false);
    setAway(L, 0); // the ride home arrives on floor 1
    setDark(L, 1);
    setDark(L, 0); // lights up, doors open
    assert.equal(scene.background.getHex(), own, 'the ride home ends on the place\'s own background');
  } finally {
    hooks.deregister();
  }
});
