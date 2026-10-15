import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
registerHooks({
  resolve(s, c, next) {
    if (s === '../sim.js' && c.parentURL?.endsWith('/gameplay/seating.js'))
      return next('data:text/javascript,export function save(){}', c);
    if (s === './interact-menu.js' && c.parentURL?.endsWith('/gameplay/seating.js'))
      return next('data:text/javascript,export function addInteractOptions(){}', c);
    if (s === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
    if (s.startsWith('three/addons/')) return next(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
    return next(s, c);
  },
});
globalThis.ProgressEvent = class {
  constructor(_type, values) {
    Object.assign(this, values);
  }
};
const THREE = await import('../../vendor/three/three.module.js');
const { GLTFLoader } = await import('../../vendor/loaders/GLTFLoader.js');
const { clone } = await import('../../vendor/utils/SkeletonUtils.js');
const { meshyFrom } = await import('../../js/avatar.js');
const { poolMarkerAnchor, poolSeatAnchor } = await import('../../js/places/day3/pool-marker-anchor.js');
async function geometry(id, name, folder = 'swimwear-' + id) {
  const file = fs.readFileSync(new URL(`../../assets/characters/${folder}/${name}.glb`, import.meta.url));
  const length = file.readUInt32LE(12),
    json = JSON.parse(file.subarray(20, 20 + length));
  for (const mesh of json.meshes) for (const primitive of mesh.primitives) delete primitive.material;
  json.buffers[0].uri = 'data:application/octet-stream;base64,' + file.subarray(28 + length).toString('base64');
  return new GLTFLoader().parseAsync(JSON.stringify(json), '');
}
const assets = Object.fromEntries(
  await Promise.all(
    ['eric', 'carina', 'emi', 'kuro'].map(async (id) => [
      id,
      await Promise.all(['walk', 'run'].map((name) => geometry(id, name))),
    ]),
  ),
);
const sizes = Object.fromEntries(
  Object.entries(assets).map(([id, [walk]]) => [
    id,
    new THREE.Box3().setFromObject(walk.scene).getSize(new THREE.Vector3()).y,
  ]),
);
function actor(id) {
  const [walk, run] = assets[id],
    clip = (name) =>
      THREE.AnimationClip.parse(
        JSON.parse(fs.readFileSync(new URL(`../../assets/characters/swimwear-${id}/${name}.json`, import.meta.url))),
      );
  return meshyFrom(
    id,
    [
      { ...walk, scene: clone(walk.scene) },
      run,
      clip('idle'),
      { animations: [clip('sit')] },
      new THREE.Texture(),
      null,
    ],
    { height: id === 'eric' ? 1.2 : 1.12, size: sizes[id] },
  );
}
function highest(person, camera) {
  let top = -Infinity;
  person.root.updateWorldMatrix(true, false);
  person.root.updateMatrixWorld(true);
  person.model.traverse((mesh) => {
    if (!mesh.isSkinnedMesh) return;
    const a = mesh.geometry.attributes;
    for (let i = 0; i < a.position.count; i++) {
      if (
        ![0, 1, 2, 3].some(
          (k) =>
            a.skinWeight.getComponent(i, k) > 0.05 &&
            /Head|Neck/.test(mesh.skeleton.bones[a.skinIndex.getComponent(i, k)].name),
        )
      )
        continue;
      top = Math.max(
        top,
        mesh.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).project(camera).y,
      );
    }
  });
  return top;
}
for (const aspect of [390 / 844, 1366 / 860])
  test(`pool marker clears actual hair after an outfit identity or head transform changes at ${aspect}`, () => {
    const camera = new THREE.PerspectiveCamera(24, aspect, 0.01, 100);
    camera.position.set(6, 4, 4);
    camera.lookAt(0, 0.8, 0);
    camera.updateMatrixWorld(true);
    const anchor = poolMarkerAnchor(camera),
      person = {};
    for (const id of ['eric', 'carina', 'emi', 'kuro']) {
      Object.assign(person, actor(id));
      const parent = new THREE.Group();
      parent.position.set(40, 0, -24);
      parent.rotation.y = 0.3;
      parent.add(person.root);
      camera.position.set(46, 4, -20);
      camera.lookAt(40, 0.8, -24);
      camera.updateMatrixWorld(true);
      for (const yaw of [1.2, -0.6]) {
        person.sitAt(1.3, 0.34, -0.7, yaw);
        person.seated = true;
        person.model.getObjectByName('Head').rotation.z += 0.12;
        // First marker may follow a root movement/outfit install before renderer binding refresh.
        person.root.position.x += 1.5;
        person.root.position.z -= 0.8;
        person.root.updateWorldMatrix(true, false);
        person.root.updateMatrixWorld(true);
        const v = anchor(person, new THREE.Vector3()).project(camera);
        const top = highest(person, camera);
        assert.ok(v.y >= top + 0.019, `${id} marker remains above all hair`);
        assert.ok(v.y <= top + 0.2, `${id} marker stays close to actual rendered hair, gap ${v.y - top}`);
        assert.ok(Number.isFinite(v.x) && v.z > -1 && v.z < 1);
      }
    }
  });

test('first marker uses renderer attached-skin binding after scaled actor placement', () => {
  const camera = new THREE.PerspectiveCamera(24, 1366 / 860, 0.01, 100);
  camera.position.set(10, 4, -24);
  camera.lookAt(5, 0.8, -30);
  camera.updateMatrixWorld(true);
  for (const id of ['eric', 'carina', 'emi', 'kuro']) {
    const person = actor(id),
      scene = new THREE.Group();
    scene.add(person.root);
    person.root.scale.setScalar(1.18);
    person.sitAt(5, 0.34, -30, 1.2);
    const anchor = poolMarkerAnchor(camera),
      v = anchor(person, new THREE.Vector3()).project(camera);
    scene.updateMatrixWorld(true);
    const top = highest(person, camera);
    assert.ok(
      v.y >= top + 0.019 && v.y < top + 0.2,
      `${id} first marker remains near rendered hair: ${v.y} versus ${top}`,
    );
    assert.ok(
      Math.abs(anchor(person, new THREE.Vector3()).project(camera).y - v.y) < 1e-6,
      'renderer update cannot change cached anchor',
    );
  }
});

globalThis.location = { search: '' };
globalThis.window = { addEventListener() {} };
globalThis.innerWidth = 1366;
globalThis.innerHeight = 860;
const paint = new Proxy(
  {
    measureText: () => ({ width: 100 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  },
  { get: (o, k) => o[k] ?? (() => {}) },
);
globalThis.document = {
  body: { classList: { contains: () => false, toggle() {} } },
  documentElement: { style: { setProperty() {} } },
  createElement: () => ({ getContext: () => paint }),
};
const { RoomCam } = await import('../../js/cam.js');
const { followFit } = await import('../../js/places/turning-cam.js');
const { changingNavigation } = await import('../../js/scenes/sports/changing-room.js');
const D = await import('../../js/scenes/sports/deck-plan.js');
const { attachSeating } = await import('../../js/gameplay/seating.js');
const { installPicking } = await import('../../js/gameplay/pick-volumes.js');
const ordinary = Object.fromEntries(
  await Promise.all(
    ['eric', 'carina'].map(async (id) => {
      const parts = await Promise.all(
        ['walk', 'run', 'sit'].map((name) => geometry(id, name, id === 'eric' ? '../eric' : 'carina')),
      );
      return [
        id,
        {
          parts,
          size: new THREE.Box3().setFromObject(parts[0].scene).getSize(new THREE.Vector3()).y,
          idle: THREE.AnimationClip.parse(
            JSON.parse(fs.readFileSync(new URL(`../../assets/characters/relaxed-idle-${id}.json`, import.meta.url))),
          ),
        },
      ];
    }),
  ),
);
function standingBench(aspect, id) {
  const {
    parts: [walk, run, sit],
    size,
    idle,
  } = ordinary[id];
  const person = meshyFrom(id, [{ ...walk, scene: clone(walk.scene) }, run, idle, sit, new THREE.Texture(), null], {
    height: id === 'eric' ? 1.2 : 1.12,
    size,
  });
  const space = new THREE.Group();
  space.add(person.root);
  person.root.scale.setScalar(1.18);
  person.root.position.set(4.44, 0, -31.836);
  person.root.rotation.y = Math.PI / 2;
  person.setState('idle');
  person.seated = false;
  person.update(0.1);
  const walks = [...D.WALKS, ...changingNavigation().walks];
  const nav = {
    x0: Math.min(...walks.map((r) => r[0])) - 0.2,
    x1: Math.max(...walks.map((r) => r[1])) + 0.2,
    z0: Math.min(...walks.map((r) => r[2])) - 0.2,
    z1: Math.max(...walks.map((r) => r[3])) + 0.2,
    free: () => true,
  };
  const cam = new RoomCam({ yaw: -0.22, elev: 54, fov: 24, space });
  followFit(cam, nav, aspect, { yaw: -0.22, elev: (54 * Math.PI) / 180 });
  cam.snap(person.root.position);
  return { person, space, nav, cam };
}
for (const id of ['eric', 'carina'])
  for (const [width, height] of [
    [390, 844],
    [1366, 860],
  ])
    test(`standing bench action clears ordinary production ${id} while pick volume stays fixed ${width}`, () => {
      const { person, space, nav, cam } = standingBench(width / height, id);
      const game = { player: person, near: { id: 'bench' } };
      const place = {
        name: 'pool',
        space,
        nav,
        seats: { bench: { x: 3.89, z: -31.836, top: 0.34, ry: Math.PI / 2, out: [4.44, -31.836] } },
        things: {},
        people: {},
        characterAnchor: poolMarkerAnchor(cam.camera),
      };
      game.place = place;
      attachSeating(game, place);
      const target = place.things.bench,
        marker = { ...target, id: 'bench', enabled: () => true };
      game.markers = { list: [marker] };
      const picking = installPicking(game, () => []),
        ray = new THREE.Raycaster();
      const picked = () => {
        const hits = [];
        for (let x = 3.4; x < 4.4; x += 0.05)
          for (let z = -32.3; z < -31.4; z += 0.05) {
            ray.set(new THREE.Vector3(x, 3, z), new THREE.Vector3(0, -1, 0));
            hits.push(picking.modelAt(ray)?.id ?? null);
          }
        return hits;
      };
      const before = target.anchor(new THREE.Vector3()),
        originalHits = picked();
      place.seatAnchor = poolSeatAnchor(cam.camera);
      for (let frame = 0; frame < 12; frame++) {
        person.update(0.1);
        cam.update(0.1, person.root.position);
        const out = target.anchor(new THREE.Vector3()),
          ndc = out.clone().project(cam.camera),
          hair = highest(person, cam.camera);
        assert.equal(out.x, before.x);
        assert.equal(out.z, before.z);
        assert.ok(ndc.y >= hair + 0.019, 'whole pin and desktop key are above the measured hair');
        assert.deepEqual(target.spot(), [4.44, -31.836]);
        assert.deepEqual(picked(), originalHits, 'actual pick-box rays retain the same target volume');
      }
      game.near = null;
      assert.deepEqual(
        target.anchor(new THREE.Vector3()).toArray(),
        before.toArray(),
        'leaving nearby seat restores its ordinary anchor',
      );
      // The shared seating hook carries no callback into the next place.
      const other = {
        name: 'dorm_commons',
        space: new THREE.Group(),
        nav: { free: () => true },
        seats: { bench: { x: 1, z: 2, top: 0.34, ry: 0 } },
        things: {},
        people: {},
      };
      game.place = other;
      game.near = { id: 'bench' };
      attachSeating(game, other);
      assert.deepEqual(other.things.bench.anchor(new THREE.Vector3()).toArray(), [1, 0.34 + 0.25, 2]);
    });

globalThis.addEventListener = () => {};
const { buildSports } = await import('../../js/scenes/sports.js');
const { seatInventory } = await import('../../js/gameplay/seat-inventory.js');
const { meshesNear } = await import('../../js/gameplay/highlight.js');
test('all real pool seats keep the same physical meshes when the label clears a nearby player', () => {
  const floor = changingNavigation(),
    world = buildSports({
      walks: [...D.WALKS, ...floor.walks],
      blocks: [...D.BLOCKS, ...floor.blocks],
      poolInterior: true,
    });
  const place = { space: world.root, nav: world.nav };
  for (const id of ['eric', 'carina']) {
    const { person, cam } = standingBench(1366 / 860, id);
    world.root.add(person.root);
    for (const s of seatInventory(place).values()) {
      person.root.position.set(s.x + Math.sin(s.ry) * 0.55, 0, s.z + Math.cos(s.ry) * 0.55);
      cam.snap(person.root.position);
      const before = world.root.localToWorld(new THREE.Vector3(s.x, s.top + 0.25, s.z)),
        after = poolSeatAnchor(cam.camera)(person, before.clone());
      assert.deepEqual(
        meshesNear(world.root, after, new Set([person.root])).map((m) => m.uuid),
        meshesNear(world.root, before, new Set([person.root])).map((m) => m.uuid),
        'same mesh candidates ' + id + ' ' + s.id,
      );
    }
    person.root.removeFromParent();
  }
});
