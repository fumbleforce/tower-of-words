import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { after, test } from 'node:test';

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three')
      return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
    if (specifier.startsWith('three/addons/'))
      return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
    return next(specifier, context);
  },
});
after(() => hooks.deregister());
globalThis.window = {};
globalThis.document = {
  createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) }),
};
const THREE = await import('../../vendor/three/three.module.js');
const { trainBunCamera } = await import('../../js/train/bun-camera.js');
const { damp } = await import('../../js/cam.js');
const { buildCar } = await import('../../js/train/car.js');
const bun = new THREE.Vector3(-0.75, 0.116, 0.96);
const bagStop = new THREE.Vector3(-0.3304, 0, 0.2417);

function fixture(phone = false, authored = true) {
  const angle = ((phone ? 62 : 58) * Math.PI) / 180;
  const camera = new THREE.PerspectiveCamera(phone ? 40 : 20, phone ? 390 / 844 : 2560 / 1440, 1, 160);
  const cam = {
    camera,
    follow: phone,
    target: new THREE.Vector3(0, 0.45, 0.1),
    dist: 16.78,
    fitDist: 16.78,
    dir: phone
      ? new THREE.Vector3(-Math.cos(angle), Math.sin(angle), 0)
      : new THREE.Vector3(0, Math.sin(angle), Math.cos(angle)),
    close: null,
    velocity: [0, 0, 0, 0],
    wanted() {
      return [
        this.close ? new THREE.Vector3(this.close.x, 0.45, this.close.z) : new THREE.Vector3(0, 0.45, 0.1),
        this.close ? this.fitDist / this.close.zoom : this.fitDist,
      ];
    },
    place() {
      camera.position.copy(this.target).addScaledVector(this.dir, this.dist);
      camera.lookAt(this.target);
      camera.updateMatrixWorld();
    },
    update(dt) {
      const [target, distance] = this.wanted();
      for (let i = 0; i < 3; i++)
        this.target.setComponent(
          i,
          damp(this.target.getComponent(i), target.getComponent(i), this.velocity, i, 0.7, dt),
        );
      this.dist = damp(this.dist, distance, this.velocity, 3, 0.805, dt);
      this.place();
    },
    snap() {
      const [target, distance] = this.wanted();
      this.target.copy(target);
      this.dist = distance;
      this.velocity.fill(0);
      this.place();
    },
  };
  cam.snap();
  const view = authored && trainBunCamera(cam, () => bun);
  return { cam, view };
}

test('desktop bun shot clears actual carriage poles after settling', () => {
  const { cam } = fixture();
  const car = buildCar('land');
  car.root.updateMatrixWorld(true);
  const poles = [];
  car.root.traverse((o) => {
    if (
      o.geometry?.type === 'CylinderGeometry' &&
      o.geometry.parameters.radiusTop <= 0.023 &&
      o.geometry.parameters.height > 1
    )
      poles.push(o);
  });
  assert(poles.length >= 6, 'use real carriage poles');
  cam.close = { x: bun.x, z: bun.z, zoom: 1.7 };
  cam.snap();
  const ray = new THREE.Raycaster();
  const baseline = fixture(false, false).cam;
  baseline.close = structuredClone(cam.close);
  baseline.snap();
  let baselineHits = 0;
  for (const y of [0.35, 0.5, 0.65, 0.8, 0.95])
    for (const dx of [-0.12, -0.06, 0, 0.06, 0.12]) {
      const point = bagStop
          .clone()
          .setY(y)
          .add(new THREE.Vector3(dx, 0, 0)),
        delta = point.clone().sub(baseline.camera.position);
      ray.set(baseline.camera.position, delta.clone().normalize());
      ray.far = delta.length() - 0.02;
      baselineHits += ray.intersectObjects(poles, false).length;
    }
  assert(baselineHits > 0, 'the ordinary close-up reproduces the pole obstruction');
  for (const y of [0.35, 0.5, 0.65, 0.8, 0.95])
    for (const dx of [-0.12, -0.06, 0, 0.06, 0.12]) {
      const point = bagStop
          .clone()
          .setY(y)
          .add(new THREE.Vector3(dx, 0, 0)),
        delta = point.clone().sub(cam.camera.position);
      ray.set(cam.camera.position, delta.clone().normalize());
      ray.far = delta.length() - 0.02;
      assert.equal(ray.intersectObjects(poles, false).length, 0, `pole at Eric height ${y}`);
    }
});

test('desktop move-in, release and another target rotate smoothly and restore the ordinary view', () => {
  const { cam } = fixture();
  const home = cam.camera.position.clone();
  cam.close = { x: bun.x, z: bun.z, zoom: 1.7 };
  let previous = cam.camera.position.clone();
  for (let i = 0; i < 360; i++) {
    cam.update(1 / 60);
    assert(cam.camera.position.distanceTo(previous) < 0.3, 'no camera cut during move-in');
    previous.copy(cam.camera.position);
  }
  assert(cam.camera.position.x < -4, 'authored angle reaches the left end');
  cam.close = { x: 1.32, z: 0.96, zoom: 1.7 };
  for (let i = 0; i < 360; i++) cam.update(1 / 60);
  assert(Math.abs(cam.camera.position.x - cam.target.x) < 1e-5, 'other passenger uses ordinary direction');
  cam.close = null;
  for (let i = 0; i < 360; i++) cam.update(1 / 60);
  assert(cam.camera.position.distanceTo(home) < 1e-4, 'release returns to normal view');
});

test('Continue snaps the same saved close-up without extra serialized state', () => {
  const first = fixture().cam;
  first.close = { x: bun.x, z: bun.z, zoom: 1.7 };
  for (let i = 0; i < 600; i++) first.update(1 / 60);
  const restored = fixture().cam;
  restored.close = structuredClone(first.close);
  restored.snap();
  assert(restored.camera.position.distanceTo(first.camera.position) < 1e-6);
});

test('portrait uses the original direction throughout the bun shot and release', () => {
  const { cam } = fixture(true);
  const direction = cam.dir.clone();
  for (const close of [{ x: bun.x, z: bun.z, zoom: 1.7 }, null]) {
    cam.close = close;
    for (let i = 0; i < 360; i++) {
      cam.update(1 / 60);
      const actual = cam.camera.position.clone().sub(cam.target).normalize();
      assert(actual.distanceTo(direction) < 1e-12);
    }
  }
});
