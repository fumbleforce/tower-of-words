// The security room on day 2 (story/day2/gate.js): Eric's card works now, the gate stays open and nobody is
// rushing through; two ways out, through the glass doors to the platform and north to head office's forecourt.
// lobby.js spreads thing(id) and zones into its own registries and calls install(P) once its place is made.
import { sim } from '../sim.js';
import { sfx } from '../ui.js';
import { glide } from '../move.js';

export function lobbyDay2(game, { Z, st, setGate, commuters, cam }) {
  const later = () => sim.day > 1;
  const things = {
    platform_way: { spot: () => [0, Z - 0.95], face: () => [0, Z], enabled: later },
    forecourt_way: { spot: () => [-1.0, -Z + 0.95], face: () => [-1.0, -Z], enabled: later },
  };
  const zones = {
    platform_way: (x, z) => later() && z > Z - 0.75 && Math.abs(x) < 1.2,
    forecourt_way: (x, z) => later() && z < -Z + 0.8 && Math.abs(x + 1) < 1.2,
  };
  function install(P) {
    const lift = P.things.lift.enabled;
    P.things.lift.enabled = () => lift() && !later(); // day 1's "Station exit"; on day 2 the forecourt way
    P.onDay = (day) => {
      if (day < 2) return;
      st.cardOk = true;
      st.rush = false;
      for (const c of commuters) {
        c.r.root.visible = false;
        c.b.visible = false;
      }
      setGate('open');
      st.flap = 1;
    };
    // out through the glass doors onto the walkway to the platform
    P.tripOutTo = {
      ...P.tripOutTo,
      async train(g) {
        await g.walkTo(0, Z - 1.0);
        g.player.scripted = true;
        g.walker.locked = true;
        cam.closeOn([0, Z], 1.7);
        sfx('glassdoor');
        g.player.setState('walk');
        await glide(g, g.player.root, [0, Z + 1.7], 1.2);
        g.player.setState('idle');
      },
    };
    // back in from the forecourt by the north door, the way day 1's walk left
    P.tripInFrom = {
      ...P.tripInFrom,
      async forecourt(g) {
        const eric = g.player;
        eric.scripted = true;
        eric.root.position.set(-1, 0, -Z - 0.65);
        eric.root.rotation.y = 0;
        cam.closeOn([-1, -Z], 1.7);
        cam.snap(eric.root.position);
        eric.setState('walk');
        await glide(g, eric.root, [-1, -Z + 1.5], 1.2);
        eric.setState('idle');
        eric.scripted = false;
        g.walker.sync();
        cam.release();
      },
    };
  }
  return { thing: (id) => things[id], zones, install };
}
