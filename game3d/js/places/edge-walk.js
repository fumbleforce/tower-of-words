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

// arriving: he starts at the edge, facing in, and walks onto the lane, the close shot going with him (held on the
// edge, a long walk in took him off a phone's screen); then the camera lets go (unless the place walks him on
// further first: release false)
export async function walkIn(g, cam, edge, lane, facing, { release = true } = {}) {
  const eric = g.player;
  eric.scripted = true;
  eric.root.position.set(edge[0], 0, edge[1]);
  eric.root.rotation.y = facing;
  cam.closeOn(edge, ZOOM, undefined, { onEric: true });
  cam.snap(eric.root.position);
  await glide(g, eric.root, lane, 1.1);
  if (!release) return;
  eric.setState('idle');
  eric.scripted = false;
  g.walker.sync();
  cam.release();
}
