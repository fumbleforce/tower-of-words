// A group's place in a chunk's frame (scenes/island-chunks.js): a builder that lays its pieces in the island frame
// puts them in a group placed by this, so they land in the place's own frame, turned by the chunk's turn.
import { CHUNKS, toLocal } from './island-layout.js';

export function placeIn(group, chunk) {
  const [x, z] = toLocal(chunk, 0, 0);
  group.position.set(x, 0, z);
  group.rotation.y = (CHUNKS[chunk].turn * Math.PI) / 180;
  group.scale.setScalar(1 / CHUNKS[chunk].scale);
  return group;
}
