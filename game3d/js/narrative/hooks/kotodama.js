import * as THREE from 'three';
import { sfx, stopSfx } from '../../ui.js';
import { WORDS } from '../../lang.js';

export function installKotodamaHooks(game, { renderer, objsOf }) {
  const H = game.hooks;
  const ui = game.ui;
  // the word Eric just said (the Say menu, a taught command) is the one a kotodama shows; typed words set it in H.type
  const says = game.mioSays;
  game.mioSays = function (id) {
    this.lastSaid = id;
    return says.call(this, id);
  };
  // ---------- kotodama: the look of a word taking hold ----------
  // One reusable effect for every command that works: the closing chime (or any cuttable sound) stops mid-note,
  // a faint cold shimmer runs along the edges of whatever the word caught, the lights dip and hum for a moment,
  // and a low tone swells. The thing itself is frozen by whoever calls this (the place's hook).
  // targets: Object3Ds whose meshes get the shimmer. Resolves when the effect has settled (about 2.6 s).
  // word: the command that did it (defaults to the word Eric just said); its Japanese rises off the target in faint
  // light while the effect plays, then fades, so the kanji is tied to what it did.
  game.kotodama = async (targets = [], { cut = ['chime'], focus, zoom = 1.25, pulse = targets, word } = {}) => {
    const said = WORDS[word || game.lastSaid];
    game.lastSaid = null;
    for (const k of cut) stopSfx(k);
    // clear the view: the text box and portraits sit over the bottom of the screen, where things like the doors are
    ui.closeTalk();
    const cam = game.place.cam;
    const prevClose = cam && cam.close;
    if (focus && cam && cam.closeOn) cam.closeOn(focus, zoom);
    sfx('kotodama');
    const edges = [];
    const mat = new THREE.LineBasicMaterial({
      color: '#eafcff',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    // a pulse ring (two, a beat apart) that grows out from the middle of what the word caught, facing the camera
    const rings = [];
    if (pulse.length) {
      const bb = new THREE.Box3();
      for (const t of pulse) bb.expandByObject(t);
      const c = bb.getCenter(new THREE.Vector3()),
        size = bb.getSize(new THREE.Vector3()).length();
      for (let i = 0; i < 2; i++) {
        const rm = new THREE.MeshBasicMaterial({
          color: '#d8f8ff',
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: false,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.5, 64), rm);
        ring.position.copy(c);
        ring.renderOrder = 7;
        game.place.scene.add(ring);
        rings.push({ ring, rm, size, delay: i * 0.32 });
      }
    }
    // the word itself, rising off the top of what it caught. Drawn in the HUD layer, not the scene: the AO pass
    // would darken a sprite (GTAOPass draws everything but points and lines into its normal buffer).
    let rise = null;
    if (said && pulse.length) {
      const bb = new THREE.Box3();
      for (const t of pulse) bb.expandByObject(t);
      const el = document.createElement('div');
      el.className = 'kword';
      el.lang = 'ja';
      el.textContent = said.ja;
      document.body.appendChild(el);
      const top = bb.getCenter(new THREE.Vector3());
      top.y = bb.max.y;
      rise = { el, top, v: new THREE.Vector3() };
    }
    const glowM = new THREE.MeshBasicMaterial({
      color: '#9fe6ff',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dotM = new THREE.PointsMaterial({
      color: '#ffffff',
      size: 0.12,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const runners = [];
    const meshes = [];
    for (const t of targets)
      t.traverse((o) => {
        if (o.isMesh && o.geometry) meshes.push(o);
      });
    for (const o of meshes) {
      const eg = new THREE.EdgesGeometry(o.geometry, 35);
      const l = new THREE.LineSegments(eg, mat);
      l.renderOrder = 5;
      o.add(l);
      edges.push(l);
      // a faint cold glow over the whole thing, a touch bigger than it
      const gl = new THREE.Mesh(o.geometry, glowM);
      gl.scale.setScalar(1.12);
      gl.renderOrder = 4;
      gl.userData.shared = true;
      o.add(gl);
      edges.push(gl);
      // a few bright points that run along the edges
      const p = eg.attributes.position;
      const segs = p.count / 2;
      if (!segs) continue;
      const pts = new THREE.BufferGeometry().setAttribute(
        'position',
        new THREE.Float32BufferAttribute(new Float32Array(9), 3),
      );
      const d = new THREE.Points(pts, dotM);
      d.renderOrder = 6;
      o.add(d);
      edges.push(d);
      runners.push({ p, segs, pts, ph: Math.random() });
    }
    const r = renderer,
      e0 = r.toneMappingExposure;
    const a = new THREE.Vector3(),
      b = new THREE.Vector3();
    await game.tween(2.6, (k) => {
      // lights: a quick dip with a flicker, then back
      const dip = k < 0.08 ? k / 0.08 : Math.max(0, 1 - (k - 0.45) / 0.4);
      r.toneMappingExposure = e0 * (1 - 0.28 * dip + 0.05 * dip * Math.sin(k * 90));
      const vis = Math.min(1, k / 0.1) * Math.max(0, 1 - Math.max(0, k - 0.6) / 0.4);
      mat.opacity = vis * (0.85 + 0.15 * Math.sin(k * 40));
      dotM.opacity = vis;
      glowM.opacity = vis * (0.4 + 0.15 * Math.sin(k * 23));
      if (rise) {
        // in over the first fifth, drifting up the whole time, gone by the end
        const cv = r.domElement.getBoundingClientRect(),
          v = rise.v.copy(rise.top).project(game.place.camera);
        const x = cv.left + ((v.x + 1) / 2) * cv.width,
          y = cv.top + ((1 - v.y) / 2) * cv.height - (1 - Math.pow(1 - k, 2)) * 0.07 * cv.height;
        rise.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
        rise.el.style.opacity = (Math.min(1, k / 0.18) * Math.max(0, 1 - Math.max(0, k - 0.55) / 0.45)).toFixed(3);
      }
      for (const q of rings) {
        const s = Math.max(0, Math.min(1, (k * 2.6 - q.delay) / 0.9));
        q.ring.quaternion.copy(game.place.camera.quaternion);
        q.ring.scale.setScalar(0.2 + s * q.size * 1.6);
        q.rm.opacity = s > 0 && s < 1 ? 0.9 * (1 - s) : 0;
      }
      for (const q of runners) {
        const arr = q.pts.attributes.position.array;
        for (let j = 0; j < 3; j++) {
          const s = ((k * 0.9 + q.ph + j / 3) % 1) * q.segs,
            i = Math.floor(s),
            f = s - i;
          a.fromBufferAttribute(q.p, i * 2);
          b.fromBufferAttribute(q.p, i * 2 + 1);
          a.lerp(b, f);
          arr[j * 3] = a.x;
          arr[j * 3 + 1] = a.y;
          arr[j * 3 + 2] = a.z;
        }
        q.pts.attributes.position.needsUpdate = true;
      }
    });
    r.toneMappingExposure = e0;
    if (focus && cam) {
      if (prevClose) cam.close = prevClose;
      else cam.release?.();
    }
    for (const l of edges) {
      l.parent && l.parent.remove(l);
      if (!l.userData.shared) l.geometry.dispose();
    }
    rise?.el.remove();
    mat.dispose();
    dotM.dispose();
    glowM.dispose();
    for (const q of rings) {
      q.ring.parent?.remove(q.ring);
      q.ring.geometry.dispose();
      q.rm.dispose();
    }
  };
  // { do: 'kotodama', target: 'doors', word: 'ugoite' }: the effect on its own, on a place's named target
  // (place.kotodamaTargets); word defaults to the command Eric just said
  H.kotodama = async ({ target, word }) => {
    let t = game.place.kotodamaTargets?.(target) || [];
    if (!t.length) t = objsOf({ id: target });
    await game.kotodama(t, { word });
  };
}
