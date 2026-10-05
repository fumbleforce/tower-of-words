// The guard's monitor at the station desk (ticket T-0003, story/day3/gate.js): on its desk it faces him; turned to a
// visitor, its loose signal plug drops the picture. `monitorRepair` states: turn (round toward the visitor: the
// picture goes, the plug shows half out), seat (the plug pushed home, the picture back), verify (he turns it away and
// round again, the picture steady), away (back on the desk as it was, fixed or not). d3_monitor_done keeps it
// fixed on every return and Continue. scenes/lobby.js keeps the monitor out of the draw-call pass for this.
import * as THREE from 'three';
import { flags } from '../../narrative/state.js';
import { sfx } from '../../sfx.js';
import { rbox, emissive, mat } from '../../props.js';

export function stationMonitor(game, mon) {
  if (!mon) return { hook: async () => {} };
  const screens = { on: emissive('#6fa8d8', '#6fa8d8', 0.9), off: mat('#101317') };
  // the picture: a plane on the screen's face (the face toward the guard, -z on the desk)
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.41, 0.25), screens.on);
  pic.position.set(0, 0.08, -0.022);
  pic.rotation.y = Math.PI;
  mon.add(pic);
  // the signal plug at the back, on its short lead: out (loose) or home
  const plug = rbox(0.06, 0.03, 0.04, '#2d3138', { r: 0.006 });
  mon.add(plug);
  const lead = rbox(0.015, 0.12, 0.015, '#1d2025', { r: 0.004 });
  mon.add(lead);
  const setPlug = (home) => {
    plug.position.set(0.12, home ? 0.02 : -0.02, home ? 0.035 : 0.075);
    plug.rotation.x = home ? 0 : 0.5;
    lead.position.set(0.12, home ? -0.05 : -0.08, home ? 0.04 : 0.08);
  };
  let turned = false;
  const fixed = () => !!flags.d3_monitor_done;
  const show = () => {
    setPlug(fixed() || state.seated);
    pic.material = !turned || fixed() || state.seated ? screens.on : screens.off;
  };
  const state = { seated: false };
  const turn = async (to) => {
    const from = mon.rotation.y,
      want = to ? Math.PI : 0;
    await game.tween(0.7, (k) => (mon.rotation.y = from + (want - from) * k * k * (3 - 2 * k)));
    turned = to;
    show();
  };
  show();
  return {
    // every return: on its desk, fixed or not
    restore() {
      turned = false;
      mon.rotation.y = 0;
      state.seated = fixed();
      show();
    },
    async hook({ state: s } = {}) {
      if (s === 'turn') {
        state.seated = fixed();
        await turn(true);
        if (!state.seated) sfx('tap');
      } else if (s === 'seat') {
        sfx('tap');
        await game.wait(350);
        state.seated = true;
        show();
        sfx('ok');
      } else if (s === 'verify') {
        state.seated = true;
        await turn(false);
        await game.wait(250);
        await turn(true);
      } else if (s === 'away') await turn(false);
    },
  };
}
