// The station's west-wall lockers and notice display, shared by the room and forecourt cutaway.
import * as THREE from 'three';
import { rbox, textTexture, plane, JP_FONT } from '../props.js';
import { Parts } from './outdoor/parts.js';

export const LOCKERS = { x: -4.4, z: -4.46, w: 1.6, d: 0.5, h: 0.96 };
export const LOCKER_BOUNDS = [LOCKERS.x - LOCKERS.w / 2, LOCKERS.x + LOCKERS.w / 2, LOCKERS.z, LOCKERS.z + LOCKERS.d];

function lockerLabels() {
  return textTexture(
    (c, w, h) => {
      c.clearRect(0, 0, w, h);
      for (let row = 0; row < 2; row++)
        for (let col = 0; col < 4; col++) {
          const x = (col * w) / 4,
            y = (row * h) / 2;
          c.fillStyle = '#40596a';
          c.fillRect(x + 12, y + 12, 44, 26);
          c.fillStyle = '#eff2f1';
          c.font = '600 19px sans-serif';
          c.fillText(String(row * 4 + col + 1).padStart(2, '0'), x + 22, y + 32);
          c.fillStyle = '#596570';
          c.fillRect(x + 90, y + 44, 22, 56);
          c.fillStyle = '#1d2833';
          c.fillRect(x + 98, y + 50, 3, 17);
          c.beginPath();
          c.arc(x + 101, y + 84, 6, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = '#b9c3c8';
          c.fillRect(x + 100, y + 81, 2, 7);
        }
    },
    512,
    256,
  );
}

export function stationFitout() {
  const group = new THREE.Group();
  group.name = 'station:lockers';
  const p = new Parts();
  const { x, z, w, d, h } = LOCKERS;
  p.box('#626f7a', w, h - 0.04, d, x, 0.04, z + d / 2);
  p.box('#414c55', w - 0.1, 0.06, d - 0.08, x, 0, z + d / 2);
  p.box('#bec7cb', w + 0.02, 0.025, d + 0.01, x, h, z + d / 2);
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 4; col++) {
      const dx = x - w / 2 + 0.2 + col * 0.4;
      const y = 0.085 + row * 0.43;
      p.box(row ? '#c8d1d3' : '#adbcc3', 0.378, 0.409, 0.035, dx, y, z + d - 0.012);
      p.box('#5c6972', 0.018, 0.105, 0.035, dx + 0.136, y + 0.1, z + d + 0.01);
    }
  // Cabinet uprights support the display when the north wall fades in the forecourt view.
  for (const dx of [-0.43, 0.43]) p.box('#626f7a', 0.045, 0.14, 0.05, x + dx, h, z + 0.06);
  p.build(group);
  const labels = plane(w, 0.86, lockerLabels());
  labels.material.transparent = true;
  labels.material.alphaTest = 0.1;
  labels.position.set(x, 0.51, z + d + 0.006);
  group.add(labels);
  const screen = noticeScreen();
  screen.position.set(x, 1.04, z + 0.06);
  group.add(screen);
  return { group, screen };
}

function noticeScreen() {
  const notices = [
    ['本日のお知らせ', 'Fire drill: Thursday 14:00'],
    ['本日のお知らせ', 'Canteen: curry day'],
    ['本日のお知らせ', 'Welcome, new staff!'],
  ];
  const texs = notices.map(([a, b]) =>
    textTexture(
      (g, W, H) => {
        const gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, '#24405e');
        gr.addColorStop(1, '#172536');
        g.fillStyle = gr;
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#9fc4e8';
        g.font = '700 34px ' + JP_FONT;
        g.fillText(a, 28, 56);
        g.fillStyle = '#eef3f8';
        g.font = '600 38px ' + JP_FONT;
        g.fillText(b, 28, 150);
        g.fillStyle = '#5d86ad';
        g.fillRect(28, 190, W - 56, 6);
      },
      512,
      280,
    ),
  );
  const grp = new THREE.Group();
  grp.add(rbox(1.2, 0.72, 0.05, '#23262c', { r: 0.02, cast: false }));
  const m = new THREE.MeshStandardMaterial({
    map: texs[0],
    emissive: new THREE.Color('#ffffff'),
    emissiveMap: texs[0],
    emissiveIntensity: 0.8,
    roughness: 0.4,
  });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.62), m);
  p.position.set(0, 0.36, 0.03);
  grp.add(p);
  let cur = 0;
  grp.userData.update = (t) => {
    const i = Math.floor(t / 5) % texs.length;
    if (i !== cur) {
      cur = i;
      m.map = texs[i];
      m.emissiveMap = texs[i];
      m.needsUpdate = true;
    }
  };
  return grp;
}
