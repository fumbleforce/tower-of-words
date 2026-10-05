// The small machines the club places' tickets are about, shared by the rooms that have them (rooms/gym.js, the
// common room, the karaoke booth), each laid into a dorms/kit.js Kit standing on a surface at y, its front facing
// `ry` (0 = toward +z, the camera's side). Each returns the point its marker hangs over ([x, y, z]).
//
//   terminal(kit, x, y, z, ry)      a booking terminal: a screen on a short neck, a keypad and a card slot in front
//   printer(kit, x, y, z, ry)       a desktop laser printer: paper tray out at the front, a sheet in the out tray
//   deskFan(kit, x, y, z, ry)       an old desk fan: round base, neck, a caged head with its blades, a lever on the base
//   songTerminal(kit, x, y, z, ry)  a karaoke selector: a tablet in a docking cradle, a stylus on a cord
//   pinboard(kit, x, y, z, ry, w, h, colours)   a cork board in a frame, papers pinned on it
import * as THREE from 'three';

const DARK = '#2e323a',
  SCREEN = '#9cc3e8',
  CASE = '#d9dad6',
  GREY = '#8b919b';
// a box in the machine's own frame (u across its front, v toward its front, y up), turned by ry about (x, z)
function local(kit, x, z, ry) {
  const c = Math.cos(ry),
    s = Math.sin(ry);
  return (color, w, h, d, u, y, v, o = {}) =>
    kit.box(color, w, h, d, x + u * c + v * s, y, z - u * s + v * c, { ry, ...o });
}

export function terminal(kit, x, y, z, ry = 0) {
  const b = local(kit, x, z, ry);
  b(DARK, 0.22, 0.02, 0.16, 0, y, -0.04, { surf: 'plastic' });
  b(DARK, 0.04, 0.12, 0.03, 0, y + 0.02, -0.08, { surf: 'plastic' });
  b(DARK, 0.34, 0.24, 0.03, 0, y + 0.1, -0.06, { surf: 'monitor', rx: -0.12 });
  b(SCREEN, 0.3, 0.2, 0.004, 0, y + 0.12, -0.04, { rx: -0.12, opts: { emissive: SCREEN, emissiveIntensity: 0.45 } });
  b('#3a3f48', 0.2, 0.025, 0.1, 0, y, 0.1, { surf: 'keys' });
  b(GREY, 0.07, 0.03, 0.09, 0.15, y, 0.08, { surf: 'plastic' });
  return [x, y + 0.42, z];
}

export function printer(kit, x, y, z, ry = 0) {
  const b = local(kit, x, z, ry);
  b(CASE, 0.36, 0.2, 0.3, 0, y, 0, { r: 0.015, surf: 'plastic' });
  b('#c5c6c2', 0.3, 0.02, 0.04, 0, y + 0.2, -0.05, { surf: 'plastic' });
  b(DARK, 0.26, 0.012, 0.12, 0, y + 0.2, 0.02, { surf: 'plastic' });
  b('#f4f2ec', 0.21, 0.004, 0.14, 0, y + 0.212, 0.03, { surf: 'paper' });
  b('#c5c6c2', 0.26, 0.03, 0.14, 0, y + 0.03, 0.2, { surf: 'plastic' });
  b('#f4f2ec', 0.21, 0.02, 0.12, 0, y + 0.04, 0.19, { surf: 'paper' });
  b('#5fbf6f', 0.015, 0.006, 0.015, 0.13, y + 0.2, 0.12, { opts: { emissive: '#5fbf6f', emissiveIntensity: 0.8 } });
  return [x, y + 0.45, z];
}

export function deskFan(kit, x, y, z, ry = 0) {
  const b = local(kit, x, z, ry);
  const c = Math.cos(ry),
    s = Math.sin(ry);
  b('#d6d2c6', 0.18, 0.04, 0.16, 0, y, 0, { r: 0.015, surf: 'plastic' });
  b('#7c8f8a', 0.03, 0.02, 0.05, 0.06, y + 0.04, 0.04, { surf: 'plastic' }); // the starter lever
  kit.cyl('#bdb9ad', 0.016, 0.02, 0.16, x, y + 0.04, z, { seg: 8, surf: 'metal' });
  // the head: a hub, three blades, the cage as two rings
  const hx = x + 0.03 * s,
    hz = z + 0.03 * c,
    hy = y + 0.27;
  kit.add(
    '#c9c4b6',
    new THREE.CylinderGeometry(0.045, 0.05, 0.08, 10)
      .rotateX(Math.PI / 2)
      .rotateY(ry)
      .translate(hx - 0.04 * s, hy, hz - 0.04 * c),
    { surf: 'plastic' },
  );
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    kit.add(
      '#8fb3ad',
      new THREE.BoxGeometry(0.05, 0.1, 0.006).translate(0, 0.055, 0).rotateZ(a).rotateY(ry).translate(hx, hy, hz),
    );
  }
  for (const r of [0.12, 0.07])
    kit.add(GREY, new THREE.TorusGeometry(r, 0.005, 4, 18).rotateY(ry).translate(hx + 0.012 * s, hy, hz + 0.012 * c), {
      surf: 'metal',
      cast: false,
    });
  return [x, y + 0.5, z];
}

export function songTerminal(kit, x, y, z, ry = 0) {
  const b = local(kit, x, z, ry);
  b(DARK, 0.2, 0.05, 0.12, 0, y, 0, { r: 0.01, surf: 'plastic' });
  b(DARK, 0.3, 0.2, 0.025, 0, y + 0.03, -0.02, { rx: -0.45, surf: 'plastic' });
  b('#b8d9f0', 0.26, 0.16, 0.004, 0, y + 0.05, 0.0, {
    rx: -0.45,
    opts: { emissive: '#8cc4ec', emissiveIntensity: 0.6 },
  });
  b('#e04f7a', 0.012, 0.012, 0.14, 0.12, y + 0.05, 0.05, { ry: 0.3 });
  return [x, y + 0.4, z];
}

export function pinboard(kit, x, y, z, ry, w, h, colours = ['#f2f0ea', '#f6e7a8', '#cfe3f0', '#f4cfc8']) {
  const b = local(kit, x, z, ry);
  b('#6b5a46', w + 0.06, h + 0.06, 0.03, 0, y - 0.03, 0, { surf: 'paint' });
  b('#b88e5f', w, h, 0.012, 0, y, 0.018, { surf: 'card' });
  let k = 0;
  for (let u = -w / 2 + 0.16; u < w / 2 - 0.1; u += 0.27)
    for (let v = 0; v < 2; v++, k++) {
      const pw = 0.18 + ((k * 37) % 5) * 0.012,
        ph = 0.2 + ((k * 13) % 4) * 0.02;
      b(colours[k % colours.length], pw, ph, 0.004, u + ((k % 3) - 1) * 0.02, y + 0.06 + v * (h / 2), 0.027, {
        rz: ((k % 5) - 2) * 0.03,
        surf: 'paper',
      });
      b('#c9473f', 0.02, 0.02, 0.01, u, y + 0.06 + v * (h / 2) + ph - 0.03, 0.033);
    }
  return [x, y + h + 0.12, z];
}
