// One light rig per place, driven by the period (notes/lighting-system.md). The rig owns the place's sky light,
// sun and fill, its night glows (kit/light/glow.js) and its period state; apply(period, day) sets all of them from
// the period table (kit/light/looks.js), forward or back, and returns the colour grade for the post chain.
//
//   const rig = lightRig(scene, { looks: OUTDOOR, shadow: { box: 12 } });
//   rig.glow.add(...lamps.glows, ...station.glows);          what lights up at night
//   place.light = rig;                                        lifecycle and the clock call lightPlace()
//   rig.listen((s) => sky.set(s));                            a sky or fog layer follows the period
//
// spec: looks (a set from looks.js), period (the one it is built in, default morning), grade ({ day, dusk } patches on the look's grade for this place), phaseOf (period, day) ->
// phase (a place's own rule), shadow ({ size, box, near, far, bias, normalBias, radius } or false), sunDist,
// fill ([x, y, z] of the fill light, or false for none). rig.before, if a place sets it, is called before each
// change (what caches the old light, like the lift's dimmer).
import * as THREE from 'three';
import { phaseOf as defaultPhase, lookFor } from './looks.js';
import { glowSet } from './glow.js';

const SHADOW = { size: 2048, box: 12, near: 5, far: 70, bias: -0.0006, normalBias: 0.03, radius: 4 };

export function lightRig(scene, spec) {
  const { phaseOf = defaultPhase, sunDist = 30 } = spec;
  const grades = { ...spec.grade };
  let looks = spec.looks;
  const first = looks.day;
  const hemi = new THREE.HemisphereLight(first.hemi[0], first.hemi[1], first.hemi[2]);
  const sun = new THREE.DirectionalLight(first.sun[0], first.sun[1]);
  if (spec.shadow !== false) {
    const S = { ...SHADOW, ...spec.shadow };
    sun.castShadow = true;
    sun.shadow.mapSize.set(S.size, S.size);
    Object.assign(sun.shadow.camera, {
      left: -S.box,
      right: S.box,
      top: S.box,
      bottom: -S.box,
      near: S.near,
      far: S.far,
    });
    Object.assign(sun.shadow, { bias: S.bias, normalBias: S.normalBias, radius: S.radius });
  }
  scene.add(hemi, sun, sun.target);
  let fill = null;
  if (spec.fill !== false && first.fill) {
    fill = new THREE.DirectionalLight(first.fill[0], first.fill[1]);
    fill.position.set(...(spec.fill || [0.3, 1, 0.9]));
    scene.add(fill);
  }
  const glow = glowSet(),
    listeners = new Set(),
    dir = new THREE.Vector3();
  const rig = {
    hemi,
    sun,
    fill,
    glow,
    state: null,
    before: null,
    grades, // this place's own grade patches per phase
    // the sun's direction now (toward the sun): for a shadow box that follows Eric (town.js sunFollow)
    sunDir: dir,
    apply(period, day = 1) {
      const phase = phaseOf(period, day);
      const L = lookFor(looks, phase, day, period);
      rig.before?.(period, phase);
      hemi.color.set(L.hemi[0]);
      hemi.groundColor.set(L.hemi[1]);
      hemi.intensity = L.hemi[2];
      sun.color.set(L.sun[0]);
      sun.intensity = L.sun[1];
      dir.set(...L.sun[2]).normalize();
      rig.placeSun();
      if (fill && L.fill) {
        fill.color.set(L.fill[0]);
        fill.intensity = L.fill[1];
      }
      if (L.bg && scene.background?.isColor) scene.background.set(L.bg);
      glow.set(!!L.glow, L);
      const g = { ...L.grade, ...grades[phase] };
      rig.state = {
        period,
        phase,
        day,
        sun: { dir: dir.toArray(), color: L.sun[0], intensity: L.sun[1] },
        glow: !!L.glow,
        grade: g,
        sky: L.sky || null, // outdoors: the sky behind (look/sky.js follows it)
      };
      for (const fn of listeners) fn(rig.state);
      return g;
    },
    // the sun stands sunDist out along its direction from where it aims (its target may follow Eric)
    placeSun() {
      sun.position.copy(sun.target.position).addScaledVector(dir, sunDist);
    },
    // the lights as they stand now become this place's look for a phase (a trial that dresses the light by hand,
    // scenes/diorama/), so going back to that phase gives the same picture
    takeLook(phase) {
      const hex = (c) => '#' + c.getHexString();
      const at = sun.position.clone().sub(sun.target.position);
      looks = {
        ...looks,
        [phase]: {
          ...looks[phase],
          hemi: [hex(hemi.color), hex(hemi.groundColor), hemi.intensity],
          sun: [hex(sun.color), sun.intensity, at.normalize().toArray()],
        },
      };
    },
    // fn(state) on every change, and now if the rig has a period already; returns the way to stop
    listen(fn) {
      listeners.add(fn);
      if (rig.state) fn(rig.state);
      return () => listeners.delete(fn);
    },
  };
  rig.apply(spec.period || 'morning');
  return rig;
}

// a place's light for a period: its rig sets everything and its grade becomes the place's (the post chain reads
// place.grade). A place without a rig keeps its own onPeriod (not yet moved; notes/lighting-system.md).
export function lightPlace(place, period, day) {
  if (!place?.light) return false;
  place.grade = place.light.apply(period, day);
  return true;
}
