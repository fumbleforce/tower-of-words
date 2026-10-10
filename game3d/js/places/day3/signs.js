// The small notes and cards day 3's looks read out (story/day3/README.md, "Small props and access"), each on the thing
// whose look reads it: a card in the shop's window or door, a note on a table or a board. Made the first time the
// day sets the place up; nothing else changes in those places.
import * as THREE from 'three';
import { textTexture } from '../../props.js';

// place: thing -> { y: height of the card's middle, w, h, lines: the card's printed words (a few, for the look of
// it), paper colour, ink colour, flat: lying on the thing's top, out: a step off the thing toward the player }
const SIGNS = {
  east_lane: {
    liquor_shop: { y: 1.15, w: 0.34, h: 0.24, lines: ['RICE', 'delivered', 'to the dorms'], paper: '#f4ecd6' },
    barber: { y: 1.2, w: 0.22, h: 0.16, lines: ['Glasses off,', 'please'], paper: '#f2f2ee' },
  },
  shotengai: {
    bakery: { y: 1.1, w: 0.26, h: 0.18, lines: ['Dorm orders', 'to the', 'manager'], paper: '#f6efe1' },
    bike_shop: { y: 1.0, w: 0.24, h: 0.17, lines: ['BACK TYRE', 'ONLY'], paper: '#eef3f6' },
  },
  dorm_commons: {
    art_table: {
      flat: true,
      y: 0.02,
      w: 0.24,
      h: 0.17,
      lines: ['Art club', 'Tue evening', 'brushes here'],
      paper: '#fbf6e6',
    },
    commons_board: { y: 1.25, w: 0.2, h: 0.15, lines: ['Wash', 'your mug'], paper: '#f2d9d0' },
  },
  karaoke: {
    karaoke_desk: {
      flat: true,
      y: 0.02,
      w: 0.22,
      h: 0.15,
      lines: ['Karaoke club', 'Wed · upstairs', 'listeners OK'],
      paper: '#e9eef8',
    },
  },
  karaoke_booth: {
    song_terminal: {
      flat: true,
      y: 0.03,
      w: 0.06,
      h: 0.16,
      lines: [''],
      paper: '#d64a5a',
      ink: '#fff',
    },
  },
};
const made = new WeakSet();

function card({ w, h, lines, paper, ink = '#2a2d33' }) {
  const tex = textTexture(
    (g, W, H) => {
      g.fillStyle = paper;
      g.fillRect(0, 0, W, H);
      g.fillStyle = ink;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const n = lines.length;
      lines.forEach((l, i) => {
        g.font = `${i === 0 ? 'bold ' : ''}${Math.round(H / (n + 1.4))}px sans-serif`;
        g.fillText(l, W / 2, (H * (i + 0.85)) / (n + 0.7));
      });
    },
    256,
    Math.round((256 * h) / w),
  );
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide }),
  );
  m.userData.noBatch = true;
  return m;
}

export function placeSigns(P, name) {
  const list = SIGNS[name];
  if (!list || made.has(P)) return;
  made.add(P);
  for (const [id, s] of Object.entries(list)) {
    const t = P.things[id];
    const f = t?.face?.(),
      sp = t?.spot?.();
    if (!f || !sp) continue;
    const d = [sp[0] - f[0], sp[1] - f[1]],
      L = Math.hypot(...d) || 1,
      n = [d[0] / L, d[1] / L];
    const m = card(s);
    const v = t.anchor ? t.anchor(new THREE.Vector3()) : null;
    if (v) P.space.worldToLocal(v);
    const yaw = Math.atan2(n[0], n[1]);
    if (s.flat) {
      // on the thing's top: the pin's point, lowered to the surface
      const top = v ? v.y - 0.35 + s.y : 0.75;
      m.rotation.set(-Math.PI / 2, 0, yaw);
      m.position.set(f[0] + n[0] * 0.12, top, f[1] + n[1] * 0.12);
    } else {
      m.rotation.y = yaw;
      m.position.set(f[0] + n[0] * 0.04, s.y, f[1] + n[1] * 0.04);
    }
    P.space.add(m);
  }
}
