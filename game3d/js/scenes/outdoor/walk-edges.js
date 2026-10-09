// The drawn border of a place's walkable ground (movement/walk-ground.js; notes/grounds-system.md): one granite
// kerb along every edge where nothing else (a building, a wall, a gate, a trip's start) already stops him, laid
// wholly on the side he can't walk on, so his feet meet it exactly where the walk grid stops him. Kerbs meet at
// corners without gaps or overlaps: the runs along x reach over an outside corner and stop short of an inside one,
// the runs along z keep their length.
//   walkEdges(p, ground)   adds the kerbs to a Parts collector (outdoor/parts.js)
import { kerb } from './edges.js';

export const WALK_KERB = { w: 0.16, h: 0.1 };
// a planted bed's soil top, a hair over the lawn (outdoor/planting.js bed): flush, with no face to read as a step
export const BED_FLUSH = 0.005;

export function walkEdges(p, ground, { w = WALK_KERB.w, h = WALK_KERB.h } = {}) {
  // the kind of the run along z that ends at a point, if any (an inside corner shared with a building keeps its kerb)
  const near = (a, b) => Math.abs(a[0] - b[0]) < 1e-4 && Math.abs(a[1] - b[1]) < 1e-4;
  const zKind = (pt) =>
    ground.edges.find((f) => (f.out === 'w' || f.out === 'e') && (near(f.a, pt) || near(f.b, pt)))?.kind;
  for (const e of ground.edges) {
    if (e.kind !== 'kerb') continue;
    const alongX = e.out === 'n' || e.out === 's',
      sgn = e.out === 's' || e.out === 'e' ? 1 : -1;
    let [s0, s1] = [e.s0, e.s1];
    if (alongX) {
      const grow = (end) => {
        const c = ground.corner(e, end);
        return c === 'outside' ? w : c === 'inside' && zKind(e[end]) === 'kerb' ? -w : 0;
      };
      s0 -= grow('a');
      s1 += grow('b');
    }
    if (s1 - s0 < 0.02) continue;
    const a = alongX ? [s0, e.line] : [e.line, s0],
      b = alongX ? [s1, e.line] : [e.line, s1];
    kerb(p, a, b, { w, h, off: (sgn * w) / 2 });
  }
}
