// Small objects named by Sunday's optional conversations, kept beside their interaction points.
import { captureObjects, restoreObjects } from './saved.js';
import * as THREE from 'three';
import { rbox, textTexture } from '../../props.js';
import { sim } from '../../sim.js';
import { movable } from './tennis-props.js';
import { standPose } from '../../crowd/motion.js';

const SIGNS = {
  east_lane: {
    liquor_shop: ['Rice delivered to dorms'],
    barber: ['Please take off', 'your glasses.'],
    travel_office: ['Weekdays'],
  },
  shotengai: { bakery: ['Bread reserved by phone', 'is behind the till.'] },
  east_coast: { onsen: ['Closed for boiler repair'] },
  dorm_commons: {
    art_table: ['Both sides, please.'],
    commons_board: ['Art club: Tuesday evening', 'Leave room to eat.'],
  },
  karaoke: {
    karaoke_desk: ['Wednesday club: upstairs', 'You can come to listen.'],
  },
  karaoke_booth: {
    booth_screen: ['Song list', '1. Evening walk', '2. Summer rain'],
    song_terminal: ['Songs with long', 'introductions'],
  },
};
function card(lines) {
  const tex = textTexture(
    (g, w, h) => {
      g.fillStyle = '#f1f2eb';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#253b47';
      g.textAlign = 'center';
      g.font = `${Math.floor(h / (lines.length + 2))}px sans-serif`;
      lines.forEach((s, i) => g.fillText(s, w / 2, (h * (i + 1)) / (lines.length + 1)));
    },
    512,
    256,
  );
  return movable(
    new THREE.Mesh(
      new THREE.PlaneGeometry(0.45, 0.225),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
    ),
  );
}
export function sundayProps(game, P, name, cast) {
  const things = {};
  const objects = [],
    own = (o) => {
      P.space.add(o);
      objects.push(o);
      o.visible = false;
      return o;
    };
  for (const [id, lines] of Object.entries(SIGNS[name] || {})) {
    const t = P.things[id],
      f = t.face(),
      s = t.spot();
    const a = t.anchor(new THREE.Vector3());
    P.space.worldToLocal(a);
    const c = own(card(lines));
    c.position.set(f[0], Math.min(1.3, a.y - 0.15), f[1]);
    c.rotation.y = Math.atan2(s[0] - f[0], s[1] - f[1]);
    c.position.x += Math.sin(c.rotation.y) * 0.05;
    c.position.z += Math.cos(c.rotation.y) * 0.05;
    if (['art_table', 'karaoke_desk', 'song_terminal'].includes(id)) {
      c.rotation.x = -Math.PI / 2;
      c.position.y = a.y - 0.34;
    }
  }
  let remote, sheet, pencil, eraser, sandwich, bags;
  if (name === 'dorm_commons') {
    remote = own(movable(rbox(0.06, 0.018, 0.18, '#343e4a')));
    const seat = P.seats.commons_sofa;
    remote.position.set(seat.x, seat.top + 0.02, seat.z);
    const a = P.things.art_table.anchor(new THREE.Vector3());
    P.space.worldToLocal(a);
    sheet = own(card(['', '']));
    sheet.rotation.x = -Math.PI / 2;
    sheet.position.set(a.x + 0.35, a.y - 0.34, a.z + 0.2);
    const line = rbox(0.15, 0.002, 0.003, '#666f74');
    line.position.set(0, 0, 0.002);
    sheet.add(line);
    pencil = own(movable(rbox(0.008, 0.008, 0.15, '#3e778d')));
    pencil.position.copy(sheet.position);
    pencil.position.y += 0.015;
    eraser = own(movable(rbox(0.035, 0.015, 0.02, '#ecbfc5')));
    eraser.position.copy(sheet.position);
    eraser.position.x += 0.12;
    eraser.position.y += 0.015;
  }
  if (name === 'east_coast') {
    sandwich = own(movable(rbox(0.16, 0.06, 0.12, '#e7d1ac')));
    sandwich.add(rbox(0.17, 0.008, 0.13, '#c9654c', { y: 0.01 }));
  }
  if (name === 'forecourt') {
    bags = [0, 1].map(() => own(movable(rbox(0.25, 0.32, 0.16, '#e2e6de'))));
  }
  if (name === 'pool') {
    const t = P.things.changing_room,
      s = t.spot();
    const notice = own(card(['Pool closed for the season', 'Swimming club: gym Saturdays']));
    notice.position.set(s[0] + 0.55, 1.1, s[1]);
    things.pool_notice = {
      label: 'Pool notice',
      kind: 'thing small',
      verb: 'Read',
      anchor: (v) => notice.getWorldPosition(v),
      spot: () => s,
      face: () => [s[0] + 0.55, s[1]],
      enabled: () => sim.day === 4,
    };
  }
  function follow(o, id, dx, y, dz = 0) {
    const r = P.people[id];
    if (!r?.root.visible) {
      o.visible = false;
      return;
    }
    o.visible = true;
    o.position.copy(r.root.position);
    o.position.x += dx;
    o.position.y += y;
    o.position.z += dz;
  }
  function sync() {
    for (const o of objects) o.visible = true;
    if (remote) remote.visible = sim.period === 'morning';
    if (sheet) for (const o of [sheet, pencil, eraser]) o.visible = sim.period === 'afternoon';
    if (sandwich) {
      sandwich.visible = sim.period === 'lunch';
      if (sandwich.visible) follow(sandwich, 'mio', 0.15, 0.65, 0.2);
    }
    if (bags) bags.forEach((b, i) => follow(b, 'kuroda', i ? 0.36 : -0.36, 0.35));
  }
  return {
    things,
    sync,
    snapshot: () => captureObjects(objects),
    load: (s) => restoreObjects(objects, s),
    async setup({ state } = {}) {
      sync();
      if (state === 'remote') {
        const r = P.people.kenji;
        standPose(r);
        r.seated = false;
        r.root.position.y = 0;
        await game.wait(400);
        follow(remote, 'kenji', 0.25, 0.65, 0.1);
        await game.wait(400);
      } else if (state === 'sketch') {
        const x = eraser.position.x;
        P.cam.closeOn(P.things.art_table.face(), 2.2, sheet.position.y);
        await game.tween(1, (k) => {
          eraser.position.x = x + Math.sin(k * Math.PI * 6) * 0.04;
          sheet.children[0].scale.x = 1 - k * 0.7;
        });
      } else if (state === 'bags') {
        const r = P.people.kuroda;
        await game.tween(0.7, (k) => {
          r.root.rotation.x = Math.sin(k * Math.PI) * 0.18;
          bags.forEach((b, i) => follow(b, 'kuroda', i ? 0.36 : -0.36, 0.35, Math.sin(k * Math.PI) * 0.08));
        });
      }
    },
  };
}
