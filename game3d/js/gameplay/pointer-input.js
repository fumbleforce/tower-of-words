// Pointer picking and hold-to-steer. Captured desktop mouse look intercepts the canvas before this listener.
import * as THREE from 'three';
import { pickPerson } from '../move.js';
import { unlockAudio } from '../ui.js';

export function installPointerInput(game, canvas, { use, standUp, held, holdNudge, steer, modelAt }) {
  const raycaster = new THREE.Raycaster();
  function ndc(e) {
    const r = canvas.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }
  canvas.addEventListener('pointerdown', (e) => {
    unlockAudio();
    if (game.busy || !game.place) return;
    // what the cursor is visibly on first (the model itself), then the looser person and marker picks around it
    raycaster.setFromCamera(ndc(e), game.place.camera);
    const hitM = modelAt(raycaster);
    if (hitM) {
      game.lastPick = { id: hitM.id, by: 'model' };
      use(hitM);
      return;
    }
    const who = pickPerson(game, e.clientX, e.clientY, canvas);
    if (who) {
      game.lastPick = { id: who.id, by: 'person' };
      use(who);
      return;
    }
    const [w, h] = [canvas.clientWidth, canvas.clientHeight];
    let best = null,
      bd = 44;
    const v = new THREE.Vector3();
    for (const m of game.markers.list) {
      if (!m.enabled()) continue;
      for (const a of [m.anchor(v.clone()), m.body ? m.body(v.clone()) : null]) {
        if (!a) continue;
        a.project(game.place.camera);
        const d = Math.hypot(((a.x + 1) / 2) * w - e.clientX, ((1 - a.y) / 2) * h - e.clientY);
        if (d < bd) {
          bd = d;
          best = m;
        }
      }
    }
    if (best) {
      game.lastPick = { id: best.id, by: 'near' };
      use(best);
      return;
    }
    game.lastPick = { id: null, by: 'floor' };
    raycaster.setFromCamera(ndc(e), game.place.camera);
    const p = game.place.pick(raycaster);
    if (held()) {
      holdNudge();
      return;
    }
    if (p) standUp();
    game.walker.tapRay(raycaster, game.place);
    steer.press(e);
  });
}
