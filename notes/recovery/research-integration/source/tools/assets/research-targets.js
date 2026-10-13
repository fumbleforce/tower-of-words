import * as THREE from 'three';
import { STATION, pt } from '../../game3d/js/scenes/works/plan.js';

// These gallery targets derive their positions from the playable builders.
// Span is a framing margin, never a replacement for a scene coordinate.
export function researchTarget(room, world, id) {
  if (['research_lab', 'research-room'].includes(room)) {
    if (id === 'research_books') {
      world.root.updateMatrixWorld(true);
      const box = new THREE.Box3();
      for (const { group } of Object.values(world.books.books)) box.expandByObject(group);
      return { anchor: box.getCenter(new THREE.Vector3()).toArray(), spot: world.spots.research_shelf, span: box.getSize(new THREE.Vector3()).length() * 1.2 };
    }
    if (id === 'research_archive') return { anchor: [world.index.x, world.index.top, world.index.z], spot: world.index.out, span: world.index.w * 1.1 };
    if (id === 'research_exit') {
      return { anchor: [world.door.edge[0], world.bounds.h / 2, world.door.edge[1]], spot: world.door.in, span: world.bounds.h * 1.2 };
    }
    const seat = world.seats[id];
    if (seat) return { anchor: [seat.x, seat.top, seat.z], spot: seat.out, span: 1.5, ...(id === 'research_end_seat' ? { pitch: 1.05 } : {}) };
  }
  if (room === 'works' && id === 'weather_station') {
    const [x0, x1, z0, z1] = STATION, [x, z] = pt([(x0 + x1) / 2, (z0 + z1) / 2]);
    return { anchor: [x, 1, z], spot: world.nooks.weather_station, span: Math.max(x1 - x0, z1 - z0) * 1.2 };
  }
  throw new Error(`Unknown authored preview target: ${room}/${id}`);
}
