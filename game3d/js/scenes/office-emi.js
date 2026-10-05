// Emi's office on B2: the left part of the old copy room, behind a partition at x = EMI_X (docs/game/places.md, IT
// support; Jørgen, 2026-10-05: "her office should have some decoration not just bare walls, and a defined desk etc.").
// She sits facing the doorway (Jørgen, 2026-10-05, #241: "it doesnt make sense to have her back to the door, and the
// guest seat on the inner side of the office"): her desk in the middle, her chair on the far (+z) side, the guest chair
// between the doorway and the desk on a rug. Beside her a backlit landscape panel for a window (B2 is underground) on the
// left wall and a calendar on the partition; behind her a low cabinet, a tall plant and a filing cabinet; by the doorway
// a coat stand, and framed prints over a low bookcase on the left wall. Room: x X0 (-7) to EMI_X, z CS to Z1
// (scenes/office.js).
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
const DESK = [-5.85, 4.45]; // a desk facing +z: she sits on its +z side
export const EMI_SEAT = [DESK[0], DESK[1] + 0.5]; // her chair, behind the desk, facing -z (the doorway and the guest)
export const EMI_TALK = [-5.05, 3.85]; // where Eric stands to talk to her: the desk's corner on the doorway side
const GUEST = [DESK[0], DESK[1] - 0.72]; // the guest chair across the desk, nearer the doorway, facing her
const CAB = [-5.95, 6.21], // the low cabinet behind her, against the near wall
  COAT = [-6.0, 2.68], // the coat stand inside the doorway
  BOOK = 3.4; // the bookcase's centre along the left wall
// for the place (places/office.js): the partition line, her seat (an office chair's top), the guest chair and where
// Eric talks to her
export const EMI = {
  x: EMI_X,
  // out: on from behind (in front: the desk)
  seat: { x: EMI_SEAT[0], z: EMI_SEAT[1], top: 0.24, ry: Math.PI, out: [EMI_SEAT[0], EMI_SEAT[1] + 0.45] },
  guest: { x: GUEST[0], z: GUEST[1], top: 0.25, ry: 0 },
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
    W1 = EMI_X - T / 2; // the partition's room face
  root.add(tileFloor(X0, EMI_X, CS, Z1, 0.5, { color: '#7d8492', seam: '#717885', y: 0.006 })); // carpet tiles
  {
    const rug = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.012, 2.1), mat('#4f6378', { roughness: 0.95 }));
    rug.position.set(DESK[0] - 0.05, 0.006, DESK[1] - 0.2);
    rug.receiveShadow = true;
    root.add(rug);
  }
  yield;
  // her desk, with the lamp, a mug, folders and her nameplate facing the visitor; things on it at DESK + [dx, dz]
  const X = (dx) => DESK[0] + dx,
    Z = (dz) => DESK[1] + dz;
  // her monitor to one side, so she's seen; open underneath, so her legs are too (Jørgen, #248: "the desk should also
  // be open underneath showing her legs")
  const d = desk({ w: 1.2, d: 0.66, seed: 4, mon: false, clutter: 0, open: true });
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
    np.rotation.y = Math.PI;
    np.position.set(DESK[0], top, Z(-0.25));
    root.add(np);
  }
  {
    const mo = monitor();
    mo.position.set(X(-0.3), top, Z(-0.17));
    mo.rotation.y = 0.42; // turned to her, on the side away from the doorway, so the visitor sees her
    root.add(mo);
    // a paper tray with a lip and paper in it, a pen cup
    root.add(
      rbox(0.22, 0.04, 0.28, PAL.dark, { x: X(0.4), y: top, z: Z(-0.08), r: 0.006 }),
      rbox(0.19, 0.012, 0.25, PAL.paper, { x: X(0.4), y: top + 0.04, z: Z(-0.08), r: 0.003, cast: false }),
      rbox(0.07, 0.09, 0.07, '#4a5b78', { x: X(0.22), y: top, z: Z(-0.2), r: 0.02 }),
    );
  }
  {
    const m = mug('#5a7da6');
    m.position.set(X(0.53), top + 0.04, Z(0.23));
    root.add(m);
    for (let i = 0; i < 3; i++)
      root.add(
        rbox(0.2, 0.012, 0.24, ['#5a7da6', '#c9cdd2', '#8c5a64'][i], {
          x: X(0.34),
          y: top + i * 0.012,
          z: Z(0.21),
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
    l.position.set(X(-0.52), top, Z(0.25));
    root.add(l);
  }
  pool(X(-0.35), Z(0.25), 0.3, { k: 0.3, y: top + 0.004 }); // the lamp's light on the desk
  pool(DESK[0], DESK[1], 1.0, { k: 0.24 });
  yield;
  // her chair behind the desk, a guest chair across it
  const ch = officeChair('#2a2f3e');
  ch.rotation.y = Math.PI;
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
    g.rotation.y = Math.PI; // its back to the doorway
    g.position.set(GUEST[0], 0, GUEST[1]);
    root.add(g);
  }
  yield;
  // behind her against the near wall: a low cabinet with the team photo, a small plant and binders
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
    c.rotation.y = Math.PI;
    c.position.set(CAB[0], 0, CAB[1]);
    root.add(c);
  }
  // a coat stand inside the doorway by the corridor wall, a grey coat and a scarf on it
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
    s.position.set(COAT[0], 0, COAT[1]);
    root.add(s);
  }
  yield;
  // beside her: a backlit coast panel for a window (B2 has none) on the left wall, the calendar on the partition
  {
    const win = framed(0.86, 0.4, sky, { frame: '#8a909a', glow: 0.55 });
    win.rotation.y = Math.PI / 2;
    win.position.set(W0 + 0.014, 0.55, EMI_SEAT[1]);
    root.add(win);
    pool(W0 + 0.45, EMI_SEAT[1], 0.6, { k: 0.16, color: '#cfe0f0', sz: 0.7 });
    const cal = framed(0.24, 0.32, calendar, { frame: '#d8d9d5' });
    cal.rotation.y = -Math.PI / 2;
    cal.position.set(W1 - 0.014, 0.6, EMI_SEAT[1] + 0.1);
    root.add(cal);
  }
  // the left wall by the doorway: two framed prints over a low bookcase of binders
  {
    const bk = shelf(1.0, 0.55, 0.3, { fill: 'binders', seed: 12 });
    bk.rotation.y = Math.PI / 2;
    bk.position.set(W0 + 0.16, 0, BOOK);
    root.add(bk);
    for (const [z, hue] of [
      [BOOK - 0.26, '#7a9bb8'],
      [BOOK + 0.26, '#8fa58a'],
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
  B(EMI_SEAT[0] - 0.24, EMI_SEAT[0] + 0.24, EMI_SEAT[1] - 0.22, EMI_SEAT[1] + 0.24); // her chair
  B(GUEST[0] - 0.21, GUEST[0] + 0.21, GUEST[1] - 0.2, GUEST[1] + 0.2); // guest chair
  B(CAB[0] - 0.48, CAB[0] + 0.48, CAB[1] - 0.2, Z1); // cabinet
  B(COAT[0] - 0.18, COAT[0] + 0.18, COAT[1] - 0.2, COAT[1] + 0.18); // coat stand
  B(X0, X0 + 0.34, BOOK - 0.52, BOOK + 0.52); // bookcase
  B(-6.95, -6.42, 5.82, Z1); // plant
  B(EMI_X - 0.56, EMI_X, 5.86, Z1); // filing cabinet
}
