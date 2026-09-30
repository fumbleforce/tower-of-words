// Eric's office chair going back to his desk: he pushes it (production-requests: "an uncaused rolling chair reads as
// magic nobody cast"). He steps in behind it, then walks the route with his hands on its back while it rolls ahead of
// him, facing the way it goes (the cat rides along if she's on it). The office's `chairRoll` hook and its update call
// these; the office keeps the route, the nav blocking and the saved state.
import { walkRig } from '../move.js';

const BEHIND = 0.52; // from the chair's centre to where he stands pushing it
const SPEED = 1.1; // units a second: an easy walking pace

export function chairPusher(game, chair) {
  let path = null,
    done = null;
  const yawTo = (x, z) => Math.atan2(x - chair.position.x, z - chair.position.z);
  return {
    get rolling() {
      return !!path;
    },
    // roll the chair along `route` (a list of [x, z]); resolves when it's there, turned to `endYaw`
    async roll(route, endYaw) {
      if (!route.length) return;
      const pl = game.player;
      const [x0, z0] = route[0];
      const yaw = yawTo(x0, z0);
      // get behind it first (a short walk on his own), then take over his moves
      await walkRig(game, pl, [chair.position.x - Math.sin(yaw) * BEHIND, chair.position.z - Math.cos(yaw) * BEHIND], {
        speed: 1.0,
      });
      chair.rotation.y = yaw;
      pl.scripted = true;
      pl.setState('walk');
      await new Promise((res) => {
        path = route.slice();
        done = () => {
          chair.rotation.y = endYaw;
          pl.scripted = false;
          pl.setState('idle');
          game.walker?.sync?.();
          if (game.walker) game.walker.facing = pl.root.rotation.y;
          res();
        };
      });
    },
    step(dt) {
      if (!path) return;
      const c = chair.position,
        [x, z] = path[0],
        d = Math.hypot(x - c.x, z - c.z);
      if (d < 0.04) {
        path.shift();
        if (!path.length) {
          path = null;
          done();
        }
        return;
      }
      const s = Math.min(d, SPEED * dt);
      c.x += ((x - c.x) / d) * s;
      c.z += ((z - c.z) / d) * s;
      // it swings round to the way it's going, not faster than he could turn it
      let dy = yawTo(x, z) - chair.rotation.y;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      chair.rotation.y += Math.sign(dy) * Math.min(Math.abs(dy), dt * 5);
      const pl = game.player.root,
        a = chair.rotation.y;
      pl.position.set(c.x - Math.sin(a) * BEHIND, 0, c.z - Math.cos(a) * BEHIND);
      pl.rotation.y = a;
    },
  };
}
