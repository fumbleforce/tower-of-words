// Emi's office on B2: the left part of the old copy room, behind a partition at x = EMI_X (docs/game/places.md, IT
// support; Jørgen, 2026-10-05: "her office should have some decoration not just bare walls, and a defined desk etc.").
// Her desk faces the visitor and the camera, her chair behind it, the corridor wall at her back with a backlit landscape
// panel for a window (B2 is underground) and a calendar; a guest chair across the desk on a rug; on the left wall a low
// cabinet, framed prints over a low bookcase and a tall plant; a coat stand and a filing cabinet by the partition. Room: x X0 (-7) to EMI_X, z CS to Z1 (scenes/office.js).
import * as THREE from 'three';
import {
  PAL,
  mat,
  emissive,
  rbox,
  plant,
  tileFloor,
  desk,
  officeChair,
  monitor,
  filingCabinet,
  shelf,
  textTexture,
  plane,
  JP_FONT,
} from '../props.js';
import { mug } from '../cast.js';

export const EMI_X = -4.6; // the partition's centre line
export const EMI_DOOR = [-5.45, -4.85]; // its doorway in the corridor wall
const DESK = [-6.0, 4.25];
export const EMI_SEAT = [DESK[0], DESK[1] - 0.5]; // her chair, behind the desk, facing +z (the guest and the camera)
export const EMI_TALK = [-5.15, 3.95]; // where Eric stands to talk to her: the desk's corner on the doorway side
const GUEST = [DESK[0], DESK[1] + 0.72]; // the guest chair across the desk, facing her
// for the place (places/office.js): the partition line, her seat (an office chair's top), the guest chair and where
// Eric talks to her
export const EMI = {
  x: EMI_X,
  seat: { x: EMI_SEAT[0], z: EMI_SEAT[1], top: 0.24, ry: 0 },
  guest: { x: GUEST[0], z: GUEST[1], top: 0.25, ry: Math.PI },
  talk: EMI_TALK,
};

// a framed picture: a canvas drawing in a thin frame, facing +z (turned onto a wall by the caller)
function framed(w, h, draw, { frame = '#3e434d', glow = 0 } = {}) {
  const g = new THREE.Group();
  g.add(rbox(w + 0.04, h + 0.04, 0.025, frame, { y: -h / 2 - 0.02, r: 0.006, cast: false }));
  const p = plane(w, h, textTexture(draw, 256, Math.round((256 * h) / w)), { emissiveK: glow });
  p.position.z = 0.014;
  g.add(p);
  return g;
}
const sky = (g, W, H) => {
  // a calm coast at dusk: sky, sea, a headland and a few lit windows
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#8fb3d6');
  gr.addColorStop(0.55, '#d9e2e6');
  gr.addColorStop(0.56, '#6f93ad');
  gr.addColorStop(1, '#4f7189');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#5b6b78';
  g.beginPath();
  g.moveTo(0, H * 0.56);
  g.lineTo(W * 0.22, H * 0.4);
  g.lineTo(W * 0.42, H * 0.56);
  g.fill();
  g.fillStyle = '#f3e3bf';
  for (const [x, y] of [
    [0.12, 0.5],
    [0.18, 0.47],
    [0.25, 0.5],
  ])
    g.fillRect(W * x, H * y, 4, 3);
};
const teamPhoto = (g, W, H) => {
  // five people in a row in front of a pale wall: simple shapes, the faces left plain
  g.fillStyle = '#cfd6dc';
  g.fillRect(0, 0, W, H);
  const cols = ['#3b4252', '#6a7f99', '#2f3440', '#8c5a64', '#4a6a58'];
  for (let i = 0; i < 5; i++) {
    const x = W * (0.14 + i * 0.18);
    g.fillStyle = cols[i];
    g.fillRect(x - 18, H * 0.55, 36, H * 0.45);
    g.fillStyle = '#e8cdb6';
    g.beginPath();
    g.arc(x, H * 0.42, 15, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = ['#2b2b2b', '#a8532e', '#3a3026', '#c9c5c0', '#2b2b2b'][i];
    g.fillRect(x - 15, H * 0.42 - 17, 30, 10);
  }
};
const print = (hue) => (g, W, H) => {
  // a quiet print: two soft bands and a circle
  g.fillStyle = '#ecebe6';
  g.fillRect(0, 0, W, H);
  g.fillStyle = hue;
  g.fillRect(W * 0.12, H * 0.58, W * 0.76, H * 0.12);
  g.globalAlpha = 0.6;
  g.fillRect(W * 0.12, H * 0.74, W * 0.5, H * 0.08);
  g.globalAlpha = 1;
  g.beginPath();
  g.arc(W * 0.62, H * 0.32, W * 0.14, 0, Math.PI * 2);
  g.fill();
};
const calendar = (g, W, H) => {
  g.fillStyle = '#f4f3ef';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#5a7da6';
  g.fillRect(0, 0, W, H * 0.4);
  g.fillStyle = '#f4f3ef';
  g.font = '700 54px ' + JP_FONT;
  g.textAlign = 'center';
  g.fillText('OCT', W / 2, H * 0.3);
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 7; c++) {
      g.fillStyle = c === 6 ? '#c0504d' : '#9aa0a8';
      g.fillRect(16 + c * 33, H * 0.57 + r * 22, 22, 12);
    }
  g.strokeStyle = '#c0504d';
  g.lineWidth = 4;
  g.strokeRect(16 + 3 * 33 - 4, H * 0.57 - 4, 30, 20); // a day circled
};

export function* emiOffice(root, pool, { X0, CS, Z1, T }) {
  const W0 = X0, // the left wall's room face
    W1 = EMI_X - T / 2, // the partition's room face
    N = CS + T / 2; // the corridor wall's room face
  root.add(tileFloor(X0, EMI_X, CS, Z1, 0.5, { color: '#7d8492', seam: '#717885', y: 0.006 })); // carpet tiles
  {
    const rug = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.012, 2.1), mat('#4f6378', { roughness: 0.95 }));
    rug.position.set(DESK[0] + 0.05, 0.006, DESK[1] + 0.2);
    rug.receiveShadow = true;
    root.add(rug);
  }
  yield;
  // her desk (sitter on -z: turned round), with the lamp, a mug, folders and her nameplate facing the visitor
  const d = desk({ w: 1.2, d: 0.66, seed: 4, mon: false, clutter: 0 }); // her monitor to one side, so she's seen
  d.rotation.y = Math.PI;
  d.position.set(DESK[0], 0, DESK[1]);
  root.add(d);
  const top = 0.42;
  {
    const plateTex = textTexture(
      (g, Wt, Ht) => {
        g.fillStyle = '#2f3440';
        g.fillRect(0, 0, Wt, Ht);
        g.fillStyle = '#eef0f2';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = '700 70px ' + JP_FONT;
        g.fillText('エミ', Wt / 2, Ht * 0.38);
        g.font = '700 38px ' + JP_FONT;
        g.fillText('EMI', Wt / 2, Ht * 0.8);
      },
      256,
      128,
    );
    const np = new THREE.Group();
    const back = rbox(0.24, 0.1, 0.015, '#2f3440', { r: 0.004 });
    back.rotation.x = -0.35;
    np.add(back, rbox(0.25, 0.012, 0.06, '#565c67', { r: 0.003, cast: false }));
    const face = plane(0.22, 0.09, plateTex);
    face.rotation.x = -0.35;
    face.position.set(0, 0.05, 0.026);
    np.add(face);
    np.position.set(DESK[0], top, 4.5);
    root.add(np);
  }
  {
    const mo = monitor();
    mo.position.set(-6.3, top, 4.42);
    mo.rotation.y = Math.PI - 0.42; // turned to her
    root.add(mo);
    // a paper tray with a lip and paper in it, a pen cup
    root.add(
      rbox(0.22, 0.04, 0.28, PAL.dark, { x: -5.6, y: top, z: 4.33, r: 0.006 }),
      rbox(0.19, 0.012, 0.25, PAL.paper, { x: -5.6, y: top + 0.04, z: 4.33, r: 0.003, cast: false }),
      rbox(0.07, 0.09, 0.07, '#4a5b78', { x: -5.78, y: top, z: 4.45, r: 0.02 }),
    );
  }
  {
    const m = mug('#5a7da6');
    m.position.set(-5.47, top + 0.04, 4.02);
    root.add(m);
    for (let i = 0; i < 3; i++)
      root.add(
        rbox(0.2, 0.012, 0.24, ['#5a7da6', '#c9cdd2', '#8c5a64'][i], {
          x: -5.66,
          y: top + i * 0.012,
          z: 4.04,
          r: 0.003,
          cast: false,
        }),
      );
  }
  {
    // desk lamp: a round foot, a post, an arm out over the keyboard and a lit shade hanging from it
    const l = new THREE.Group();
    l.add(
      rbox(0.11, 0.02, 0.11, PAL.charcoal, { r: 0.01 }),
      rbox(0.018, 0.24, 0.018, PAL.charcoal, { y: 0.02, r: 0.006 }),
      rbox(0.17, 0.018, 0.018, PAL.charcoal, { x: 0.08, y: 0.245, r: 0.006 }),
      rbox(0.11, 0.05, 0.08, null, { x: 0.17, y: 0.2, r: 0.02, m: emissive('#f3ead8', '#ffd9a0', 1.1) }),
    );
    l.position.set(-6.52, top, 4.0);
    root.add(l);
  }
  pool(-6.35, 4.0, 0.3, { k: 0.3, y: top + 0.004 }); // the lamp's light on the desk
  pool(DESK[0], DESK[1], 1.0, { k: 0.24 });
  yield;
  // her chair behind the desk, a guest chair across it
  const ch = officeChair('#2a2f3e');
  ch.position.set(EMI_SEAT[0], 0, EMI_SEAT[1]);
  root.add(ch);
  {
    const g = new THREE.Group();
    g.add(
      rbox(0.38, 0.05, 0.36, PAL.chair, { y: 0.2, r: 0.02 }),
      rbox(0.36, 0.26, 0.04, PAL.chair, { y: 0.27, z: 0.17, r: 0.02 }),
    );
    for (const [x, z] of [
      [-0.16, -0.15],
      [0.16, -0.15],
      [-0.16, 0.15],
      [0.16, 0.15],
    ])
      g.add(rbox(0.025, 0.2, 0.025, PAL.metal, { x, z, r: 0.008 }));
    g.position.set(GUEST[0], 0, GUEST[1]);
    root.add(g);
  }
  yield;
  // on the left wall beside her chair: a low cabinet with the team photo, a small plant and binders
  {
    const c = new THREE.Group();
    c.add(rbox(0.9, 0.44, 0.36, '#767c88', { r: 0.015 }), rbox(0.92, 0.02, 0.38, '#a3a9b2', { y: 0.44, r: 0.006 }));
    for (const x of [-0.22, 0.22]) {
      c.add(rbox(0.41, 0.38, 0.012, '#6a707c', { x, y: 0.03, z: 0.18, r: 0.004, cast: false }));
      c.add(
        rbox(0.012, 0.1, 0.014, '#c9cdd2', { x: x + (x < 0 ? 0.16 : -0.16), y: 0.18, z: 0.19, r: 0.004, cast: false }),
      );
    }
    for (let i = 0; i < 3; i++)
      c.add(rbox(0.05, 0.2, 0.22, ['#4a6490', '#3d4d6b', '#7f8ea3'][i], { x: 0.26 + i * 0.055, y: 0.46, r: 0.008 }));
    const ph = new THREE.Group(); // the team photo, standing on the cabinet turned to the room
    const fr = framed(0.2, 0.14, teamPhoto, { frame: '#2f3440' });
    fr.rotation.x = -0.18;
    fr.position.y = 0.095;
    ph.add(fr, rbox(0.06, 0.1, 0.04, '#2f3440', { y: 0, z: -0.04, r: 0.006, cast: false })); // and its stand
    ph.position.set(-0.26, 0.46, 0.02);
    ph.rotation.y = -0.6;
    c.add(ph);
    const pl = plant({ size: 0.38, seed: 31 });
    pl.position.set(0.05, 0.46, 0);
    c.add(pl);
    c.rotation.y = Math.PI / 2;
    c.position.set(W0 + 0.19, 0, 3.38);
    root.add(c);
  }
  // a coat stand against the partition, a grey coat and a scarf on it
  {
    const s = new THREE.Group();
    s.add(rbox(0.3, 0.03, 0.3, PAL.charcoal, { r: 0.012 }), rbox(0.03, 1.05, 0.03, PAL.charcoal, { r: 0.01 }));
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const h = rbox(0.1, 0.018, 0.018, PAL.charcoal, {
        x: Math.sin(a) * 0.05,
        y: 0.98,
        z: Math.cos(a) * 0.05,
        r: 0.006,
      });
      h.rotation.y = a + Math.PI / 2;
      s.add(h);
    }
    s.add(rbox(0.26, 0.5, 0.1, '#6f7684', { y: 0.48, z: 0.07, r: 0.04 })); // a grey coat on a hook
    s.add(rbox(0.08, 0.42, 0.03, '#9a4f55', { x: 0.1, y: 0.54, z: -0.05, r: 0.012 })); // a scarf
    s.position.set(W1 - 0.2, 0, 5.4);
    s.rotation.y = -Math.PI / 2;
    root.add(s);
  }
  yield;
  // the wall at her back: a backlit coast panel for a window (B2 has none) and the calendar by the doorway
  {
    const win = framed(0.86, 0.4, sky, { frame: '#8a909a', glow: 0.55 });
    win.position.set(-6.35, 0.43, N + 0.014);
    root.add(win);
    pool(-6.35, N + 0.45, 0.6, { k: 0.16, color: '#cfe0f0', sz: 0.7 });
    const cal = framed(0.24, 0.32, calendar, { frame: '#d8d9d5' });
    cal.position.set(-5.68, 0.43, N + 0.014);
    root.add(cal);
  }
  // the left wall: two framed prints over a low bookcase of binders
  {
    const bk = shelf(1.0, 0.55, 0.3, { fill: 'binders', seed: 12 });
    bk.rotation.y = Math.PI / 2;
    bk.position.set(W0 + 0.16, 0, 5.35);
    root.add(bk);
    for (const [z, hue] of [
      [5.08, '#7a9bb8'],
      [5.6, '#8fa58a'],
    ]) {
      const f = framed(0.22, 0.26, print(hue));
      f.rotation.y = Math.PI / 2;
      f.position.set(W0 + 0.014, 0.72, z);
      root.add(f);
    }
  }
  {
    const p = plant({ size: 0.9, seed: 33, tall: 1.3 });
    p.position.set(-6.68, 0, 6.08);
    root.add(p);
  }
  yield;
  // a filing cabinet in the near corner by the partition, a document tray on it
  {
    const fc = filingCabinet(2, '#8a909a');
    fc.rotation.y = -Math.PI / 2;
    fc.position.set(W1 - 0.24, 0, 6.1);
    root.add(fc);
    root.add(
      rbox(0.24, 0.05, 0.3, PAL.dark, { x: W1 - 0.24, y: 0.48, z: 6.1, r: 0.008 }),
      rbox(0.21, 0.012, 0.27, PAL.paper, { x: W1 - 0.24, y: 0.53, z: 6.1, r: 0.003, cast: false }),
    );
  }
}

// the walk grid round her furniture (B: nav.block)
export function emiOfficeBlocks(B, { X0, Z1 }) {
  B(DESK[0] - 0.62, DESK[0] + 0.62, DESK[1] - 0.35, DESK[1] + 0.35); // desk
  B(EMI_SEAT[0] - 0.24, EMI_SEAT[0] + 0.24, EMI_SEAT[1] - 0.24, EMI_SEAT[1] + 0.22); // her chair
  B(GUEST[0] - 0.21, GUEST[0] + 0.21, GUEST[1] - 0.2, GUEST[1] + 0.2); // guest chair
  B(X0, X0 + 0.4, 2.9, 3.86); // cabinet
  B(EMI_X - 0.42, EMI_X, 5.22, 5.58); // coat stand
  B(X0, X0 + 0.34, 4.83, 5.87); // bookcase
  B(-6.95, -6.42, 5.82, Z1); // plant
  B(EMI_X - 0.56, EMI_X, 5.86, Z1); // filing cabinet
}
