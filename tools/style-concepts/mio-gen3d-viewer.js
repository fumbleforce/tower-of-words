import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { attachOrbit } from './viewer-kit.js';

const { document, devicePixelRatio, history, requestAnimationFrame, URLSearchParams, location } = globalThis;
const base = '/art/parts/style-concepts/claude-miogen3d/raw/';
const canvas = document.getElementById('view');
const status = document.getElementById('status');
const select = document.getElementById('source');
const clayButton = document.getElementById('clay');
const targetButton = document.getElementById('target-toggle');
targetButton.onclick = () => {
  const shown = document.querySelector('.stage').classList.toggle('show-target');
  targetButton.setAttribute('aria-pressed', String(shown));
  targetButton.textContent = shown ? '3D model' : 'Target picture';
};
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color('#e5e8ec');
scene.add(new THREE.HemisphereLight('#f4f6fa', '#9a958e', 1.6));
const sun = new THREE.DirectionalLight('#fff4e6', 2.4);
sun.position.set(-2, 4, 3);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(24, 1, 0.01, 40);
const turn = new THREE.Group();
scene.add(turn);
const clay = new THREE.MeshStandardMaterial({ color: '#b9bcc2', roughness: 0.8 });
let yaw = 0, pitch = 0.12, zoom = 1, ticket = 0, current = '', clayOn = false;

function dispose(model) {
  const materials = new Set(), textures = new Set();
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    for (const m of [o.userData.paint || o.material].flat()) {
      if (m === clay) continue;
      materials.add(m);
      for (const value of Object.values(m)) if (value?.isTexture) textures.add(value);
    }
  });
  textures.forEach((t) => t.dispose());
  materials.forEach((m) => m.dispose());
}
function paint() {
  turn.traverse((o) => {
    if (o.isMesh) o.material = clayOn ? clay : o.userData.paint;
  });
  clayButton.setAttribute('aria-pressed', String(clayOn));
  clayButton.disabled = current === 'triposg-single';
}
async function show(id) {
  const mine = ++ticket;
  status.textContent = 'Loading ' + select.selectedOptions[0].textContent + '…';
  try {
    const filename = id === 'triposg-single' ? 'viewer.glb' : 'norm.glb';
    const model = (await new GLTFLoader().loadAsync(base + id + '/' + filename)).scene;
    if (mine !== ticket) { dispose(model); return; }
    for (const child of turn.children) dispose(child);
    turn.clear();
    const box = new THREE.Box3().setFromObject(model, true);
    const size = box.getSize(new THREE.Vector3());
    model.scale.multiplyScalar(1.262 / size.y);
    box.setFromObject(model, true);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
    model.traverse((o) => { if (o.isMesh) o.userData.paint = o.material; });
    turn.add(model);
    current = id; yaw = 0; pitch = 0.12; zoom = 1;
    clayOn = id === 'triposg-single';
    paint();
    history.replaceState(null, '', '?c=' + id);
    status.textContent = id === 'triposg-single'
      ? 'TripoSG raw shape: 580,866 triangles, no texture or rig. This live view is its first comparison render.'
      : 'Raw Meshy result, 30 credits. Display size adjusted; topology and paint unchanged. No rig.';
  } catch (error) {
    if (mine === ticket) status.textContent = 'Could not load this guide: ' + error.message;
  }
}
select.onchange = () => show(select.value);
clayButton.onclick = () => { clayOn = !clayOn; paint(); };
document.getElementById('reset').onclick = () => { zoom = 1; pitch = 0.12; };
for (const button of document.querySelectorAll('[data-yaw]')) {
  button.onclick = () => { yaw = THREE.MathUtils.degToRad(Number(button.dataset.yaw)); };
}
attachOrbit(canvas, {
  rotate: (dx, dy) => { yaw -= dx * 0.01; pitch = Math.min(1.2, Math.max(-0.2, pitch + dy * 0.006)); },
  zoom: (factor) => { zoom = Math.max(0.3, Math.min(3, zoom * Math.max(0.1, factor))); },
});
function frame() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (w && h) {
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    const distance = Math.max(3.5, 1.65 / camera.aspect) * zoom;
    camera.position.set(0, 0.631 + Math.sin(pitch) * distance, Math.cos(pitch) * distance);
    camera.lookAt(0, 0.631, 0);
    turn.rotation.y = -yaw;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}
const requested = new URLSearchParams(location.search).get('c');
if ([...select.options].some((o) => o.value === requested)) select.value = requested;
show(select.value);
frame();
