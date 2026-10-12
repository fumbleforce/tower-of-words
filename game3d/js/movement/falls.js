// Jumping somewhere stupid (Jørgen, 2026-10-12: "if you jump into stupid places like jumping off your balcony you get
// sent to the clinic"). A place lists its edges in `falls`: the line the walk grid stops him at in front of a parapet
// or a drop, in its own frame, and the way out over it ({ a: [x, z], b: [x, z], out: [nx, nz] }; places/dorm-falls.js
// for his building's corridors and roof). In the air (jump.js), close to one and heading over it, he goes over: a
// little hop up onto it, out past it and down out of sight with a falling whistle, black, a thump, and he comes to in
// the clinic (places/clinic-fall.js, which sets the flags fell_from and falls that the clinic's story wakes him with).
//   const falls = installFalls(game, { jump, shadow, ui })
//   falls.check(h)    from jump.js each frame in the air, h his height: true when he went over (the fall has begun)
import { sendToClinic } from '../places/clinic-fall.js';
import { BODY } from './shared.js';
import { fallSound, landSound } from './jump-fx.js';
import { edgeAhead } from './fall-edges.js';

export function installFalls(game, { jump, shadow, ui }) {
  // which way he's going: the way he moves, or the way he faces when he jumped standing
  function heading() {
    const w = game.walker,
      l = Math.hypot(w.vx, w.vz);
    if (w.v > 0.2 && l > 1e-3) return [w.vx / l, w.vz / l];
    const f = game.player.root.rotation.y;
    return [Math.sin(f), Math.cos(f)];
  }
  function check(h) {
    const P = game.place,
      root = game.player.root;
    if (!P?.falls || game.falling || !game.walker) return false;
    const k = root.scale.x || 1;
    if (h < 0.08 * k) return false;
    const hit = edgeAhead(P.falls, [root.position.x, root.position.z], heading(), (BODY + 0.3) * k);
    if (!hit) return false;
    fall(hit, h);
    return true;
  }

  async function fall({ edge, d }, h) {
    const g = game,
      eric = g.player,
      root = eric.root,
      k = root.scale.x || 1,
      from = g.place.name,
      [ox, oz] = edge.out,
      p0 = root.position.clone();
    g.falling = true;
    g.busy = true;
    g.walker.stop();
    g.walker.locked = true;
    eric.scripted = true;
    jump.reset(); // the jump lets go: the fall moves him now, his root out over the edge and his body down (the
    // place may hold the root on its floor, as his building does on its stairs)
    root.rotation.y = Math.atan2(ox, oz);
    if (shadow) shadow.visible = false;
    fallSound();
    // up onto the parapet and out past it, then down: a real fall, the whole way out of the frame
    const over = d + 0.6 * k,
      T = 1.3;
    await g.tween(T, (t) => {
      const s = t * T,
        e = Math.min(1, s / 0.45);
      const out = over * (1 - (1 - e) * (1 - e));
      root.position.set(p0.x + ox * out, p0.y, p0.z + oz * out);
      jump.hop.position.y = h + 2.0 * k * s - 0.5 * 11 * k * s * s;
    });
    await ui.fade('', '', 250);
    landSound(1.4);
    root.position.copy(p0);
    jump.reset();
    if (shadow) shadow.visible = true;
    g.falling = false;
    eric.scripted = false;
    g.busy = false;
    g.walker.locked = false;
    g.walker.sync();
    // he comes to in the clinic (places/clinic-fall.js sets fell_from and falls; the clinic fades back in). If it
    // can't be reached he picks himself up where he jumped from.
    if (!g.travel || !(await sendToClinic(g, from))) ui.unfade();
  }
  async function recover() {
    if (game.falling) return;
    game.falling = true;
    game.busy = true;
    game.walker.stop();
    game.walker.locked = true;
    await ui.fade('', '', 250);
    jump.reset();
    game.falling = false;
    game.busy = false;
    game.walker.locked = false;
    if (!game.travel || !(await sendToClinic(game, game.place.name))) {
      game.player.root.position.set(...[game.place.start[0], game.place.floorY || 0, game.place.start[1]]);
      ui.unfade();
    }
  }
  return { check, recover };
}
