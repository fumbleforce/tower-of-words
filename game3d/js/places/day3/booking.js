// The gym desk's booking terminal and printer on day 3 (ticket T-0004, story/day3/gym.js), and the swimming club's
// first winter meeting by the windows (story/clubs.js club_swimming_winter, a later Saturday's).
// `bookingRepair` states: reset (the reset button under the terminal pressed: the frozen screen goes dark and comes back
// with today's bookings), restart (the same screen back, after the kotodama on the terminal), print (Print pressed: the
// printer runs until the whole sheet lies in its tray, nothing left queued), check (the attendant takes the sheet up
// and reads down to its last row). d3_booking_restarted and d3_booking_done keep the screen and the sheet on every
// return. The sheet carries the day it is printed (bonds/model.js dateOf).
// `day3Setup` state winterClub: Emi, Kuro and the attendant round the benches by the windows.
import * as THREE from 'three';
import { flags } from '../../narrative/state.js';
import { sim } from '../../sim.js';
import { dateOf } from '../../bonds/model.js';
import { sfx } from '../../sfx.js';
import { rbox, textTexture } from '../../props.js';

const panel = (w, h, draw, px = 256) => {
  const tex = textTexture(draw, px, Math.round((px * h) / w));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  m.userData.noBatch = true;
  return m;
};
const ROWS = ['09:00  Tennis · court A', '13:00  Badminton', '16:00  Art club (Tue)', '18:00  Swimming club'];
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

// w: the gym's world (scenes/rooms/gym.js: terminal and printer anchors); cast: the day's people (day-cast.js)
export function gymDesk(game, { w, cast }) {
  const [tx, ty, tz] = w.terminal; // the terminal's anchor, 0.42 over the desk top
  const top = ty - 0.42;
  const screens = { frozen: null, dark: null, live: null };
  const screen = new THREE.Group();
  for (const k of Object.keys(screens)) {
    const front = panel(0.29, 0.19, screenDraw(k)),
      back = front.clone();
    front.rotation.set(-0.12, Math.PI, 0); // toward the hall, where the terminal's keys are
    back.rotation.set(0.12, 0, 0);
    front.position.z = -0.004;
    back.position.z = 0.004;
    const s = new THREE.Group();
    s.add(front, back);
    s.visible = false;
    screen.add(s);
    screens[k] = s;
  }
  screen.position.set(tx, top + 0.22, tz + 0.04);
  w.root.add(screen);
  const show = (k) => {
    for (const [n, s] of Object.entries(screens)) s.visible = n === k;
  };
  // the reset button: red, under the terminal's front edge
  const reset = rbox(0.035, 0.018, 0.03, '#c8323a', { r: 0.006 });
  reset.position.set(tx + 0.13, top + 0.005, tz - 0.17);
  w.root.add(reset);
  // the sheet: in the printer, out in its tray, in the attendant's hands, on the counter
  const [px, , pz] = w.printer;
  const sheet = panel(0.21, 0.29, sheetDraw, 192);
  sheet.rotation.x = -Math.PI / 2;
  sheet.visible = false;
  w.root.add(sheet);
  const TRAY = [px, top + 0.06, pz - 0.24],
    IN = [px, top + 0.06, pz - 0.02],
    DESK = [tx + 0.85, top + 0.012, tz - 0.05];
  const put = ([x, y, z], { flat = true } = {}) => {
    sheet.visible = true;
    sheet.position.set(x, y, z);
    sheet.rotation.set(flat ? -Math.PI / 2 : -0.35, flat ? 0 : Math.PI, 0);
  };
  function restore() {
    show(flags.d3_booking_restarted ? 'live' : 'frozen');
    if (flags.d3_booking_done) put(DESK);
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
      put(IN);
      await game.tween(1.6, (k) => sheet.position.set(IN[0], IN[1], IN[2] + (TRAY[2] - IN[2]) * k));
      sfx('ok');
      return;
    }
    if (state === 'check') {
      const a = cast.people.attendant;
      const hand = a ? [a.root.position.x, top + 0.38, a.root.position.z - 0.32] : DESK;
      put(hand, { flat: false });
      await game.wait(1200);
      put(DESK);
    }
  }
  // the first winter meeting (a later Saturday): by the windows, the benches on the west side
  function winterClub() {
    cast.put('emi', [-7.75, -6.35], [-8.9, -7.2]);
    cast.seat('kuro', { x: -8.96, z: -4.75, top: 0.24, ry: Math.PI / 2 });
    cast.put('attendant', [-7.45, -9.35], [-8.6, -8.4]);
  }
  return {
    restore,
    hooks: { bookingRepair },
    winterClub,
    kotodamaTargets: (id) => (id === 'booking_terminal' ? [screen] : null),
  };
}
