// The phone video on the train that needs a person in it, rendered in the game's own style: the video the girl with
// headphones took of herself practising guitar (her, cap and all, on her bed, strumming in time with
// audio/sfx/guitar_practice.mp3, fumbling where the recording fumbles). It is a small scene drawn into a corner of the
// game's own canvas and copied out at once (the map does the same, map/render.js), so no second WebGL context.
import * as THREE from 'three';

// the note onsets in guitar_practice (tools/feel/pluck.py prints them); DEAD is the fumbled one, END the file's length
const NOTES = [0.15, 0.43, 0.74, 1.03, 1.29, 1.55, 1.93, 2.16, 2.45, 2.73, 3.0, 3.75, 4.08, 4.41, 4.75, 5.09];
const DEAD = 3.0,
  END = 6.6,
  CHORD2 = 1.93;

// draw `scene` through `cam` into the 2D canvas `out`, via the bottom-left corner of the game's canvas (call it inside
// a frame, before the frame's own render, which covers the corner again)
function snap(renderer, scene, cam, out) {
  const gl = renderer.domElement,
    dpr = renderer.getPixelRatio(),
    size = renderer.getSize(new THREE.Vector2());
  const w = Math.min(out.width, gl.width),
    h = Math.min(out.height, gl.height, Math.round((w * out.height) / out.width));
  const autoClear = renderer.autoClear;
  try {
    renderer.setRenderTarget(null);
    renderer.autoClear = true;
    renderer.setViewport(0, 0, w / dpr, h / dpr);
    renderer.setScissor(0, 0, w / dpr, h / dpr);
    renderer.setScissorTest(true);
    renderer.render(scene, cam);
    out.getContext('2d').drawImage(gl, 0, gl.height - h, w, h, 0, 0, out.width, out.height);
  } finally {
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, size.x, size.y);
    renderer.setScissor(0, 0, size.x, size.y);
    renderer.autoClear = autoClear;
  }
}
function lit(scene, sky = '#dfe9f5', ground = '#6d6a62', sun = 1.5) {
  scene.add(new THREE.HemisphereLight(sky, ground, 1.25));
  const d = new THREE.DirectionalLight('#fff4e6', sun);
  d.position.set(2, 4, 3);
  scene.add(d);
}
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  return m;
}
function textTex(draw, w = 256, h = 128) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function dispose(scene) {
  scene.traverse((o) => {
    if (o.isMesh) {
      if (!o.userData.shared) o.geometry.dispose();
      for (const m of [o.material].flat()) {
        if (o.userData.shared) continue;
        m.map?.dispose();
        m.dispose();
      }
    }
  });
}

// ---------- the practice video ----------
// clone a chibi rig from people.js, with its parts found again in the copy (clone keeps the child order). The place's
// draw-call pass (perf/batch.js) may have merged its parts into batch meshes under it and hidden the originals by
// layer: the copy drops the batches and shows its own parts again, so each can still be left out.
function cloneRig(r) {
  const saved = new Map();
  r.root.traverse((o) => {
    saved.set(o, o.userData);
    o.userData = {};
  });
  const root = r.root.clone(true);
  for (const [o, u] of saved) o.userData = u;
  const map = new Map();
  (function walk(a, b) {
    map.set(a, b);
    a.children.forEach((c, i) => walk(c, b.children[i]));
  })(r.root, root);
  for (const [o, c] of map) {
    if (o.userData.perfBatch) c.removeFromParent();
    else if (c.isMesh) {
      c.layers.set(0);
      c.userData.shared = true; // geometry and materials still belong to the passenger
    }
  }
  const pick = (o) => map.get(o);
  return {
    root,
    hips: pick(r.hips),
    torso: pick(r.torso),
    head: pick(r.head),
    headK: pick(r.headK),
    arms: r.arms.map(pick),
    map,
  };
}
function guitar() {
  const g = new THREE.Group();
  const outline = new THREE.Shape();
  outline.absellipse(0, 0, 0.13, 0.1, 0, Math.PI * 2);
  const upper = new THREE.Shape();
  upper.absellipse(0.1, 0.01, 0.085, 0.075, 0, Math.PI * 2);
  const body = new THREE.ExtrudeGeometry([outline, upper], {
    depth: 0.04,
    bevelEnabled: true,
    bevelSize: 0.01,
    bevelThickness: 0.01,
    bevelSegments: 2,
    curveSegments: 18,
  });
  g.add(mesh(body, std('#c9423f', { roughness: 0.45 })));
  const guard = mesh(new THREE.CircleGeometry(0.06, 16), std('#f2efe8'), -0.02, -0.03, 0.052);
  guard.scale.set(1.3, 0.8, 1);
  g.add(guard);
  g.add(mesh(new THREE.BoxGeometry(0.38, 0.04, 0.025), std('#e6d3aa'), 0.34, 0.02, 0.04));
  g.add(mesh(new THREE.BoxGeometry(0.08, 0.05, 0.022), std('#2b2f38'), 0.56, 0.025, 0.04));
  return g;
}
// hide: parts of her train self left out of the video (the headphones, and the phone that is filming)
export function guitarVideo(renderer, music, hide = []) {
  const out = document.createElement('canvas');
  out.width = 480;
  out.height = 360;
  const frame = document.createElement('canvas');
  frame.width = 480;
  frame.height = 360;
  const s = new THREE.Scene();
  s.background = new THREE.Color('#d8dde4');
  lit(s, '#fff2e2', '#7d7f86', 1.2);
  const wall = mesh(new THREE.PlaneGeometry(8, 4), std('#dfe3e8'), 0, 2, -1.1);
  s.add(wall);
  const floor = mesh(new THREE.PlaneGeometry(8, 6), std('#a3a9b3'));
  floor.rotation.x = -Math.PI / 2;
  s.add(floor);
  const poster = textTex(
    (g, w, h) => {
      g.fillStyle = '#26324a';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#e8715f';
      g.beginPath();
      g.arc(w / 2, h * 0.42, w * 0.3, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#f3efe6';
      g.fillRect(w * 0.15, h * 0.78, w * 0.7, h * 0.05);
    },
    128,
    180,
  );
  s.add(mesh(new THREE.PlaneGeometry(0.46, 0.64), std('#ffffff', { map: poster }), -0.75, 1.15, -1.09));
  const dusk = textTex((g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#6c8fc4');
    gr.addColorStop(1, '#f2b58a');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#eef1f5';
    g.fillRect(w / 2 - 3, 0, 6, h);
  });
  s.add(
    mesh(
      new THREE.PlaneGeometry(0.8, 0.62),
      std('#ffffff', { map: dusk, emissive: '#ffffff', emissiveMap: dusk, emissiveIntensity: 0.5 }),
      0.75,
      1.2,
      -1.09,
    ),
  );
  s.add(mesh(new THREE.BoxGeometry(1.7, 0.22, 0.95), std('#5b7fae'), 0, 0.11, -0.35));
  s.add(mesh(new THREE.BoxGeometry(0.5, 0.1, 0.3), std('#eef0f3'), -0.55, 0.27, -0.65));
  // her, as on the train (cap included), without the headphones and the phone that are filming this
  const me = cloneRig(music);
  me.root.position.set(0, me.root.position.y, 0.05);
  me.root.rotation.set(0, 0.12, 0);
  for (const o of hide) if (me.map.get(o)) me.map.get(o).visible = false;
  const gt = guitar();
  gt.position.set(-0.06, 0.03, 0.16);
  gt.rotation.set(-0.1, 0.1, 0.42);
  me.torso.add(gt);
  s.add(me.root);
  const cam = new THREE.PerspectiveCamera(34, 4 / 3, 0.1, 30);
  cam.position.set(0.25, 0.86, 2.15);
  cam.lookAt(0.02, 0.6, 0);
  const pose = (t) => {
    let pluck = 0;
    for (const n of NOTES) if (t >= n && t - n < 0.25) pluck = Math.max(pluck, Math.exp(-(t - n) / 0.07));
    const fumble = t > DEAD + 0.05 && t < 3.7 ? Math.sin(((t - DEAD - 0.05) / 0.65) * Math.PI) : 0;
    me.arms[0].rotation.set(-1.0 - 0.18 * pluck + 0.25 * fumble, 0, 0.62);
    const chord = t > CHORD2 ? 1 : 0;
    me.arms[1].rotation.set(-1.25 + 0.06 * chord, 0, 0.95 - 0.08 * chord);
    me.head.rotation.set(-0.12 + 0.05 * pluck + 0.25 * fumble, 0.25 * fumble, -0.12 * fumble);
    me.torso.rotation.x = 0.04 * fumble;
  };
  let t = 0,
    acc = 1;
  const draw = () => {
    pose(Math.min(t, END));
    snap(renderer, s, cam, frame);
    const g = out.getContext('2d');
    g.drawImage(frame, 0, 0);
    // the player's bar along the bottom, and a play mark once it has finished
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.fillRect(0, 344, 480, 16);
    g.fillStyle = 'rgba(255,255,255,.4)';
    g.fillRect(16, 350, 448, 4);
    g.fillStyle = '#ff5a52';
    g.fillRect(16, 350, 448 * Math.min(1, t / END), 4);
    if (t >= END) {
      g.fillStyle = 'rgba(0,0,0,.4)';
      g.beginPath();
      g.arc(240, 170, 34, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath();
      g.moveTo(229, 152);
      g.lineTo(256, 170);
      g.lineTo(229, 188);
      g.fill();
    }
  };
  return {
    canvas: out,
    restart() {
      t = 0;
      acc = 1;
    },
    // runs every frame while it's shown; redraws about 20 times a second, and stops once the video has ended
    update(dt) {
      if (t > END + 0.2) return;
      t += dt;
      acc += dt;
      if (acc < 0.05) return;
      acc = 0;
      draw();
    },
    dispose: () => dispose(s),
  };
}
