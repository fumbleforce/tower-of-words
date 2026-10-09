// A street sign, in the street style. The boards carry no words of their own: each reports a `labels` spot (the
// middle of its face, facing out) where a place puts its text (scenes/shop-signs.js signSet, props.js textTexture),
// and until then shows a few printed lines, so a sign reads as a sign from across the street.
//   sign(p, { at: [x, z], face, variant })   face: the way the main face looks
// Variants: finger (a post with two pointing boards, one each way), board (a notice or map board between two posts
// under a small roof), pillar (a lit standing sign: a tall box whose faces glow after dark, at a shop or a station
// entrance). Reports its posts or its base as blocked.
import * as THREE from 'three';
import { piece } from '../core/piece.js';
import { STEEL, PAINT, TIMBER } from '../core/palette.js';

const BOARDS = [PAINT.blue, '#3f4650', PAINT.green];

// printed lines on a face w x h at (u, y, v), facing +v (turned ry about its own middle for a finger board)
function lines(k, w, h, u, y, v, { n = 3, ink = '#e8e9e6', ry = 0 } = {}) {
  if (k.phone) n = 1;
  for (let i = 0; i < n; i++) {
    const lw = w * (i ? 0.45 + k.r() * 0.3 : 0.75);
    const g = new THREE.BoxGeometry(lw, h * 0.09, 0.004).translate(
      -w / 2 + 0.06 + lw / 2,
      y + h * (0.72 - i * 0.22),
      0,
    );
    k.geo(ink, g.rotateY(ry).translate(u, 0, v), { worn: false, cast: false });
  }
}

export const sign = piece({
  id: 'street/sign',
  family: 'street',
  label: 'Street sign',
  fidelity: 'finished',
  use: "sign(p, { at: [x, z], face, variant: 'finger' })",
  variants: {
    finger: { h: 2.3 },
    board: { w: 1.4, h: 0.95, y: 0.9 },
    pillar: { w: 0.5, h: 2.1, d: 0.3 },
  },
  vary: { tone: 0.04, wear: [0, 0.35] },
  build(k, o) {
    const r = k.r,
      color = BOARDS[Math.floor(r() * BOARDS.length)];
    if (o.variant === 'finger') {
      k.cyl(STEEL.dark, 0.04, 0.05, o.h, 0, 0, 0, { n: 8, surf: 'metal' });
      k.cyl(STEEL.dark, 0.065, 0.065, 0.05, 0, o.h, 0, { n: 8, surf: 'metal' });
      [1, -1].forEach((dir, i) => {
        const y = o.h - 0.35 - i * 0.32;
        // a board pointing along u, its tip a little narrower; lines on both faces
        k.box(color, 0.86, 0.24, 0.04, dir * 0.48, y, 0, { round: 0.01 });
        k.box(color, 0.1, 0.17, 0.04, dir * 0.95, y + 0.035, 0, { ry: Math.PI / 4 });
        for (const side of [1, -1])
          lines(k, 0.7, 0.24, dir * 0.44, y, side * 0.022, { n: 2, ry: side > 0 ? 0 : Math.PI });
      });
    } else if (o.variant === 'board') {
      const { w, h, y } = o;
      for (const s of [-1, 1]) k.box(TIMBER.dark, 0.09, y + h + 0.25, 0.09, s * (w / 2 + 0.05), 0, 0, { round: 0.01 });
      k.box(TIMBER.mid, w + 0.04, h + 0.04, 0.05, 0, y - 0.02, 0, { round: 0.01 });
      k.box('#e4e0d4', w - 0.06, h - 0.06, 0.01, 0, y + 0.01, 0.03, { worn: false, cast: false });
      // pinned notices and a map, by the seed
      const notices = k.phone ? 2 : 5;
      for (let i = 0; i < notices; i++) {
        const nw = 0.18 + r() * 0.16,
          nh = 0.22 + r() * 0.12;
        const u = -w / 2 + 0.12 + nw / 2 + r() * (w - 0.24 - nw),
          yy = y + 0.06 + r() * (h - 0.12 - nh);
        k.box(r() < 0.3 ? '#f3e7b8' : '#f7f6f1', nw, nh, 0.004, u, yy, 0.037, { worn: false, cast: false });
      }
      const roof = new THREE.BoxGeometry(w + 0.4, 0.04, 0.42).rotateX(0.25).translate(0, y + h + 0.3, 0.02);
      k.geo('#55595d', roof, { surf: 'roof' });
    } else {
      const { w, h, d } = o;
      k.box(STEEL.dark, w + 0.06, 0.12, d + 0.06, 0, 0, 0, { surf: 'metal' });
      k.box(STEEL.dark, w, h - 0.12, d, 0, 0.12, 0, { round: 0.02, surf: 'metal' });
      // the lit faces, front and back: pale by day, glowing after dark
      for (const s of [1, -1]) {
        k.lamp(
          new THREE.BoxGeometry(w - 0.08, h - 0.5, 0.01).translate(
            0,
            0.12 + (h - 0.12) / 2 + 0.02,
            s * (d / 2 + 0.003),
          ),
        );
        lines(k, w - 0.1, 0.9, 0, 0.9, s * (d / 2 + 0.01), { n: 3, ink: '#33404d', ry: s > 0 ? 0 : Math.PI });
      }
      k.box(color, w + 0.02, 0.14, d + 0.02, 0, h - 0.14, 0, { worn: false }); // the coloured head
    }
  },
  footprint: (o) =>
    o.variant === 'board'
      ? [[-o.w / 2 - 0.12, o.w / 2 + 0.12, -0.1, 0.1]]
      : o.variant === 'pillar'
        ? [[-o.w / 2 - 0.05, o.w / 2 + 0.05, -o.d / 2 - 0.05, o.d / 2 + 0.05]]
        : [[-0.08, 0.08, -0.08, 0.08]],
  spots: (o) =>
    o.variant === 'finger'
      ? {
          labels: [
            [0.44, 0.03, o.h - 0.35, 0],
            [-0.44, 0.03, o.h - 0.67, 0],
          ],
        }
      : o.variant === 'board'
        ? { labels: [[0, 0.04, o.y + o.h / 2, 0]], tap: [[0, 0.8, 0, Math.PI]] }
        : { labels: [[0, o.d / 2 + 0.01, 1.1, 0]] },
});
