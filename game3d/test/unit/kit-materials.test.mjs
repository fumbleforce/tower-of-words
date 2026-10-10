// Metal and glass finishes (game3d/js/kit/materials/, #366): the cache builds them from plain options, a finish's own
// values give way to the caller's, shader patches chain and survive clone(), and the monorail is built from them with
// the values it had before.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({
  resolve(s, c, next) {
    if (s === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
    if (s.startsWith('three/addons/')) return next(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
    return next(s, c);
  },
});
const THREE = await import('../../vendor/three/three.module.js');
const { mat } = await import('../../js/kit/core/mat.js');
const { FINISH, wornMetal } = await import('../../js/kit/materials/metal.js');
const { localHorizon } = await import('../../js/kit/materials/glass.js');
const { partsFrom } = await import('../../js/train/models.js');

test('a finish through the cache: plain options, its own values unless given, one material per key', () => {
  const a = mat('#7a8088', { finish: 'painted' });
  assert.equal(a.roughness, FINISH.painted.roughness);
  assert.equal(a.metalness, FINISH.painted.metalness);
  assert.equal(a.userData.finish, 'painted');
  assert.equal(a.finish, undefined, 'the finish keys stay off the three.js material');
  assert.equal(mat('#7a8088', { finish: 'painted' }), a);
  const b = mat('#7a8088', { finish: 'painted', roughness: 0.3 });
  assert.notEqual(b, a);
  assert.equal(b.roughness, 0.3);
  assert.equal(mat('#ffffff', { finish: 'brushed' }).metalness, FINISH.brushed.metalness);
  assert.throws(() => mat('#fff', { finish: 'chrome' }));
});

test('a pane with a local horizon chains with an earlier patch and keeps both through clone()', () => {
  const m = new THREE.MeshStandardMaterial();
  const seen = [];
  m.onBeforeCompile = () => seen.push('first');
  m.customProgramCacheKey = () => 'first';
  localHorizon(m, ['y', 1.55, 1.5]);
  assert.match(m.customProgramCacheKey(), /^first\|pane-y-1\.55-1\.5$/);
  const shader = {
    vertexShader: '#include <begin_vertex>',
    fragmentShader: '#include <envmap_physical_pars_fragment>',
  };
  m.onBeforeCompile(shader);
  assert.deepEqual(seen, ['first']);
  assert.match(shader.vertexShader, /vPaneH = position\.y;/);
  assert.match(shader.fragmentShader, /vPaneH - 1\.550 \) \* 1\.500/);
  const c = m.clone();
  assert.equal(c.onBeforeCompile, m.onBeforeCompile);
  assert.equal(c.customProgramCacheKey(), m.customProgramCacheKey());
});

test('the monorail skin is the brushed finish with its wear, as before', () => {
  const scene = new THREE.Group();
  for (const name of ['car_skin', 'car_under', 'bellows', 'beam', 'pillar', 'foot']) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    m.name = name;
    scene.add(m);
  }
  const tex = new THREE.Texture();
  const parts = partsFrom(scene, tex);
  const skin = parts.car_skin.material,
    under = parts.car_under.material;
  // the values the car had before the shared finishes (train/models.js at 271c1f10)
  assert.deepEqual([skin.roughness, skin.metalness, skin.map], [1, 0.8, tex]);
  assert.deepEqual([under.roughness, under.metalness], [0.5, 0.2]);
  assert.equal(skin.customProgramCacheKey(), 'mono-wear');
  assert.equal(skin.clone().onBeforeCompile, skin.onBeforeCompile);
  assert.equal(parts.beam.material.envMap, null);
  const plain = wornMetal(new THREE.MeshStandardMaterial());
  assert.equal(plain.customProgramCacheKey(), 'mono-metal');
});
