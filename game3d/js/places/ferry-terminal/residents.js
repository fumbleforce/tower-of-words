import { generic } from '../../chibi-crowd.js';
import { PEOPLE, idle, sit } from '../../cast.js';
import { rbox } from '../../props.js';
import { blob } from '../../engine.js';
import { SEAT_Y } from '../../train/car.js';
import { K } from '../../scenes/office.js';
import { STAFF, READER, TRAVELLER } from '../../scenes/ferry-terminal/plan.js';
import { terminalStaffed } from '../../gameplay/terminal-hours.js';
export function terminalResidents(root) {
  const rows = [
    ['ferry_staff', 'apron', 25, STAFF[0], STAFF[1], 0, null, '#708f97'],
    ['ferry_reader', 'cardigan', 75, READER.x, READER.z, READER.ry, READER.top, '#6d8095'],
    ['ferry_traveller', 'polo', 83, TRAVELLER.x, TRAVELLER.z, TRAVELLER.ry, TRAVELLER.top, '#9b7763'],
  ];
  const people = {};
  for (const [id, kind, seed, x, z, ry, top, color] of rows) {
    const rig = generic(kind, seed, { proxy: true, tint: { top: color } }) || PEOPLE.worker(seed);
    if (id === 'ferry_staff' && !rig.chibi)
      rig.torso.add(rbox(0.25, 0.3, 0.02, color, { y: -0.15, z: 0.105, r: 0.008, seg: 1 }));
    rig.root.scale.multiplyScalar(K);
    rig.root.position.set(x, 0, z);
    rig.root.rotation.y = ry;
    rig.root.add(blob(0.35, 0.25));
    root.add(rig.root);
    if (!rig.sitAt) {
      rig.sitAt = (x, height, z, yaw) => {
        rig.root.position.set(x, 0, z);
        rig.root.rotation.y = yaw;
        sit(rig);
        rig.root.position.y += height - SEAT_Y;
      };
      rig.setState = (state) => {
        rig.state = state;
        if (state === 'idle') {
          for (const part of [...rig.legs, ...rig.knees, ...rig.arms]) part.rotation.set(0, 0, 0);
          rig.root.position.y = 0;
          rig.seated = false;
        }
      };
    }
    if (top !== null) {
      rig.sitAt(x, top, z, ry);
      rig.seated = true;
    }
    people[id] = rig;
  }
  return {
    people,
    period(day, period) {
      people.ferry_staff.root.visible = terminalStaffed(day, period);
    },
    update(t) {
      for (const rig of Object.values(people)) if (rig.root.visible && !rig.meshy) idle(rig, t);
    },
  };
}
