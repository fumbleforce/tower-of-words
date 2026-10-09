// The lighting and time-of-day system (game3d/js/kit/light/, notes/lighting-system.md): every period has a phase and
// a look, a rig sets a place's lights from it, glows switch both ways, and going forward then back gives exactly the
// light the place was built with.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three')
      return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
    return next(specifier, context);
  },
});
process.on('exit', () => hooks.deregister());

const THREE = await import('../../vendor/three/three.module.js');
const { PHASE, phaseOf, lookFor, OUTDOOR, DORM, EVENING_GRADE_2, SKY } = await import('../../js/kit/light/looks.js');
const { glowSet } = await import('../../js/kit/light/glow.js');
const { lightRig, lightPlace } = await import('../../js/kit/light/rig.js');

// the periods the day clock has (sim.js PERIODS), read from its source so the table can't fall behind it
const simSource = fs.readFileSync(new URL('../../js/sim.js', import.meta.url), 'utf8');
const PERIODS = JSON.parse(simSource.match(/export const PERIODS = (\[[^\]]*\])/)[1].replace(/'/g, '"'));

// everything a rig sets, as plain values, to compare two moments
function snapshot(rig, scene, extra = []) {
  const c = (col) => col.getHexString();
  return JSON.stringify({
    hemi: [c(rig.hemi.color), c(rig.hemi.groundColor), rig.hemi.intensity],
    sun: [c(rig.sun.color), rig.sun.intensity, rig.sun.position.toArray().map((v) => +v.toFixed(5))],
    fill: rig.fill && [c(rig.fill.color), rig.fill.intensity],
    bg: scene.background?.isColor ? c(scene.background) : null,
    extra: extra.map((m) =>
      m.isMesh
        ? { visible: m.visible, k: m.userData.k, gain: m.userData.gain }
        : [c(m.color), c(m.emissive), m.emissiveIntensity],
    ),
  });
}

function poolMesh(k = 0.16) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial());
  Object.assign(mesh.userData, { k, gain: 1 });
  mesh.userData.set = (kk) => {
    mesh.userData.k = kk;
    mesh.material.color.setScalar(kk * mesh.userData.gain);
  };
  return mesh;
}

test('every period of the day clock has a phase and every look set covers it', () => {
  for (const p of PERIODS) {
    assert.ok(PHASE[p], `period ${p} has no phase`);
    for (const looks of [OUTDOOR, DORM]) assert.ok(looks[phaseOf(p)], `no ${phaseOf(p)} look`);
  }
  assert.equal(phaseOf('evening'), 'dusk');
  assert.equal(phaseOf('early'), 'day');
});

test("a later day's own values sit on top of the phase's look", () => {
  assert.equal(lookFor(OUTDOOR, 'dusk', 2).grade, EVENING_GRADE_2);
  assert.equal(lookFor(OUTDOOR, 'dusk', 2).pool, 2);
  assert.equal(lookFor(OUTDOOR, 'dusk', 1).pool, 1);
  assert.equal(lookFor(OUTDOOR, 'dusk', 7).pool, 1); // no values of its own: the first day's
});

test('glows switch on at night and back to exactly their built values by day', () => {
  const lamp = new THREE.MeshStandardMaterial({ color: '#f4ede2', emissive: '#ffd9a0', emissiveIntensity: 0.35 });
  const shared = new THREE.MeshStandardMaterial({ color: '#8c9dad' });
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), lamp);
  pane.visible = false;
  const pool = poolMesh();
  let custom = null;
  const g = glowSet().add(
    [{ mat: lamp, night: { emissiveIntensity: 2.6, color: '#fff3dc' } }, { show: pane }, { pool, night: 0.42 }],
    { mat: shared, night: { emissive: '#ffc98a', emissiveIntensity: 0.45 } },
    { mat: shared, night: { color: '#c9b596' } }, // the same material from another builder
    null,
    { set: (night, look) => (custom = [night, look.pool]) },
  );
  const before = [lamp.color.getHex(), lamp.emissiveIntensity, shared.color.getHex(), shared.emissive.getHex()];
  g.set(true, { pool: 2 });
  assert.equal(lamp.emissiveIntensity, 2.6);
  assert.equal(shared.emissiveIntensity, 0.45);
  assert.equal('#' + shared.color.getHexString(), '#c9b596');
  assert.equal(pane.visible, true);
  assert.deepEqual([pool.userData.k, pool.userData.gain], [0.42, 2]);
  assert.deepEqual(custom, [true, 2]);
  g.set(false);
  assert.deepEqual(
    [lamp.color.getHex(), lamp.emissiveIntensity, shared.color.getHex(), shared.emissive.getHex()],
    before,
  );
  assert.equal(pane.visible, false);
  assert.deepEqual([pool.userData.k, pool.userData.gain], [0.16, 1]);
  assert.deepEqual(custom, [false, undefined]);
});

test('a rig stepped forward and back through the day gives the same light each time', () => {
  for (const day of [1, 2]) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#5d636c');
    const rig = lightRig(scene, { looks: OUTDOOR });
    const lamp = new THREE.MeshStandardMaterial({ emissiveIntensity: 0.35 }),
      pool = poolMesh();
    rig.glow.add({ mat: lamp, night: { emissiveIntensity: 2.6 } }, { pool, night: 0.42 });
    const seen = {};
    const order = [...PERIODS, ...[...PERIODS].reverse(), ...PERIODS];
    for (const p of order) {
      const grade = rig.apply(p, day);
      const now = snapshot(rig, scene, [lamp, pool]) + JSON.stringify(grade);
      if (seen[p]) assert.equal(now, seen[p], `day ${day}, ${p} differs on the way back`);
      seen[p] = now;
    }
    assert.notEqual(seen.morning, seen.evening);
    assert.equal(seen.morning, seen.afternoon); // one daytime look until the clock has more phases
  }
});

test('a rig builds the sun, shadow and fill a place asks for, and tells listeners the period', () => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000000');
  const rig = lightRig(scene, {
    looks: DORM,
    period: 'evening',
    phaseOf: (period, day) => (day > 1 ? phaseOf(period) : 'dusk'),
    shadow: { size: 1024, box: 4, far: 40 },
    sunDist: 20,
    fill: false,
  });
  assert.equal(rig.fill, null);
  assert.equal(rig.sun.shadow.mapSize.x, 1024);
  assert.equal(rig.sun.shadow.camera.right, 4);
  assert.equal(scene.background.getHexString(), DORM.dusk.bg.slice(1));
  assert.ok(Math.abs(rig.sun.position.length() - 20) < 1e-9);
  const heard = [];
  const stop = rig.listen((s) => heard.push([s.period, s.phase, s.sun.color]));
  assert.deepEqual(heard[0], ['evening', 'dusk', DORM.dusk.sun[0]]); // told the current state at once
  const place = { light: rig };
  assert.equal(lightPlace(place, 'morning', 1), true);
  assert.equal(place.grade.exposure, DORM.dusk.grade.exposure); // day 1: dusk whatever the clock says
  lightPlace(place, 'morning', 2);
  assert.equal(place.grade.exposure, DORM.day.grade.exposure);
  assert.equal(scene.background.getHexString(), DORM.day.bg.slice(1));
  stop();
  lightPlace(place, 'evening', 2);
  assert.equal(heard.length, 3);
  assert.equal(lightPlace({}, 'morning', 1), false); // a place without a rig lights itself
});

test("a place's grade patch and a hand-dressed daylight stay through period changes", () => {
  const scene = new THREE.Scene();
  const rig = lightRig(scene, { looks: OUTDOOR });
  rig.grades.day = { exposure: 1.5 };
  rig.hemi.color.set('#c8dcf0');
  rig.sun.intensity = 2.9;
  rig.sun.position.set(-18, 24, 12);
  rig.takeLook('day');
  const first = snapshot(rig, scene);
  assert.equal(rig.apply('evening').exposure, OUTDOOR.dusk.grade.exposure);
  assert.equal(rig.apply('morning').exposure, 1.5);
  assert.equal(snapshot(rig, scene).replace(/"sun":\[[^\]]*\]/, ''), first.replace(/"sun":\[[^\]]*\]/, ''));
  assert.equal(rig.sun.intensity, 2.9);
});

test('the outdoor sky comes from the period table: the early sky, the day sky and the dusk sky, through the rig', () => {
  assert.equal(lookFor(OUTDOOR, phaseOf('early'), 1, 'early').sky, SKY.early);
  for (const p of ['morning', 'lunch', 'afternoon']) assert.equal(lookFor(OUTDOOR, phaseOf(p), 1, p).sky, SKY.day);
  assert.equal(lookFor(OUTDOOR, 'dusk', 2, 'evening').sky, SKY.dusk);
  const scene = new THREE.Scene(),
    rig = lightRig(scene, { looks: OUTDOOR });
  const seen = [];
  rig.listen((s) => seen.push(s.sky));
  for (const p of ['early', 'evening', 'morning']) rig.apply(p);
  assert.deepEqual(seen, [SKY.day, SKY.early, SKY.dusk, SKY.day]);
});
