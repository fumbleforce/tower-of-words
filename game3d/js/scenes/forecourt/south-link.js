// The short missing path past the bicycle court, continued by the arcade's west passage.
// Island coordinates are shared by both arrival directions and the map's path data.
import { OFFICE_SOUTH_LINK } from '../island-south.js';
import { toLocal } from '../island-layout.js';
import { paver, GRANITE } from '../outdoor/paving.js';
import { Parts } from '../outdoor/parts.js';
import { kerb } from '../outdoor/edges.js';

export function southLinkFrame(place) {
  const local = (x, z) => toLocal(place, x, z);
  const {
    rect: [x0, z0, x1],
    x,
    seam,
  } = OFFICE_SOUTH_LINK;
  const a = local(x0, z0 - 0.15),
    b = local(x1, seam + 0.3);
  return {
    walk: [Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1])],
    lane: local(x, place === 'forecourt' ? 10.4 : 13.05),
    inside: local(x, place === 'forecourt' ? 10.15 : 13.3),
    edge: local(x, seam),
    exit: (px, pz) => {
      const p = local(x, place === 'forecourt' ? 10.8 : 12.5);
      return place === 'forecourt' ? pz > p[1] && Math.abs(px - p[0]) < 1.1 : px > p[0] && Math.abs(pz - p[1]) < 1.1;
    },
  };
}

export function buildSouthLink(root) {
  const {
    rect: [x0, z0, x1, z1],
  } = OFFICE_SOUTH_LINK;
  const a = toLocal('forecourt', x0, z0),
    b = toLocal('forecourt', x1, z1);
  const pv = paver(),
    p = new Parts();
  pv.field([a[0], b[0], a[1], b[1]], {
    pattern: 'grid',
    module: [0.6, 0.6],
    tones: GRANITE.pale,
    origin: a,
  });
  for (const x of [a[0], b[0]]) kerb(p, [x, a[1]], [x, b[1]], { w: 0.12 });
  pv.build(root);
  p.build(root);
}
