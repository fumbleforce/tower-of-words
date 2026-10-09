import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

// The far view (#365) puts a sky picture behind every outdoor place, where the lift used to find a background colour:
// the ride dims the sky and its haze, and the relight gives both back.
test('a ride under a sky picture dims it and the haze, then puts both back', async () => {
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (specifier === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
      return next(specifier, context);
    },
  });
  try {
    const THREE = await import('../../vendor/three/three.module.js');
    const { setDark, setAway, forgetLight } = await import('../../js/places/lift-light.js');
    const { setCap } = await import('../../js/places/lift-cut.js');
    const scene = new THREE.Scene(), space = new THREE.Group(), carG = new THREE.Group();
    const sky = new THREE.Texture();
    scene.background = sky;
    scene.fog = new THREE.Fog('#bccad4', 30, 140);
    scene.add(space);
    space.add(carG);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 9, 7);
    scene.add(camera);
    const cap = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true }));
    const L = {
      place: { scene, space }, cam: { camera }, car: { g: carG, land: 0, cap },
      site: { x: 0, zBack: 0, wallH: 2.4 }, box: { half: 0.85, back: -1.7, front: 0.2, top: 1.55, landing: 1.2 },
      dark: 0, away: 0,
    };
    const haze = scene.fog.color.getHex();
    setCap(L, 1);
    assert.equal(cap.material.color.getHex(), haze, 'the lid takes the haze colour behind a sky');
    setDark(L, 1); // on board, doors closed
    setAway(L, 1); // the car leaves the floor
    assert.equal(scene.background, sky, 'the sky picture stays');
    assert.ok(scene.backgroundIntensity < 0.2, 'and is dimmed');
    assert.notEqual(scene.fog.color.getHex(), haze);
    assert.equal(L.shroud.material.color.getHex(), scene.fog.color.getHex(), 'the shroud matches the dimmed haze');
    forgetLight(L); // the evening relight
    assert.equal(scene.backgroundIntensity, 1);
    assert.equal(scene.fog.color.getHex(), haze);
  } finally {
    hooks.deregister();
  }
});
