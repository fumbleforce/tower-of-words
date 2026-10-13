import { walkRig } from '../movement/scripted.js';
import { stopGait } from '../movement/gait.js';
import { cancelSavedWalk } from '../places/saved-people.js';

const position = (rig) => [rig.root.position.x, rig.root.position.z];
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// The controller owns place attachment. This object owns only the walks it starts.
export function createOutingFollower(
  game,
  {
    person,
    enabled = () => true,
    blocked = () => false,
    allowBusy = () => false,
    walk = walkRig,
    cancel = cancelSavedWalk,
  } = {},
) {
  let trail = [],
    moving = null,
    attempted = null,
    place = null,
    gone = false;
  const companion = () => (typeof person === 'function' ? person() : person);

  function pause() {
    if (moving) {
      const { rig, token } = moving;
      moving = null;
      // A story walk may have superseded ours between updates; never cancel its token.
      if (rig.root.userData.walkTok === token) {
        cancel(rig);
        rig.root.userData.walkVel = null;
        rig._noAvoid = false;
        if (!rig.seated) stopGait(rig);
      }
    }
    trail = [];
    attempted = null;
  }

  function target(player, rig, gap) {
    const points = [position(rig), ...trail, player];
    let remaining = gap;
    for (let i = points.length - 1; i > 0; i--) {
      const end = points[i],
        start = points[i - 1],
        length = distance(start, end);
      if (length >= remaining)
        return [
          end[0] + ((start[0] - end[0]) * remaining) / length,
          end[1] + ((start[1] - end[1]) * remaining) / length,
        ];
      remaining -= length;
    }
    return position(rig);
  }

  function update() {
    if (gone) return;
    const rig = companion(),
      player = game.player,
      current = game.place;
    if (place !== current) {
      pause();
      place = current;
    }
    if (
      !enabled() ||
      blocked() ||
      (!allowBusy() && (game.busy || player?.scripted || game.walker?.path?.scripted || player?._walk)) ||
      game.paused ||
      player?.seated ||
      rig?.seated ||
      !rig?.root.visible ||
      !player?.root ||
      !current?.nav ||
      rig.root.parent !== current.space ||
      player.root.parent !== current.space
    ) {
      pause();
      return;
    }
    if (moving && (moving.rig !== rig || rig.root.userData.walkTok !== moving.token)) {
      moving = null;
      trail = [];
      attempted = null;
    }
    // A scene or another controller owns this actor until that walk has finished.
    if (rig._walk && !moving) return;
    const p = position(player),
      scale = Math.max(player.root.scale?.x || 1, rig.root.scale?.x || 1),
      gap = 1.2 * scale;
    if (!trail.length || distance(trail.at(-1), p) >= 0.3 * scale) {
      trail.push(p);
      if (trail.length > 128) trail.shift();
    }
    if (distance(position(rig), p) < gap) {
      pause();
      return;
    }
    if (moving || (attempted && distance(attempted, p) < 0.3 * scale)) return;
    const to = target(p, rig, gap),
      from = position(rig);
    if (distance(from, to) < 0.35 * scale || distance(p, to) < gap * 0.9) return;
    // walkRig also routes, but rejecting an unreachable target here avoids repeated failed walks.
    attempted = p;
    if (!current.nav.free(to[0], to[1], current.nav.R || 0.24 * scale)) return;
    const path = current.nav.path(from[0], from[1], to[0], to[1]);
    if (!path?.length || distance(path.at(-1), to) > 0.25 * scale) return;
    const job = { rig, token: null };
    moving = job;
    const promise = walk(game, rig, to, { route: true, avoid: true, speed: 1.35 * scale, settle: false });
    job.token = rig.root.userData.walkTok;
    Promise.resolve(promise).then(
      () => {
        if (moving === job) moving = null;
      },
      () => {
        if (moving === job) pause();
      },
    );
  }

  return {
    update,
    pause,
    dispose() {
      gone = true;
      pause();
    },
  };
}
