// Hold to steer (Jørgen, 2026-10-04: "I want to be able to hold down mouse and guide the character along, as
// alternative to wasd and click"). A press on the floor walks there as a click always has (main.js, walker.tapRay);
// if the press is still down after HOLD seconds, or has moved DRAG px, it turns into steering: every frame the point
// on the floor under the cursor (or finger) becomes the walker's steer target, smoothed so he doesn't jitter, and
// SmoothWalker walks him at it: straight where the way is clear, else along the nav route (walker.steerDirect),
// with its usual speed, run rule, wall sliding and people avoidance.
// Letting go stops him (he brakes as from any walk). A press on a person, a thing or a pin never gets here, so
// steering can't take a click meant for a target. Scenes and busy moments end it, as they stop the keys.
//   installSteer(game, canvas) -> { press(e), update(dt) }
//     press(e)    main.js calls it after a press on the floor has been handed to tapRay
//     update(dt)  once a frame, before the walker moves
import * as THREE from 'three';

const HOLD = 0.22, // s held before a press on the floor steers
  DRAG = { mouse: 10, touch: 16 }, // px moved before it steers at once
  EASE = 14; // how fast the smoothed target follows the cursor (1/s)

export function installSteer(game, canvas) {
  let cur = null; // { id, x0, y0, x, y, t0, on, run }
  const ray = new THREE.Raycaster(),
    plane = new THREE.Plane(),
    inv = new THREE.Matrix4(),
    hit = new THREE.Vector3();
  const end = () => {
    const w = game.walker;
    if (cur?.on && w) {
      w.steer = null;
      if (w.path?.steer) w.path = null; // the route round something he was steered along ends with the press
    }
    if (cur?.on) game.walker?.preview.aim(null);
    cur = null;
  };
  const move = (e) => {
    if (!cur || e.pointerId !== cur.id) return;
    cur.x = e.clientX;
    cur.y = e.clientY;
  };
  addEventListener('pointermove', move, true);
  for (const t of ['pointerup', 'pointercancel'])
    addEventListener(t, (e) => cur && e.pointerId === cur.id && end(), true);
  addEventListener('blur', end);
  canvas.addEventListener('contextmenu', (e) => cur && e.preventDefault()); // a long press on a phone
  // the floor point under (sx, sy), in the place's own space (where the walker works), or null
  function floorAt(sx, sy) {
    const P = game.place,
      r = canvas.getBoundingClientRect();
    ray.setFromCamera(
      new THREE.Vector2(((sx - r.left) / r.width) * 2 - 1, -((sy - r.top) / r.height) * 2 + 1),
      P.camera,
    );
    const p = P.pick(ray);
    if (p) return [p.x, p.z];
    // over a wall or a counter that isn't floor: where the ray meets the floor's plane
    const rr = ray.ray.clone();
    if (P.space) rr.applyMatrix4(inv.copy(P.space.matrixWorld).invert());
    plane.set(new THREE.Vector3(0, 1, 0), -(P.floorY || 0));
    return rr.intersectPlane(plane, hit) ? [hit.x, hit.z] : null;
  }
  return {
    press(e) {
      end();
      if (e.button > 0 || !e.isPrimary) return;
      cur = {
        id: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        x: e.clientX,
        y: e.clientY,
        t0: performance.now(),
        on: false,
      };
      cur.drag = DRAG[e.pointerType] || DRAG.mouse;
    },
    update(dt) {
      const w = game.walker;
      if (!cur || !w) return;
      if (game.busy || w.locked || !game.place || document.body.classList.contains('paused')) return end();
      if (!cur.on) {
        const held = (performance.now() - cur.t0) / 1000 >= HOLD,
          dragged = Math.hypot(cur.x - cur.x0, cur.y - cur.y0) >= cur.drag;
        if (!held && !dragged) return;
        cur.on = true;
        cur.run = w.runTo; // a double tap held down steers at a run
        w.path = null;
        w.arrive = null;
        w.preview.clear();
      }
      const at = floorAt(cur.x, cur.y);
      if (!at) return;
      const k = 1 - Math.exp(-dt * EASE);
      const s = w.steer || { x: at[0], z: at[1], run: cur.run };
      if (w.steer) {
        s.x += (at[0] - s.x) * k;
        s.z += (at[1] - s.z) * k;
      }
      w.steer = s;
      w.preview.aim(game.place.space, s.x, s.z, game.place.floorY || 0, game.place.charScale || 1);
    },
    get active() {
      return !!cur?.on;
    },
  };
}
