// Pure cross-street footprint shared by the physical forecourt plan and cartography.
import { BUILDINGS, footprint, toLocal } from '../island-layout.js';

const station = footprint(BUILDINGS.find((b) => b.id === 'station')).map(([x, z]) => toLocal('forecourt', x, z));
const [x0, z0, x1, z1] = BUILDINGS.find((b) => b.id === 'office_e1').rect;
const [a, b] = [toLocal('forecourt', x0, z0), toLocal('forecourt', x1, z1)].map((p) => p.map((v) => +v.toFixed(2)));
export const STREET_W = 3;
const axis = (a[1] + b[1]) / 2;
export const CROSS = [Math.min(...station.map((p) => p[0])), a[0], axis - STREET_W / 2, axis + STREET_W / 2];
