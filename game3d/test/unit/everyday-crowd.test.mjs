import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { registerHooks } from 'node:module';
import * as THREE from '../../vendor/three/three.module.js';

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
    if (specifier.startsWith('three/addons/'))
      return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
    const resolved = next(specifier, context);
    // perf/phone.js reads the page's settings; here a phone is a narrow viewport (the train tests set innerWidth)
    if (resolved.url.split('?')[0].endsWith('/js/perf/phone.js'))
      return { url: 'data:text/javascript,export const phoneLighter = () => (globalThis.innerWidth || 1366) < 600;', shortCircuit: true };
    return resolved;
  },
});
globalThis.location = { search: '?chibi=0' };
const { GLTFLoader } = await import('../../vendor/loaders/GLTFLoader.js');
const { prepareApprovedCrowd, approvedCrowd } = await import('../../js/crowd/approved-models.js');
const { EVERYDAY_ROLES, prepareCrowdBodies, preparePlacePeople, crowdBody, generic, variant, roleBody } =
  await import('../../js/chibi-crowd.js');
const { tintUniforms, shadeTint } = await import('../../js/crowd/tint.js');

const selected = {
  'casual-1': {
    walk: 'acf1758509153d1fbe246fe6ea14592f123526c42d47954cfa5c78a4e548b17a',
    run: '1456f896f4e1129834fee98f01c96fbe7fd1572d65585cc38e9543b51551c592',
    sit: 'f2e9c53542a7eb065a066bee701a2592e2ef15a4061c07f2c4adc013d0bb0df0',
    idle: '6ad90c50649a6b92b28450cb2f3f88e5518b1a43a5a1307afd44732431b06f4b',
    base: 'ab01e9c28eec5f544de48b01ea6c803d706aa86ccf26e12765e254569b47775b',
  },
  'older-1': {
    walk: '601c3f9f908ceaf83a1218ff9db324a868fab020e34f878f14cb13bcd5a72040',
    run: '36391d6b3806c091c94425e20d76a7a5c875ca422b3bf8a78ea8f22d7f4d89d5',
    sit: '9ba96a376ec75ccd938fe2e58616164af38154432c158af7f68f75d661616215',
    idle: 'd5fc9fea5b6136ee690c501815c758658b982a71b7d7392acbdb6ec47ad2336e',
    base: '06ebc4ecd2cf3650b7922abb74d92ae4cbe9a78439cc0cb72478f6ba2227321b',
  },
  'service-1': {
    walk: '671e4e8ca4230b9ab4313b620872c77c14cfd4b29074c932477d408cbf19e089',
    run: 'a8e4f38eff69dbaadd76da5f8d5a87b91979a1580c3572a521b146aca6dbd9a1',
    sit: 'f43f69a71e3daa4621e14c6006d938346f28164b69c6c39894404dcf7435192b',
    idle: '265dfa4c8d5c32f61ba9ac69c17a801eb64d755ef85fa65d1a7ad3362dfaba22',
  },
};
for (const [body, files] of Object.entries(selected)) {
  test(`${body} runtime assets retain the selected native geometry and motion`, () => {
    for (const [name, expected] of Object.entries(files)) {
      const extension = name === 'idle' ? 'json' : name === 'base' ? 'webp' : 'glb';
      const bytes = fs.readFileSync(new URL(`../../assets/characters/crowd-${body}/${name}.${extension}`, import.meta.url));
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), expected, `${body}/${name}`);
    }
  });
}

// These tests exercise the loading/factory contract on the existing native A rig.
// The selected everyday meshes and their contact geometry have separate native QA.
const fixture = new URL('../../assets/characters/crowd-a/', import.meta.url);
const parse = new GLTFLoader().register(() => ({
  name: 'test-textures',
  loadTexture: () => Promise.resolve(new THREE.Texture()),
}));
const originals = {
  gltf: GLTFLoader.prototype.loadAsync,
  texture: THREE.TextureLoader.prototype.loadAsync,
  fetch: globalThis.fetch,
};
const requests = [];
const regions = { hair: { hex: '#201810', lum: 0.1 }, top: { hex: '#a03030', lum: 0.2 } };
const urlFile = (url) => new URL(url).pathname.split('/').at(-1);
GLTFLoader.prototype.loadAsync = async function (url) {
  requests.push(url);
  const bytes = fs.readFileSync(new URL(urlFile(url), fixture));
  return parse.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
};
THREE.TextureLoader.prototype.loadAsync = async function (url) {
  requests.push(url);
  return new THREE.Texture();
};
globalThis.fetch = async (url) => {
  requests.push(url);
  return {
    ok: true,
    json: async () => urlFile(url) === 'regions.json'
      ? regions
      : JSON.parse(fs.readFileSync(new URL('idle.json', fixture))),
  };
};
test.after(() => {
  GLTFLoader.prototype.loadAsync = originals.gltf;
  THREE.TextureLoader.prototype.loadAsync = originals.texture;
  globalThis.fetch = originals.fetch;
  hooks.deregister();
});

test('place preload uses the shared staff role and reuses simultaneous downloads', async () => {
  assert.ok(approvedCrowd('service-1') === null);
  await preparePlacePeople('office');
  assert.equal(requests.length, 0, 'office preparation does not fetch shop staff');
  await Promise.all([preparePlacePeople('bakery'), preparePlacePeople('plaza'), preparePlacePeople('konbini')]);
  assert.equal(requests.length, 7);
  assert.equal(new Set(requests).size, 7);
  assert.ok(requests.every((url) => url.includes('/crowd-service-1/')));
  for (const place of ['bakery', 'konbini', 'canteen', 'plaza', 'ferry_terminal']) {
    assert.ok(EVERYDAY_ROLES.apron.places.includes(place));
    await preparePlacePeople(place);
  }
  // the canteen's and the terminal's seated residents add their own bodies; the staff body is never fetched again
  assert.equal(requests.filter((url) => url.includes('/crowd-service-1/')).length, 7);
});

test('selected staff keeps proxy parts and explicit apron colour with the chibi switch off', () => {
  const rig = generic('apron', 25, { proxy: true, tint: { top: '#668578' } });
  assert.equal(rig.approvedCrowd, 'service-1');
  assert.ok(rig.chibi && rig.bridge);
  assert.equal(rig.arms.length, 2);
  assert.ok(rig.torso && rig.headK);
  const meshes = [];
  rig.model.traverse((mesh) => mesh.isMesh && meshes.push(mesh));
  const uniforms = meshes[0].material.userData.tint;
  assert.equal(uniforms.tHair.value.w, 0, 'an apron override must not recolour the hair');
  assert.equal(uniforms.tBot.value.w, 0, 'an apron override must not recolour trousers');
  assert.equal(uniforms.tTop.value.w, regions.top.lum);
  assert.equal(uniforms.tMask.value.flipY, false);
  for (let i = 0; i < 60; i++) rig.update(1 / 60);
  assert.ok(rig.root.position.toArray().every(Number.isFinite));
});

test('ambient preparation loads selected kinds without changing the office numeric API', async () => {
  const start = requests.length;
  await prepareCrowdBodies(['casual', 'elder', 'casual', 'sport']);
  assert.ok(!requests.slice(start).some((url) => /\/crowd-[ab]\//.test(url)), 'no office download when its kind is absent');
  assert.equal(crowdBody('casual', 12).approvedCrowd, 'casual-1');
  assert.equal(crowdBody('elder', 7).approvedCrowd, 'older-1');
  assert.equal(crowdBody('sport', 0).approvedCrowd, 'casual-1', 'the joggers wear the casual body');
  await prepareApprovedCrowd();
  for (const [base, body] of [['shirt', 'a'], ['cardigan', 'b'], ['polo', 'older-1']])
    assert.equal(generic(base, 75).approvedCrowd, body, 'the seated residents wear the selected bodies');
  for (const [seed, expected] of [[0, 'a'], [1, 'b'], [2, 'a'], [5, 'b'], [-2, 'a'], [-3, 'b']])
    assert.equal(approvedCrowd(seed).approvedCrowd, expected);
  assert.ok(approvedCrowd(0.5) === null, 'fractional indices keep the original unavailable result');
  assert.ok(generic('casual', 0) === null, 'a crowd kind is not a legacy generic base');
  const count = requests.length;
  await prepareCrowdBodies(['office', 'elder']);
  assert.equal(requests.length, count);
  assert.throws(() => prepareApprovedCrowd(['service-2']), /Unselected crowd model/);
});

test('actor variants share source assets while owning skeletons, materials and tint uniforms', () => {
  const first = crowdBody('casual', 8), second = crowdBody('casual', 9);
  assert.notEqual(first.model.getObjectByName('Head'), second.model.getObjectByName('Head'));
  const meshes = (rig) => { const result = []; rig.model.traverse((m) => m.isMesh && result.push(m)); return result; };
  const a = meshes(first)[0], b = meshes(second)[0];
  assert.equal(a.geometry, b.geometry);
  assert.equal(a.material.map, b.material.map);
  assert.notEqual(a.material, b.material);
  assert.notEqual(a.material.userData.tint, b.material.userData.tint);
  assert.equal(first.hairHex, variant(first.base, 8).hair || regions.hair.hex);
  const saved = b.material.userData.tint.tTop.value.clone();
  a.material.userData.tint.tTop.value.set(9, 9, 9, 9);
  assert.ok(b.material.userData.tint.tTop.value.equals(saved));
});

test('tint composition preserves the native map shader and leaves unmarked regions unchanged', () => {
  const rig = approvedCrowd('service-1', { tint: { top: '#6486a1' } });
  let material;
  rig.model.traverse((mesh) => { if (mesh.isMesh) material = mesh.material; });
  const shader = { uniforms: {}, fragmentShader: '#include <map_fragment>' };
  material.onBeforeCompile(shader);
  assert.match(shader.fragmentShader, /mix\(vec3\(l\), texel.rgb, 0.82\)/, 'native colour grading remains');
  assert.match(shader.fragmentShader, /mix\( texel.rgb,.*tm.g \)/, 'only the marked top region is mixed');
  assert.equal(shader.uniforms.tHair.value.w, 0);
  assert.equal(shader.uniforms.tBot.value.w, 0);
  const absent = tintUniforms({ mask: new THREE.Texture(), regions: {} }, { hair: '#ffffff' });
  assert.equal(absent.tHair.value.w, 0, 'missing regions are never globally tinted');
  const legacy = { uniforms: {}, fragmentShader: 'diffuseColor *= texel;' };
  shadeTint(legacy, absent);
  assert.equal(legacy.uniforms.tMask, absent.tMask);
});

test('incomplete required assets leave the model unavailable for the caller fallback', async () => {
  const isolated = await import('../../js/crowd/approved-models.js?failed-mask');
  const warnings = [], warn = console.warn;
  const texture = THREE.TextureLoader.prototype.loadAsync;
  THREE.TextureLoader.prototype.loadAsync = async function (url) {
    if (url.endsWith('mask.webp')) throw new Error('missing mask fixture');
    return texture.call(this, url);
  };
  console.warn = (...args) => warnings.push(args);
  try {
    await isolated.prepareApprovedCrowd(['service-1']);
    assert.ok(isolated.approvedCrowd('service-1') === null);
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0][1], 'service-1');
  } finally {
    THREE.TextureLoader.prototype.loadAsync = texture;
    console.warn = warn;
  }
});


async function isolatedRoles(tag) {
  const alias = registerHooks({
    resolve(specifier, context, next) {
      if (context.parentURL?.endsWith('chibi-crowd.js?' + tag) && specifier === './crowd/approved-models.js')
        return next(new URL('./crowd/approved-models.js?' + tag, context.parentURL).href, context);
      return next(specifier, context);
    },
  });
  try { return await import('../../js/chibi-crowd.js?' + tag); }
  finally { alias.deregister(); }
}

test('train preload derives and deduplicates primaries and fallbacks from the shared table', async () => {
  const roles = await isolatedRoles('train-preload');
  assert.ok(roles.roleBody('reader') === null);
  assert.equal(roles.EVERYDAY_ROLES, (await import('../../js/crowd/roles.js')).EVERYDAY_ROLES);
  const start = requests.length;
  await Promise.all([roles.preparePlacePeople('train'), roles.preparePlacePeople('train')]);
  const loaded = requests.slice(start);
  // the skins come from perf/skin-tex.js, whose cache outlives this fresh loader: the four skins were fetched earlier
  assert.equal(loaded.length, 20, 'two masked primary sets and two native fallback sets, skins already cached');
  assert.equal(new Set(loaded).size, 20, 'shared B fallback/bun and concurrent preparation reuse downloads');
  assert.deepEqual([...new Set(loaded.map((url) => new URL(url).pathname.split('/').at(-2)))].sort(),
    ['crowd-a', 'crowd-b', 'crowd-casual-1', 'crowd-older-1']);
  assert.equal(roles.roleBody('reader').approvedCrowd, 'older-1');
  assert.equal(roles.roleBody('music').approvedCrowd, 'casual-1');
  assert.equal(roles.roleBody('bun').approvedCrowd, 'b');
  assert.ok(roles.roleBody('unknown-role') === null);
  await roles.preparePlacePeople('train');
  assert.equal(requests.length, start + 20);
});

test('role factory preserves person identity and supports proxies, height and tint with chibi off', () => {
  const marker = { prop: 'reader book' }, into = { marker, unrelatedState: 7 };
  const rig = roleBody('reader', 4, { into, proxy: true, height: 1.25, tint: { top: '#4a4f5c' } });
  assert.ok(rig === into);
  assert.equal(rig.marker, marker);
  assert.equal(rig.unrelatedState, 7);
  assert.equal(rig.approvedCrowd, 'older-1');
  assert.equal(rig.role, 'reader');
  assert.ok(rig.bridge && rig.torso && rig.headK && rig.arms.length === 2);
  assert.equal(typeof rig.sitHere, 'function');
  const regular = roleBody('reader');
  const heightRatio = rig.model.getWorldScale(new THREE.Vector3()).y / regular.model.getWorldScale(new THREE.Vector3()).y;
  assert.ok(Math.abs(heightRatio - 1.25 / 1.09) < 1e-10, 'height applies through the native holder transform');
  let material;
  rig.model.traverse((mesh) => { if (mesh.isMesh) material = mesh.material; });
  assert.equal(material.userData.tint.tTop.value.w, regions.top.lum);
  assert.equal(material.userData.tint.tHair.value.w, 0);
  const before = rig.model.getObjectByName('RightArm').quaternion.clone();
  rig.arms[0].rotation.set(-0.8, 0, 0.25);
  rig.update(0);
  assert.ok(!rig.model.getObjectByName('RightArm').quaternion.equals(before), 'proxy drives the original rig arm');
  assert.ok(rig.model.getObjectByName('RightHand').matrixWorld.elements.every(Number.isFinite));
});

test('failed train primaries retain prepared A/B fallbacks and proxy/into behavior', async () => {
  const roles = await isolatedRoles('train-failed-primary');
  const texture = THREE.TextureLoader.prototype.loadAsync, warn = console.warn, warnings = [];
  THREE.TextureLoader.prototype.loadAsync = async function (url) {
    if (url.endsWith('mask.webp')) throw new Error('missing primary mask fixture');
    return texture.call(this, url);
  };
  console.warn = (...args) => warnings.push(args);
  try {
    await roles.preparePlacePeople('train');
    assert.deepEqual(warnings.map((row) => row[1]).sort(), ['casual-1', 'older-1']);
    for (const [role, expected] of [['reader', 'a'], ['music', 'b'], ['bun', 'b']]) {
      const into = { trainReference: role };
      const rig = roles.roleBody(role, 2, { into, proxy: true, height: 1.2, tint: { top: '#123456' } });
      assert.ok(rig === into);
      assert.equal(rig.trainReference, role);
      assert.equal(rig.approvedCrowd, expected);
      assert.ok(rig.bridge && rig.arms.length === 2);
      rig.update(1 / 30);
      assert.ok(rig.model.getObjectByName('LeftHand').matrixWorld.elements.every(Number.isFinite));
    }
  } finally {
    THREE.TextureLoader.prototype.loadAsync = texture;
    console.warn = warn;
  }
});

for (const [width, size] of [[1366, 1024], [390, 512]]) {
  test(`train adapter keeps roles, props and ${size}px skins at viewport ${width}`, async () => {
    const saved = { document: globalThis.document, window: globalThis.window, addEventListener: globalThis.addEventListener, localStorage: globalThis.localStorage, innerWidth: globalThis.innerWidth, innerHeight: globalThis.innerHeight };
    const drawn = [];
    globalThis.window = {};
    globalThis.addEventListener = () => {};
    globalThis.localStorage = { getItem: () => JSON.stringify({ v: 2, privateMode: false }) };
    globalThis.innerWidth = width;
    globalThis.innerHeight = 844;
    globalThis.document = {
      body: { classList: { contains: () => width < 600, toggle: () => {} } },
      documentElement: { style: { setProperty: () => {} } },
      createElement: (tag) => {
        assert.equal(tag, 'canvas');
        return { getContext: () => ({ drawImage: (...args) => drawn.push(args) }) };
      },
    };
    try {
      const { prepareTrainPassengers, chibiPassengers } = await import(`../../js/chibi-passengers.js?train-${width}`);
      await prepareTrainPassengers();
      const firstMap = (rig) => {
        let map;
        rig.model.traverse((mesh) => { if (mesh.isMesh && mesh.material.map) map ||= mesh.material.map; });
        return map;
      };
      for (const body of ['older-1', 'casual-1', 'b'])
        firstMap(approvedCrowd(body)).image = { width: 2048, height: 2048 };
      const { buildPassengers } = await import('../../js/train/people.js');
      const list = buildPassengers(1.7, 0.4);
      const people = { reader: list[2], music: list[3], bun: list[5] };
      const parent = new THREE.Group();
      const before = new Map();
      for (const [id, person] of Object.entries(people)) {
        parent.add(person.root);
        before.set(id, {
          person, act: person.act, root: person.root, x: person.root.position.x, z: person.root.position.z,
          props: person.torso.children.filter((o) => o.isGroup && o !== person.head && !person.arms.includes(o)),
          cans: person.headK.children.filter((o) => o.isMesh && /Cylinder|Torus/.test(o.geometry.type)),
        });
      }
      chibiPassengers(people);
      for (const [id, body] of [['reader', 'older-1'], ['music', 'casual-1'], ['bun', 'b']]) {
        const person = people[id], old = before.get(id), map = firstMap(person);
        assert.ok(person === old.person);
        assert.equal(person.act, old.act);
        assert.equal(person.approvedCrowd, body);
        assert.equal(person.role, id);
        assert.equal(person.seated, true);
        assert.equal(person.root.parent, parent);
        assert.ok(old.root.parent === null);
        assert.equal(person.root.position.x, old.x);
        assert.equal(person.root.position.z, old.z);
        for (const prop of old.props) assert.equal(prop.parent, person.torso);
        for (const can of old.cans) assert.equal(can.parent, person.headK);
        assert.equal(map.image.width, size);
        assert.equal(map.image.height, size);
        assert.notEqual(map, firstMap(approvedCrowd(body)));
        assert.equal(firstMap(approvedCrowd(body)).image.width, 2048, 'other places retain their source skin');
        person.update(1 / 30);
        assert.ok(person.model.getObjectByName('RightHand').matrixWorld.elements.every(Number.isFinite));
      }
      assert.equal(drawn.length, 3, 'one smaller texture per rendered body');
      chibiPassengers(people);
      assert.equal(drawn.length, 3, 'repeat conversion is a no-op');
    } finally {
      Object.assign(globalThis, saved);
    }
  });
}
