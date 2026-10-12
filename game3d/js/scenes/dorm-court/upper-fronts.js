// The apartment window variant joins the front builder's existing glass meshes.
// All frame geometry stays in the same cell collector as the walls and balconies.
import { windowBay } from '../../kit/building/window.js';
import { kitBag } from '../../kit/core/piece.js';
import { tierNow } from '../skyline-geom.js';
import { apartmentDeck, apartmentServices } from './roofs.js';

export function dormWindow(p, F, u, y, glass, litGlass, seed) {
  const x = F.a[0] + F.d[0] * u,
    z = F.a[1] + F.d[1] * u;
  windowBay(p, {
    at: [x, z],
    face: Math.atan2(F.n[0], F.n[1]),
    y,
    variant: 'dorm',
    level: tierNow() === 0 ? 'phone' : 'standard',
    seed,
  });
  const bag = kitBag(p);
  glass.push(...bag.glass.splice(0));
  litGlass.push(...bag.lit.splice(0).map(([g]) => g));
  bag.glow.length = 0;
}

export function dormRoof(p, k, y, wall) {
  const [x0, x1, z0, z1] = k.rect,
    w = x1 - x0,
    d = z1 - z0,
    south = k.id === 'dorm_2' || k.id === 'dorm_3';
  apartmentDeck(p, k.rect, y, { wall, seams: tierNow() > 0 });
  if (k.id === 'dorm_annex') {
    apartmentServices(p, y, { vents: [[x0 + 0.6, z0 + 0.6]], detail: false });
    return;
  }
  const sx = k.id === 'dorm_gallery' ? x1 - 1.7 : x0 + 0.45,
    sz = south ? z1 - 2.1 : z0 + 0.45;
  apartmentServices(p, y, {
    wall,
    stair: [sx, sx + 1.3, sz, sz + 1.65],
    tank: k.id === 'dorm_gallery' ? null : [x1 - 1.2, south ? z0 + 1 : z1 - 1.1],
    units: Array.from({ length: k.id === 'dorm_gallery' ? 2 : 3 }, (_, i) => [
      x0 + Math.min(w - 0.6, 2.4 + i * 0.8),
      south ? z1 - 0.7 : z0 + 0.7,
      south ? Math.PI : 0,
    ]),
    vents: [[x1 - 0.6, z0 + d * 0.5]],
    detail: false,
  });
}
