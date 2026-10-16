import * as THREE from 'three';
import { benches } from '../places/day3/seats.js';

const point = new THREE.Vector3();
const facing = new THREE.Vector3();
const matrix = new THREE.Matrix4();
const inverse = new THREE.Matrix4();
const key = (s) => [s.x, s.z, s.top, s.ry || 0].map((n) => Math.round(n * 100)).join('_');
export const seatVisible = (seat) => {
  for (let o = seat.source; o; o = o.parent) if (!o.visible) return false;
  return true;
};

// Keep the story's IDs. Other IDs depend on position, not object order or random UUIDs.
export function seatInventory(place) {
  const seats = new Map();
  for (const [id, s] of Object.entries(place.seats || {})) {
    // Beds and the shopping street's scene-transition placeholder are not chairs.
    if (!s || !Number.isFinite(s.top) || s.top <= 0 || /bed/.test(id)) continue;
    seats.set(id, { ...s, id, floor: place.floorY || 0, named: true });
  }
  const add = (seat, explicitId) => {
    const same = explicitId
      ? seats.get(explicitId)
      : [...seats.values()].find(
          (s) => Math.hypot(s.x - seat.x, s.z - seat.z) < (s.named ? 0.42 : 0.22) && Math.abs(s.top - seat.top) < 0.1,
        );
    if (same) {
      Object.assign(same, {
        source: seat.source,
        local: explicitId ? seat.local : undefined,
        floor: seat.floor ?? same.floor,
      });
      if (explicitId) {
        Object.assign(same, { x: seat.x, z: seat.z, top: seat.top, ry: seat.ry });
        delete same.out;
      }
      return;
    }
    const id = explicitId || `seat_${key(seat)}`;
    seats.set(id, { ...seat, id });
  };
  place.space.updateMatrixWorld(true);
  inverse.copy(place.space.matrixWorld).invert();
  place.space.traverse((o) => {
    matrix.multiplyMatrices(inverse, o.matrixWorld);
    for (const s of o.userData.seatPoints || []) {
      point.set(s.x, s.top, s.z).applyMatrix4(matrix);
      const x = point.x,
        z = point.z,
        top = point.y;
      facing.set(s.x + Math.sin(s.ry), s.top, s.z + Math.cos(s.ry)).applyMatrix4(matrix);
      const ry = Math.atan2(facing.x - x, facing.z - z);
      point.set(s.x, s.floor ?? 0, s.z).applyMatrix4(matrix);
      add({ ...s, x, z, top, ry, floor: point.y, source: o, local: { ...s } }, o.userData.seatId);
    }
  });
  for (const s of benches(place)) add({ ...s, floor: s.top - 0.34, label: 'Bench' });
  return seats;
}

// Try the front first, then either side. Dining chairs often face a table, so their front is blocked.
// The markers, the targets and the menus ask for a seat's way out several times a frame, each try a walk over every
// blocker in the place: the answer is kept until the seat or the walk grid's blockers change (#630).
const exits = new WeakMap();
export function seatExit(place, seat) {
  const nav = place.nav;
  if (!Array.isArray(nav.rects)) return findExit(place, seat); // a walk grid without blockers to key on
  const key = [nav, nav.free, nav.rects, nav.rects.length, nav.extra, seat.x, seat.z, seat.ry, seat.out],
    kept = exits.get(seat);
  if (!kept || key.some((v, i) => v !== kept.key[i])) exits.set(seat, { key, at: findExit(place, seat) });
  const at = exits.get(seat).at;
  return at && [...at];
}
function findExit(place, seat) {
  if (seat.out && Math.hypot(seat.out[0] - seat.x, seat.out[1] - seat.z) < 1.5 && place.nav.free(...seat.out))
    return [...seat.out];
  for (const distance of [0.55, 0.75, 1, 1.25])
    for (const turn of [0, Math.PI / 2, -Math.PI / 2, Math.PI]) {
      const angle = (seat.ry || 0) + turn;
      const at = [seat.x + Math.sin(angle) * distance, seat.z + Math.cos(angle) * distance];
      if (place.nav.free(...at)) return at;
    }
  return null;
}

export function seatOccupied(game, place, seat) {
  const people = [...Object.values(place.people || {}), ...(place.crowd || [])];
  return people.some((r) => {
    if (!r?.root || r === game.player || !r.root.visible || !(r.seated || r.cat || r.selfGait)) return false;
    r.root.getWorldPosition(point);
    place.space.worldToLocal(point);
    return (
      Math.hypot(point.x - seat.x, point.z - seat.z) < 0.43 * (place.charScale || 1) &&
      Math.abs(point.y - seat.floor) < 1
    );
  });
}

export function refreshSeat(place, seat) {
  if (!seat.source || !seat.local) return seat;
  seat.source.updateWorldMatrix(true, false);
  inverse.copy(place.space.matrixWorld).invert();
  matrix.multiplyMatrices(inverse, seat.source.matrixWorld);
  const s = seat.local;
  point.set(s.x, s.top, s.z).applyMatrix4(matrix);
  const x = point.x,
    z = point.z,
    top = point.y;
  facing.set(s.x + Math.sin(s.ry), s.top, s.z + Math.cos(s.ry)).applyMatrix4(matrix);
  const ry = Math.atan2(facing.x - x, facing.z - z);
  point.set(s.x, s.floor || 0, s.z).applyMatrix4(matrix);
  if (Math.hypot(seat.x - x, seat.z - z) > 1e-5 || Math.abs(seat.ry - ry) > 1e-5) delete seat.out;
  Object.assign(seat, { x, z, top, ry, floor: point.y });
  return seat;
}
