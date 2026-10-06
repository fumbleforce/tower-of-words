// The gym reception's booking terminal and printer on day 3 (ticket T-0004, story/day3/gym.js), and the swimming club's
// first winter meeting by the windows (story/clubs.js club_swimming_winter, a later Saturday's).
// `bookingRepair` states: reset (the reset button under the terminal pressed: the frozen screen goes dark and comes back
// with today's bookings), restart (the same screen back, after the kotodama on the terminal), print (Print pressed: the
// printer runs until the whole sheet lies in its tray, nothing left queued), check (the attendant takes the sheet up
// and reads down to its last row). d3_booking_restarted and d3_booking_done keep the screen and the sheet on every
// return. The sheet carries the day it is printed (bonds/model.js dateOf).
// `day3Setup` state winterClub: Emi, Kuro and the attendant round the hall's benches by the windows.
import * as THREE from 'three';
import { flags } from '../../narrative/state.js';
import { sim } from '../../sim.js';
import { dateOf } from '../../bonds/model.js';
import { sfx } from '../../sfx.js';
import { walkRig, faceRig } from '../../move.js';
import { rbox, textTexture } from '../../props.js';

const panel = (w, h, draw, px = 256) => {
  const tex = textTexture(draw, px, Math.round((px * h) / w));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  m.userData.noBatch = true;
  return m;
};
const ROWS = ['09:00  Tennis · court A', '13:00  Badminton', '16:00  Court B reservation', '18:00  Swimming club'];
function screenDraw(state) {
  return (g, W, H) => {
    g.fillStyle = state === 'frozen' ? '#5a6470' : state === 'dark' ? '#07090c' : '#e9f1f6';
    g.fillRect(0, 0, W, H);
    if (state === 'dark') return;
    g.fillStyle = state === 'frozen' ? '#d9dee3' : '#23303c';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.font = `bold ${Math.round(H / 8)}px sans-serif`;
    if (state === 'frozen') {
      g.textAlign = 'center';
      g.fillText('Bookings', W / 2, H * 0.3);
      g.font = `${Math.round(H / 10)}px sans-serif`;
      g.fillText('…', W / 2, H * 0.55);
      return;
    }
    g.fillText('Bookings  ' + dateOf(sim.day), W * 0.06, H * 0.06);
    g.font = `${Math.round(H / 11)}px sans-serif`;
    ROWS.forEach((r, i) => g.fillText(r, W * 0.06, H * (0.26 + i * 0.17)));
  };
}
function sheetDraw(g, W, H) {
  g.fillStyle = '#f7f6f1';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#2a2d33';
  g.textBaseline = 'top';
  g.font = `bold ${Math.round(H / 13)}px sans-serif`;
  g.fillText('Bookings · ' + dateOf(sim.day), W * 0.08, H * 0.06);
  g.font = `${Math.round(H / 17)}px sans-serif`;
  ROWS.forEach((r, i) => {
    g.fillText(r, W * 0.08, H * (0.22 + i * 0.13));
    g.fillRect(W * 0.08, H * (0.31 + i * 0.13), W * 0.84, 1);
  });
}

// w: the gym's world (scenes/rooms/gym.js: the terminal and printer anchors, desk.ry the way the machines face, the
// benches' seats); cast: the day's people (day-cast.js)
export function gymDesk(game, { w, cast }) {
  const [tx, ty, tz] = w.terminal; // the terminal's anchor, 0.42 over the counter's top
  const top = ty - 0.42,
    ptop = w.printer[1] - 0.45; // the back counter's top, under the printer
  const ry = w.desk.ry,
    c = Math.cos(ry),
    s = Math.sin(ry);
  // a point in a machine's own frame (u across its front, v toward its front), as machines.js lays them
  const at = ([x, z], u, v) => [x + u * c + v * s, z - u * s + v * c];
  const screens = { frozen: null, dark: null, live: null };
  const screen = new THREE.Group();
  for (const k of Object.keys(screens)) {
    const front = panel(0.29, 0.19, screenDraw(k)),
      back = front.clone();
    front.rotation.set(-0.12, Math.PI, 0); // in the group's frame (turned to the terminal's): toward its keys
    back.rotation.set(0.12, 0, 0);
    front.position.z = -0.004;
    back.position.z = 0.004;
    const g = new THREE.Group();
    g.add(front, back);
    g.visible = false;
    screen.add(g);
    screens[k] = g;
  }
  const [sx, sz] = at([tx, tz], 0, -0.04);
  screen.position.set(sx, top + 0.22, sz);
  screen.rotation.y = ry - Math.PI;
  w.root.add(screen);
  let screenState = 'frozen';
  const show = (k) => {
    screenState = k;
    for (const [n, g] of Object.entries(screens)) g.visible = n === k;
  };
  // the reset button: red, under the terminal's front edge
  const reset = rbox(0.035, 0.018, 0.03, '#c8323a', { r: 0.006 });
  const [rx, rz] = at([tx, tz], -0.13, 0.17);
  reset.position.set(rx, top + 0.005, rz);
  reset.rotation.y = ry;
  w.root.add(reset);
  // the sheet: in the printer, out in its tray, in the attendant's hands, on the counter by the terminal
  const [px, , pz] = w.printer;
  const sheet = panel(0.21, 0.29, sheetDraw, 192);
  sheet.rotation.order = 'YXZ';
  sheet.visible = false;
  w.root.add(sheet);
  const TRAY = [...at([px, pz], 0, 0.24)],
    IN = [...at([px, pz], 0, 0.02)],
    DESK = [...at([tx, tz], -0.85, 0.05)];
  const put = ([x, y, z], { flat = true, yaw = ry - Math.PI } = {}) => {
    sheet.visible = true;
    sheet.position.set(x, y, z);
    sheet.rotation.set(flat ? -Math.PI / 2 : -0.35, yaw, 0);
  };
  function restore() {
    show(flags.d3_booking_restarted ? 'live' : 'frozen');
    if (flags.d3_booking_done) put([DESK[0], top + 0.012, DESK[1]]);
    else sheet.visible = false;
  }
  async function bookingRepair({ state } = {}) {
    if (state === 'reset') {
      await game.walkTo?.(...w.spots.gym_desk);
      sfx('tap');
      reset.position.y -= 0.006;
      await game.wait(250);
      reset.position.y += 0.006;
      show('dark');
      await game.wait(900);
      sfx('beep');
      show('live');
      await game.wait(400);
      return;
    }
    if (state === 'restart') {
      show('dark');
      await game.wait(500);
      show('live');
      sfx('beep');
      return;
    }
    if (state === 'print') {
      sfx('tap');
      sfx('copier');
      const y = ptop + 0.06;
      put([IN[0], y, IN[1]]);
      await game.tween(1.6, (k) => sheet.position.set(IN[0] + (TRAY[0] - IN[0]) * k, y, IN[1] + (TRAY[1] - IN[1]) * k));
      sfx('ok');
      return;
    }
    if (state === 'check') {
      // Collect the sheet from the back counter before reading it at the terminal.
      const a = cast.people.attendant;
      const desk = [DESK[0], top + 0.012, DESK[1]];
      if (a) {
        const home = [a.root.position.x, a.root.position.z],
          facing = a.root.rotation.y;
        await walkRig(game, a, w.spots.gym_printer);
        await faceRig(game, a, [px, pz]);
        const yaw = a.root.rotation.y,
          p = a.root.position;
        put([p.x + Math.sin(yaw) * 0.32, top + 0.38, p.z + Math.cos(yaw) * 0.32], { flat: false, yaw });
        a.root.attach(sheet);
        await walkRig(game, a, home);
        await faceRig(game, a, [home[0] + Math.sin(facing), home[1] + Math.cos(facing)]);
        w.root.attach(sheet);
      } else put(desk);
      await game.wait(1200);
      put(desk);
    }
  }
  // the first winter meeting (a later Saturday): round the hall's benches on the west side, by the windows; Kuro
  // on the bench nearer the doors, the player's seat the other (story/clubs.js gym_bench_n)
  function winterClub() {
    const [bs, bn] = w.seats;
    cast.put('emi', [bs.x + 1.2, bs.z - 1.75], [bs.x + 0.05, bs.z - 2.6]);
    cast.seat('kuro', { ...bs, z: bs.z - 0.15 });
    cast.put('attendant', [bn.x + 1.5, bn.z - 1.15], [bn.x + 0.35, bn.z - 0.2]);
  }
  return {
    restore,
    snapshot: () => ({
      screen: screenState,
      sheet: {
        visible: sheet.visible,
        position: sheet.position.toArray(),
        rotation: sheet.rotation.toArray(),
      },
    }),
    load(s) {
      if (!s) return;
      show(s.screen);
      w.root.attach(sheet);
      sheet.visible = s.sheet.visible;
      sheet.position.fromArray(s.sheet.position);
      sheet.rotation.fromArray(s.sheet.rotation);
    },
    hooks: { bookingRepair },
    winterClub,
    kotodamaTargets: (id) => (id === 'booking_terminal' ? [screen] : null),
  };
}
