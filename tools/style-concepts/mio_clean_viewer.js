import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { attachOrbit } from "./viewer-kit.js";
import { applyCleanMaterial } from "./mio_clean_material.js";
const {
  document,
  devicePixelRatio,
  requestAnimationFrame,
  location,
  URLSearchParams,
} = globalThis;
const root = "/art/parts/style-concepts/claude-miogen3d/";
const canvas = document.getElementById("view"),
  status = document.getElementById("status"),
  select = document.getElementById("attempt");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const camera = new THREE.PerspectiveCamera(24, 1, 0.01, 30);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#e5e8ec");
scene.add(new THREE.HemisphereLight("#f4f6fa", "#9a958e", 1.6));
const sun = new THREE.DirectionalLight("#fff4e6", 2.4);
sun.position.set(-2, 4, 3);
scene.add(sun);
const groups = [new THREE.Group(), new THREE.Group()];
groups.forEach((g) => scene.add(g));
const loader = new GLTFLoader();
let yaw = 0,
  pitch = 0.07,
  zoom = 1,
  face = false,
  originalOnPhone = false,
  ticket = 0;
const ready = loader
  .loadAsync(root + "raw/meshy-single/norm.glb")
  .then((g) => groups[0].add(g.scene));
function dispose(g, extraKeep = []) {
  const mats = new Set(),
    tex = new Set(),
    images = new Set();
  const retainedTextures = new Set(),
    retainedImages = new Set();
  const keep = [
    ...groups.flatMap((group) => group.children),
    ...extraKeep,
  ].filter((model) => model !== g);
  for (const model of keep)
    model.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of [o.material].flat())
        for (const v of Object.values(m))
          if (v?.isTexture) {
            retainedTextures.add(v);
            if (v.image) retainedImages.add(v.image);
          }
    });
  g.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    for (const m of [o.material].flat()) {
      mats.add(m);
      for (const v of Object.values(m)) if (v?.isTexture) tex.add(v);
    }
  });
  tex.forEach((t) => {
    if (retainedTextures.has(t)) return;
    if (t.image && typeof t.image.close === "function") images.add(t.image);
    t.dispose();
  });
  images.forEach((image) => {
    if (!retainedImages.has(image)) image.close();
  });
  mats.forEach((m) => m.dispose());
}
async function show() {
  const mine = ++ticket;
  const id = select.value;
  const label = select.selectedOptions[0].textContent;
  status.textContent = "Loading…";
  globalThis.__cleanReady = false;
  try {
    const g = await loader.loadAsync(root + "clean/" + id + "/mio.glb");
    await ready;
    if (mine !== ticket) {
      dispose(g.scene);
      return;
    }
    for (const c of groups[1].children) dispose(c, [g.scene]);
    groups[1].clear();
    applyCleanMaterial(g.scene);
    groups[1].add(g.scene);
    document.getElementById("candidate-label").textContent = label;
    status.textContent =
      "Atlas and topology preserved. 05 uses the smaller checked eye correction. Attempts 02–04 have local geometry faults.";
    globalThis.__cleanShown = id;
    globalThis.__cleanReady = true;
  } catch (e) {
    if (mine === ticket) status.textContent = "Could not load: " + e.message;
  }
}
select.onchange = show;
document.getElementById("face").onclick = (e) => {
  face = !face;
  zoom = 1;
  e.target.setAttribute("aria-pressed", String(face));
};
document.getElementById("side").onclick = (e) => {
  originalOnPhone = !originalOnPhone;
  e.target.setAttribute("aria-pressed", String(originalOnPhone));
  e.target.textContent = originalOnPhone ? "Show cleanup" : "Show original";
};
document.getElementById("reset").onclick = () => {
  zoom = 1;
  pitch = 0.07;
};
for (const b of document.querySelectorAll("[data-yaw]"))
  b.onclick = () => {
    yaw = THREE.MathUtils.degToRad(Number(b.dataset.yaw));
  };
attachOrbit(canvas, {
  rotate: (dx, dy) => {
    yaw -= dx * 0.01;
    pitch = Math.max(-0.3, Math.min(1.1, pitch + dy * 0.006));
  },
  zoom: (k) => {
    zoom = Math.max(0.3, Math.min(3, zoom * Math.max(0.1, k)));
  },
});
function frame() {
  const w = canvas.clientWidth,
    h = canvas.clientHeight;
  if (w && h) {
    if (
      canvas.width !== Math.round(w * renderer.getPixelRatio()) ||
      canvas.height !== Math.round(h * renderer.getPixelRatio())
    )
      renderer.setSize(w, h, false);
    const phone = w < 700;
    renderer.setScissorTest(true);
    for (const i of phone ? [originalOnPhone ? 0 : 1] : [0, 1]) {
      const width = phone ? w : w / 2,
        x = phone ? 0 : i * width;
      renderer.setViewport(x, 0, width, h);
      renderer.setScissor(x, 0, width, h);
      camera.aspect = width / h;
      camera.updateProjectionMatrix();
      const cy = face ? 1.095 : 0.631,
        d =
          (face
            ? Math.max(0.66, 0.42 / camera.aspect)
            : Math.max(3.5, 1.65 / camera.aspect)) * zoom;
      camera.position.set(0, cy + Math.sin(pitch) * d, Math.cos(pitch) * d);
      camera.lookAt(0, cy, 0);
      groups.forEach((g, k) => {
        g.visible = k === i;
        g.rotation.y = -yaw;
      });
      renderer.render(scene, camera);
    }
    renderer.setScissorTest(false);
  }
  requestAnimationFrame(frame);
}
const q = new URLSearchParams(location.search);
if ([...select.options].some((o) => o.value === q.get("c")))
  select.value = q.get("c");
show();
frame();
