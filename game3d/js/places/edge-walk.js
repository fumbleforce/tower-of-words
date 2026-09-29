// The watched walk across the shared edge of two outdoor chunks (forecourt and plaza). The camera closes in on
// Eric at the edge in both chunks, so the crossfade between them (places/lifecycle.js) happens on the same close
// framing of him walking the same lane: no cut to black.
import { glide } from '../move.js';

const ZOOM = 1.5;

// leaving: he walks to the lane end himself, then on to the edge
export async function walkOut(g, cam, lane, edge) {
  await g.walkTo(lane[0], lane[1]);
  g.player.scripted = true;
  g.walker.locked = true;
  cam.closeOn(edge, ZOOM);
  await glide(g, g.player.root, edge, 1.1);
  g.player.setState('idle');
}

// arriving: he starts at the edge, facing in, and walks onto the lane; then the camera lets go
export async function walkIn(g, cam, edge, lane, facing) {
  const eric = g.player;
  eric.scripted = true;
  eric.root.position.set(edge[0], 0, edge[1]);
  eric.root.rotation.y = facing;
  cam.closeOn(edge, ZOOM);
  cam.snap(eric.root.position);
  await glide(g, eric.root, lane, 1.1);
  eric.setState('idle');
  eric.scripted = false;
  g.walker.sync();
  cam.release();
}
