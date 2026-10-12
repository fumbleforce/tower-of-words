// Jumping somewhere stupid (Jørgen, 2026-10-12: "if you jump into stupid places like jumping off your balcony you get
// sent to the clinic"). A place lists its edges in `falls`: the line the walk grid stops him at in front of a parapet
// or a drop, in its own frame, and the way out over it ({ a: [x, z], b: [x, z], out: [nx, nz] }; places/dorm-falls.js
// for his building's corridors and roof). In the air (jump.js), close to one and heading over it, he goes over: a
// little hop up onto it, out past it and down out of sight with a falling whistle, black, a thump, and he comes to in
// the clinic. The flags fell_from (the place he fell in) and falls (how many times) tell the clinic's story why he's
// there (game3d/story/clinic.js).
//   const falls = installFalls(game, { jump, shadow, ui })
//   falls.check(h)    from jump.js each frame in the air, h his height: true when he went over (the fall has begun)
import { flags } from '../narrative/state.js';
import { PLACE_FILES } from '../places/definitions.js';
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
    flags.fell_from = from;
    flags.falls = (flags.falls || 0) + 1;
    root.position.copy(p0);
    jump.reset();
    if (shadow) shadow.visible = true;
    g.falling = false;
    eric.scripted = false;
    g.busy = false;
    g.walker.locked = false;
    g.walker.sync();
    if (PLACE_FILES.clinic && g.travel) {
      if ((await g.travel('clinic', { fast: true, via: 'plaza' })) === false) delete flags.fell_from;
    } else delete flags.fell_from; // no clinic in this build: he picks himself up where he jumped from
    ui.unfade();
  }
  return { check };
}
