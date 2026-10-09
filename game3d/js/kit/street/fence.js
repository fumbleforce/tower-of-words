// A fence or rail along a line, in the street style: the one piece for the eight or more fences and rails the audit
// found (notes/architecture/world-kit.md, section 2).
//   fence(p, { from: [x, z], to: [x, z], variant, y })   posts at both ends and at an even pitch between
// Variants: mesh (a green weld-mesh fence, a school's or a court's), bars (a park railing of steel bars between two
// rails), slats (a timber fence of horizontal boards with gaps), bamboo (a kenninji-gaki: split bamboo close
// together, tied to three dark rails), rail (a low guard rail: two round rails on posts, by a ramp or a drop).
// The bamboo and the boards vary a little each, by the seed. Reports the strip it stands on as blocked.
import { piece } from '../core/piece.js';
import { STEEL, PAINT, TIMBER } from '../core/palette.js';

const BAMBOO = ['#b8a877', '#ad9c6b', '#c2b384', '#a69568'];

export const fence = piece({
  id: 'street/fence',
  family: 'street',
  label: 'Fence and rail',
  fidelity: 'finished',
  run: true,
  use: "fence(p, { from: [x0, z0], to: [x1, z1], variant: 'bars' })",
  variants: {
    mesh: { h: 1.2, pitch: 2.0, color: PAINT.green, cell: 0.2 },
    bars: { h: 1.0, pitch: 2.0, color: STEEL.dark, gap: 0.13 },
    slats: { h: 1.5, pitch: 1.8, color: TIMBER.mid, board: 0.12, gap: 0.03 },
    bamboo: { h: 1.4, pitch: 1.8, color: '#3d3a33', pole: 0.045 },
    rail: { h: 0.9, pitch: 1.4, color: STEEL.mid },
  },
  vary: { tone: 0.04, wear: [0, 0.35] },
  build(k, o) {
    const { len, h, pitch, color } = o,
      r = k.r;
    const n = Math.max(1, Math.ceil(len / pitch - 1e-6));
    const posts = Array.from({ length: n + 1 }, (_, i) => -len / 2 + (len * i) / n);
    const post = (u, w = 0.06, hh = h + 0.04, c = color) =>
      k.box(c, w, hh, w, u, 0, 0, { round: 0.008, surf: 'metal' });
    const rail = (y, th = 0.04, d = 0.04, c = color, surf = 'metal') => k.box(c, len, th, d, 0, y, 0, { surf });
    if (o.variant === 'mesh') {
      for (const u of posts) post(u, 0.06);
      rail(h - 0.04);
      rail(0.06);
      const cell = k.phone ? o.cell * 2 : o.cell;
      for (let y = 0.06 + cell; y < h - 0.05; y += cell) k.box(color, len, 0.008, 0.008, 0, y, 0.01, { cast: false });
      const m = Math.round(len / cell);
      for (let i = 1; i < m; i++)
        k.box(color, 0.008, h - 0.1, 0.008, -len / 2 + (len * i) / m, 0.06, 0.012, { cast: false });
    } else if (o.variant === 'bars') {
      for (const u of posts) {
        post(u, 0.07, h + 0.06);
        if (!k.phone) k.cyl(color, 0.0, 0.05, 0.08, u, h + 0.06, 0, { n: 8 }); // a finial
      }
      rail(h - 0.05, 0.05, 0.05);
      rail(0.1, 0.04, 0.04);
      const gap = k.phone ? o.gap * 2 : o.gap,
        m = Math.round(len / gap);
      for (let i = 1; i < m; i++)
        k.box(color, 0.018, h - 0.15, 0.018, -len / 2 + (len * i) / m, 0.1, 0, { cast: false });
    } else if (o.variant === 'slats') {
      for (const u of posts) post(u, 0.09, h + 0.05, TIMBER.dark);
      const step = o.board + o.gap;
      for (let y = 0.06; y + o.board <= h + 1e-6; y += step) {
        // each board its own tone, a few a little proud, as boards weather differently
        const c = r() < 0.3 ? TIMBER.pale : r() < 0.5 ? TIMBER.dark : color;
        k.box(c, len, o.board, 0.022, 0, y, 0.05 + (r() < 0.15 ? 0.004 : 0), { round: k.high ? 0.004 : 0 });
      }
      if (!k.phone) k.box(TIMBER.dark, len + 0.02, 0.03, 0.08, 0, h + 0.02, 0.04); // the cap
    } else if (o.variant === 'bamboo') {
      for (const u of posts) k.cyl('#5a5246', 0.045, 0.05, h + 0.08, u, 0, -0.05, { n: 8 });
      const step = (k.phone ? 2 : 1) * o.pole * 2.05;
      for (let u = -len / 2 + o.pole; u < len / 2; u += step) {
        const hh = h - 0.02 + (r() - 0.5) * 0.03;
        k.cyl(BAMBOO[Math.floor(r() * BAMBOO.length)], o.pole, o.pole, hh, u, 0.02, 0, { n: 6 });
        if (k.high && r() < 0.5)
          k.cyl('#9d8c5e', o.pole * 1.08, o.pole * 1.08, 0.018, u, 0.3 + r() * (hh - 0.6), 0, { n: 6 });
      }
      for (const y of [0.25, h * 0.55, h - 0.12]) {
        for (const v of [-0.06, 0.06]) k.box(color, len, 0.045, 0.04, 0, y, v, { surf: 'bark' }); // both faces
      }
    } else {
      // rail: round rails on posts
      for (const u of posts) post(u, 0.05);
      for (const [y, rr] of [
        [h, 0.032],
        [h * 0.62, 0.025],
      ])
        k.bar(color, [-len / 2 - 0.02, y, 0], [len / 2 + 0.02, y, 0], rr, { surf: 'metal' });
      for (const u of [-len / 2, len / 2]) k.cyl(color, 0.035, 0.035, 0.02, u, h + 0.02, 0, { n: 8 });
    }
  },
  footprint: (o) => [[-o.len / 2 - 0.05, o.len / 2 + 0.05, -0.1, 0.1]],
});
