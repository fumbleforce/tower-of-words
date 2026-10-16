// The character viewer's wrappers round the game's bodies, so the page can treat them alike:
//   { key, label, kind, root, height, width, anims, play(name), update(dt) }
// meshyBody: a person with clips (the cast's and the crowd's Meshy models: avatar.js); catBody: Tama.
import * as THREE from 'three';
import { makeCat } from '../creatures/cat.js';

export const CAT_MOVES = ['sit', 'stand', 'sleep', 'eat', 'wash', 'walk'];
const CAT_SCALE = 1.15, // as on the train (places/train.js)
  CAT_WALK = 0.32; // place units a second

// The viewer walks people on the spot: the root really moves forward (movement/gait.js and the cat step their legs by
// how far the root went, as in the game) and the group it stands in moves back by the same, so they stay put.
function treadmill(root) {
  const belt = new THREE.Group();
  belt.add(root);
  let speed = 0;
  return {
    belt,
    set: (v) => (speed = v),
    step(dt) {
      if (!speed) return;
      root.position.z += speed * dt;
      belt.position.z -= speed * dt;
      if (root.position.z > 40) {
        // folded back now and then; gait.js takes one jump this big for a scene's cut, not a stride
        root.position.z -= 40;
        belt.position.z += 40;
      }
    },
    stop() {
      speed = 0;
      root.position.z = belt.position.z = 0;
    },
  };
}

// a stool under someone sitting, its top where their feet reach the ground
const stoolMat = new THREE.MeshStandardMaterial({ color: '#9aa3ad', roughness: 0.85 });
function stool(top) {
  const g = new THREE.Mesh(new THREE.BoxGeometry(0.36, top, 0.3), stoolMat);
  g.position.set(0, top / 2, -0.06);
  g.castShadow = g.receiveShadow = true;
  return g;
}
const lowest = (o) => {
  o.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(o, true).min.y;
};

function shell(root) {
  const tm = treadmill(root),
    holder = new THREE.Group();
  holder.add(tm.belt);
  let seat = null;
  return {
    tm,
    holder,
    seat(top) {
      if (seat) holder.remove(seat);
      seat = top ? stool(top) : null;
      if (seat) holder.add(seat);
    },
  };
}

export function meshyBody(key, label, m, { height, phone = true }) {
  const gestures = m.gestures || [];
  const anims = ['idle', 'walk', 'run', 'sit', ...(phone && m.phone ? ['phone'] : []), ...gestures];
  const s = shell(m.root);
  const strides = m.strides || { walkV: 0.44, runV: 1.1 };
  let now = 'idle',
    seatTop = null,
    loop = 0;
  // the seat height that puts their feet on the ground in the sit clip, measured once
  function seatHeight() {
    if (seatTop != null) return seatTop;
    m.sitAt(0, 0, 0, 0);
    m.update(0);
    return (seatTop = Math.max(0.12, -lowest(m.model) + 0.01));
  }
  async function play(name) {
    if (!anims.includes(name)) name = 'idle';
    const was = now;
    now = name;
    loop++;
    s.tm.stop();
    m.setGait(null);
    if (was === 'phone' && name !== 'phone') m.phone('away');
    s.seat(0);
    m.root.position.set(0, 0, 0);
    if (name === 'sit') {
      const top = seatHeight();
      m.sitAt(0, top, 0, 0);
      return s.seat(top);
    }
    const moving = name === 'walk' || name === 'run';
    m.setState(moving ? 'walk' : 'idle');
    if (moving) {
      const v = name === 'run' ? strides.runV : strides.walkV;
      m.setGait(v, { run: name === 'run' });
      s.tm.set(v * m.root.scale.x);
    } else if (name === 'phone') m.phone('look');
    else if (gestures.includes(name)) {
      // the gesture over and over, with a breath between
      const mine = loop;
      while (mine === loop) {
        await m.gesture(name);
        await new Promise((ok) => setTimeout(ok, 700));
      }
    }
  }
  return {
    key,
    label,
    kind: 'person',
    root: s.holder,
    height,
    width: 0.78,
    anims,
    play,
    update(dt) {
      s.tm.step(dt);
      m.update(dt);
    },
  };
}

export function catBody(key) {
  const rig = makeCat('calico', { mode: 'sit' });
  rig.root.scale.setScalar(CAT_SCALE);
  const s = shell(rig.root);
  return {
    key,
    label: 'Tama',
    kind: 'cat',
    root: s.holder,
    height: 0.4,
    width: 0.62,
    anims: CAT_MOVES,
    play(name) {
      s.tm.stop();
      if (name === 'walk') {
        rig.after = 'stand';
        rig.set('stand');
        s.tm.set(CAT_WALK);
      } else {
        rig.after = name;
        rig.set(name);
      }
    },
    update(dt) {
      s.tm.step(dt);
      rig.update(dt);
    },
  };
}
