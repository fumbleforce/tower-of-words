import * as THREE from 'three';
import { rbox } from '../props.js';
import { poolHandling } from './day3/pool-handling.js';
import { actionShot } from './day4/shot.js';

// Only the worker's arm and its own cloth move. The helper restores the mixer pose before every update.
export function counterActivity(game, P, worker) {
  const hands = poolHandling(P.space, { codeArms: true }),
    shot = actionShot(P);
  const cloth = rbox(0.15, 0.018, 0.12, '#dfcba8');
  cloth.userData.noBatch = true;
  cloth.name = 'room-worker-cloth';
  cloth.position.set(2.0, 0.677, -7.42);
  P.space.add(cloth);
  const bin = rbox(0.16, 0.15, 0.13, '#d6ddd8');
  bin.position.set(2.9, 0.725, -7.08);
  P.space.add(bin);
  for (let i = 0; i < 5; i++) {
    const stick = rbox(0.012, 0.22, 0.012, '#bea17b');
    stick.position.set(2.85 + i * 0.021, 0.83, -7.08);
    P.space.add(stick);
  }
  let time = 0,
    own = false,
    generation = 0;
  const rest = () => {
    hands.drop(worker);
    cloth.position.set(2.0, 0.677, -7.42);
  };
  function wipe(t) {
    const x = 2.0 + Math.sin(t * 2.2) * 0.1;
    hands.reach(worker, [x, 0.69, -7.42]);
    // The cloth follows the real wrist, so a failed reach is visible rather than a detached prop animation.
    hands.hold(worker, cloth, 0.012);
    hands.reach(worker, [x, 0.69, -7.42]);
    hands.update();
  }
  return {
    cloth,
    snapshot: shot.snapshot,
    restore: shot.load,
    async act({ state }) {
      own = true;
      const token = generation;
      try {
        if (state === 'frame') {
          shot.focus([2.1, -7.0], 6.0, 0.8, -0.25, 0.7);
          return;
        }
        if (state === 'water') {
          shot.focus([9.5, -6.0], 3.8, 0.65, -0.2, 0.8);
          return;
        }
        shot.focus([2.1, -7.05], 6.0, 0.8, -0.25, 0.7);
        if (state === 'wipe')
          await game.tween(1.1, (k) => {
            if (token === generation) wipe(k * 1.1);
          });
        else if (state === 'utensils') {
          rest();
          hands.reach(worker, [2.45, 0.82, -7.15]);
          await game.wait(700);
        } else throw new Error(`Unknown counter activity ${state}`);
      } finally {
        own = false;
        rest();
      }
    },
    update(dt) {
      shot.update();
      cloth.visible = worker.root.visible;
      if (!worker.root.visible || game.busy) {
        if (!own) rest();
        return;
      }
      time += dt;
      if (time % 8 < 3) wipe(time);
      else rest();
    },
    leave() {
      generation++;
      own = false;
      rest();
      hands.dispose();
      P.cam.release();
    },
  };
}

// A small silent sports replay on the existing television, visible while somebody is watching it.
export function sofaActivity(game, P, kenji) {
  const shot = actionShot(P);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d'),
    texture = new THREE.CanvasTexture(canvas);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.36), new THREE.MeshBasicMaterial({ map: texture }));
  screen.position.set(-3.78, 0.51, -3.3);
  screen.rotation.y = Math.PI / 2;
  screen.userData.noBatch = true;
  P.space.add(screen);
  let elapsed = 0,
    frame = -1;
  return {
    screen,
    snapshot: shot.snapshot,
    restore: shot.load,
    async act({ state }) {
      shot.focus([-2.65, -3.25], 3.8, 0.45, 1.1, 0.65);
      if (state === 'frame') return;
      if (state !== 'watch') throw new Error(`Unknown sofa activity ${state}`);
      await game.hooks.gesture({ who: 'kenji', kind: 'point', to: 'commons_tv' });
      await game.wait(650);
    },
    update(dt) {
      shot.update();
      screen.visible = kenji.root.visible && kenji.seated;
      if (!screen.visible) return;
      elapsed += dt;
      const next = Math.floor(elapsed * 12);
      if (frame === next) return;
      frame = next;
      ctx.fillStyle = '#366b70';
      ctx.fillRect(0, 0, 256, 128);
      ctx.strokeStyle = '#d9e3d5';
      ctx.lineWidth = 2;
      ctx.strokeRect(28, 12, 200, 104);
      ctx.beginPath();
      ctx.moveTo(128, 12);
      ctx.lineTo(128, 116);
      ctx.stroke();
      const y = 64 + Math.sin(elapsed * 1.1) * 31;
      ctx.fillStyle = '#f2c660';
      ctx.beginPath();
      ctx.arc(49, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e1e6ef';
      ctx.beginPath();
      ctx.arc(206, 118 - y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(128 + Math.sin(elapsed * 2.2) * 72, 64 + Math.sin(elapsed * 3.1) * 31, 3, 0, Math.PI * 2);
      ctx.fill();
      texture.needsUpdate = true;
    },
  };
}
