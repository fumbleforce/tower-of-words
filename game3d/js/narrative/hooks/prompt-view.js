import * as THREE from 'three';
import { setPortraitAvoid, promptWaiting } from '../../ui/portraits.js';
import { setCaptionAvoid } from '../../ui/caption-layout.js';
import { pullBack } from '../../cam.js';

// While a prompt waits on the player (a word to type, replies to pick), Eric and, during "Say it to ...", the thing he
// says it to stay in view: the dialogue portraits keep off them (ui/portraits.js, issue #76), and the camera pulls
// back about the top of the screen until they sit clear of the talk box (cam.js pullBack, issue #80).
const MARGIN = 10, // px between them and the talk box
  MIN_PULL = 0.6,
  STEP = 0.025;

export function installPromptView(game, { canvas }) {
  // corners of what to keep in view, in world space: a shoulder's width each side of the point, from lo to hi metres
  // above it, across the camera's screen
  const side = new THREE.Vector3();
  const corners = (cam, p, lo, hi) => {
    const k = game.place.charScale || 1;
    side.setFromMatrixColumn(cam.matrixWorld, 0).multiplyScalar(0.32 * k);
    const out = [];
    for (const s of [-1, 1])
      for (const up of [lo * k, hi * k]) {
        const v = p.clone().addScaledVector(side, s);
        v.y += up;
        out.push(v);
      }
    return out;
  };
  // those corners as a box on screen, in CSS px (null if behind the camera)
  const onScreen = (cam, pts) => {
    const b = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
    for (const w of pts) {
      const v = w.clone().project(cam);
      if (v.z > 1) return null;
      const x = ((v.x + 1) / 2) * canvas.clientWidth,
        y = ((1 - v.y) / 2) * canvas.clientHeight;
      b.x0 = Math.min(b.x0, x);
      b.x1 = Math.max(b.x1, x);
      b.y0 = Math.min(b.y0, y);
      b.y1 = Math.max(b.y1, y);
    }
    return b;
  };
  const keepCorners = (cam) => {
    const root = game.player?.root;
    const eric = root && root.visible ? corners(cam, root.getWorldPosition(new THREE.Vector3()), 0, 1.25) : null;
    const st = game.saying && game.sayTarget;
    const tgt = st && st.anchor ? corners(cam, st.anchor(new THREE.Vector3()), -1, 0) : null;
    return [eric, tgt];
  };
  game.ericBox = () => {
    const cam = game.place?.camera,
      [eric] = cam ? keepCorners(cam) : [];
    return eric ? onScreen(cam, eric) : null;
  };
  game.promptKeep = () => {
    const cam = game.place?.camera;
    if (!cam) return [];
    return keepCorners(cam)
      .filter(Boolean)
      .map((c) => onScreen(cam, c))
      .filter(Boolean);
  };
  setPortraitAvoid(game.promptKeep);
  setCaptionAvoid(game.promptKeep);

  // How far the camera pulls back for the prompt: the least that clears Eric and the target of the talk box, measured
  // on the shot before any pull, so it doesn't feed on itself as the camera moves.
  const probe = new THREE.PerspectiveCamera();
  const pullFor = (rc, talk) => {
    const cam = game.place.camera;
    probe.copy(cam);
    const [t0, d0] = rc.shot;
    const dir = rc.dir;
    const pts = keepCorners(cam).filter(Boolean);
    if (!pts.length) return 1;
    const r = talk.getBoundingClientRect(),
      W = canvas.clientWidth,
      H = canvas.clientHeight;
    // under the talk box, or off the sides or the bottom of the screen (a story shot on something else)
    const hits = (b) =>
      b &&
      ((b.x0 < r.right + MARGIN && b.x1 > r.left - MARGIN && b.y0 < r.bottom + MARGIN && b.y1 > r.top - MARGIN) ||
        b.x0 < 0 ||
        b.x1 > W ||
        b.y1 > H);
    for (let s = 1; s > MIN_PULL; s -= STEP) {
      const [t, d] = pullBack(t0, d0, dir, cam.fov, s);
      probe.position.copy(t).addScaledVector(dir, d);
      probe.lookAt(t);
      probe.updateMatrixWorld();
      if (!pts.some((c) => hits(onScreen(probe, c)))) return s;
    }
    return MIN_PULL;
  };
  setInterval(() => {
    const rc = game.place?.cam;
    if (!rc || !rc.shot) return; // a camera that can pull back (it keeps its shot before the pull)
    const talk = globalThis.document.querySelector('#talk');
    rc.pull = promptWaiting(talk) ? pullFor(rc, talk) : 1;
  }, 100);
}
