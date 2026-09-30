// The woman with the bun's shopping bag, back from the mainland and overfull: a canvas tote whose two zip flaps won't
// meet over what's inside (a boxed something, a coral jumper, a blue parcel). One mesh and one draw: the shut state
// (flaps down and together, the contents pushed in) and the slider's run along the zip are morph targets, so
// setClosed(k) and setSlider(k) move it anywhere in between (train/discoveries.js `shopBag`).
import * as THREE from 'three';
import { box, merge } from './kit.js';

const W = 0.34,
  H = 0.24,
  D = 0.18;
const CANVAS = '#9db7c9',
  DEEP = '#4a6479',
  TEETH = '#1f2733',
  METAL = '#cfd4db';

function build(close, slide) {
  const sink = -0.08 * close;
  const parts = [
    box(W, H, D, { bevel: 0.03, color: CANVAS }),
    box(0.12, 0.11, 0.1, { bevel: 0.01, color: '#ece5d3' })
      .rot(0, 0.2, 0.12)
      .move(-0.07, H - 0.035 + sink, -0.01),
    box(0.11, 0.07, 0.1, { bevel: 0.025, color: '#e07a6a' })
      .rot(0.1, -0.3, -0.15)
      .move(0.055, H - 0.015 + sink, 0.015),
    box(0.07, 0.085, 0.06, { bevel: 0.01, color: '#9cc3e6' })
      .rot(0, 0.5, 0.25)
      .move(0.115, H - 0.03 + sink, -0.035),
  ];
  // the flaps, hinged on the long rims: leaning out when open, flat and meeting over the middle when shut; each
  // carries its half of the zip along its free edge and a handle lying on it
  for (const s of [-1, 1]) {
    const flap = merge(
      box(W - 0.02, 0.012, D / 2 - 0.004, { color: CANVAS }).move(0, 0, (-s * D) / 4),
      box(W - 0.05, 0.006, 0.012, { color: TEETH }).move(0, 0.008, -s * (D / 2 - 0.01)),
      box(0.13, 0.008, 0.016, { color: DEEP }).move(0, 0.012, (-s * D) / 5),
    );
    flap.rot(s * 1.9 * (1 - close), 0, 0).move(0, H, (s * D) / 2);
    parts.push(flap);
  }
  // the slider, from one end of the zip to the other
  parts.push(
    merge(
      box(0.03, 0.014, 0.026, { color: METAL }),
      box(0.012, 0.005, 0.034, { color: METAL }).move(-0.02, 0.006, 0),
    ).move(-W / 2 + 0.035 + slide * (W - 0.07), H + 0.008, 0),
  );
  return merge(...parts).build();
}

export function shopBag() {
  const base = build(0, 0),
    shut = build(1, 0),
    slid = build(0, 1);
  base.morphAttributes.position = [shut.attributes.position, slid.attributes.position];
  base.morphAttributes.normal = [shut.attributes.normal, slid.attributes.normal];
  const m = new THREE.Mesh(base, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
  m.name = 'train:shopping-bag';
  m.castShadow = true;
  m.receiveShadow = true;
  m.morphTargetInfluences = [0, 0];
  m.setClosed = (k) => {
    m.morphTargetInfluences[0] = k;
  };
  m.setSlider = (k) => {
    m.morphTargetInfluences[1] = k;
  };
  Object.defineProperty(m, 'slider', { get: () => m.morphTargetInfluences[1] });
  return m;
}
