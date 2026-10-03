// A street closed for resurfacing (day 2: the north road out of the east lane and the pool approach out of the east
// coast, story/day2/README.md). A striped barrier on two stands right across the way, a round no-entry sign in the
// middle and a cone at each end, put up just short of the way's exit zone so no walk ever reaches the zone; the way's
// marker moves to the floor in front of it, where talking to it says why. Built the first time a day needs it.
import * as THREE from 'three';
import { rbox, mat, sh } from '../props.js';

const BAR_Y = 0.55,
  SIGN_Y = 1.12;

// exit: { edge, lane, zone } (a place's exits); inZone(x, z): the zone's test
export function roadClosure(place, exit, inZone, { days = [2] } = {}) {
  let built = null,
    on = false;
  const tag = 'closure:' + exit.edge.join(',');
  function build() {
    const nav = place.nav;
    const dx = exit.edge[0] - exit.lane[0],
      dz = exit.edge[1] - exit.lane[1],
      L = Math.hypot(dx, dz) || 1,
      d = [dx / L, dz / L],
      n = [-d[1], d[0]];
    // back from the lane along the way until clear of the zone, and a little more
    let c = [...exit.lane];
    for (let i = 0; i < 60 && inZone(c[0], c[1]); i++) c = [c[0] - d[0] * 0.1, c[1] - d[1] * 0.1];
    c = [c[0] - d[0] * 0.25, c[1] - d[1] * 0.25];
    // as wide as the way: out each side until the floor ends (or 3 units)
    const reach = (s) => {
      let k = 0;
      while (k < 3 && nav.free(c[0] + n[0] * s * (k + 0.1), c[1] + n[1] * s * (k + 0.1), 0.02)) k += 0.1;
      return Math.max(0.6, k);
    };
    const a = reach(-1),
      b = reach(1);
    const g = new THREE.Group();
    g.position.set(c[0], 0, c[1]);
    g.rotation.y = Math.atan2(-n[1], n[0]); // local x along the barrier, local z back toward the approach
    const len = a + b,
      mid = (b - a) / 2;
    // the bar: yellow and black, in short blocks
    const seg = 0.3,
      k = Math.max(2, Math.round(len / seg));
    for (let i = 0; i < k; i++) {
      const x = -a + (i + 0.5) * (len / k);
      g.add(rbox(len / k, 0.09, 0.05, i % 2 ? '#2a2d33' : '#e2b93b', { x, y: BAR_Y, r: 0.005 }));
      g.add(rbox(len / k, 0.07, 0.04, i % 2 ? '#e2b93b' : '#2a2d33', { x, y: BAR_Y - 0.22, r: 0.005 }));
    }
    // the stands at each end: white A-frames
    for (const x of [-a + 0.08, b - 0.08])
      for (const s of [-1, 1]) {
        const leg = sh(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.72, 0.05), mat('#e8e8e4')));
        leg.position.set(x, 0.34, s * 0.12);
        leg.rotation.x = s * 0.3;
        g.add(leg);
      }
    // the no-entry sign on its post, at the middle
    g.add(rbox(0.05, SIGN_Y, 0.05, '#c9ccd1', { x: mid, z: -0.06, r: 0.01 }));
    const disc = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 28), mat('#c8323a')), true, true);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(mid, SIGN_Y, -0.06);
    g.add(disc);
    for (const s of [1, -1]) {
      const bar = rbox(0.3, 0.07, 0.012, '#f4f4f0', { x: mid, y: SIGN_Y - 0.035, z: -0.06 + s * 0.017, r: 0.005 });
      g.add(bar);
    }
    // cones at the ends, on the near side
    for (const x of [-a + 0.15, b - 0.15]) {
      const cone = sh(new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.36, 14), mat('#e0602e')));
      cone.position.set(x, 0.18, 0.32);
      g.add(cone);
      const band = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.06, 14), mat('#f2f2ee')));
      band.position.set(x, 0.21, 0.32);
      g.add(band);
    }
    place.space.add(g);
    // the walk grid: closed along the barrier (the corners of its rotated line, as one rectangle)
    const ends = [-a, b].map((t) => [c[0] + n[0] * t, c[1] + n[1] * t]);
    const box = [
      Math.min(ends[0][0], ends[1][0]) - 0.12,
      Math.max(ends[0][0], ends[1][0]) + 0.12,
      Math.min(ends[0][1], ends[1][1]) - 0.12,
      Math.max(ends[0][1], ends[1][1]) + 0.12,
    ];
    built = { g, box, spot: [c[0] - d[0] * 0.75, c[1] - d[1] * 0.75], at: c };
  }
  return {
    // on entering a place: up on the days the way is closed, gone on the others
    sync(day) {
      const want = days.includes(day);
      if (want && !built) build();
      if (!built) return;
      built.g.visible = want;
      if (want !== on) {
        if (want) place.nav.blockTagged(tag, ...built.box);
        else place.nav.unblock(tag);
        on = want;
      }
    },
    closed: () => on,
    spot: () => built?.spot,
    at: () => built?.at,
  };
}
