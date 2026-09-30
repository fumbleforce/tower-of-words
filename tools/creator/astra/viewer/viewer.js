import * as THREE from 'three';
import { loadModel, loadOriginal } from '../../base/model.js';
import { loadAstra } from './model.js';

// Staging: diagnostic, outside the story. Two identical stages, feet at y=0,
// facing +Z. Camera starts at (sin(45°)*d,.5+sin(.08)*d,cos(45°)*d), aimed
// at (0,.5,0); both stages share projection, light, orbit and animation time.
// Standing height is normalized once by each loader, never on a layer change.
const $ = id => document.getElementById(id);
const state = window.__astraComparison = { ready: false, body: 'mio', characters: [] };
let generation = 0, dead = false, paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
let yaw = Math.PI / 4, pitch = .08, zoom = 1, elapsed = 0;
const focus = {
  whole: { at: [0, .5, 0], distance: 2.8 },
  face: { at: [0, .70, .03], distance: 1.2 },
  neck: { at: [0, .54, 0], distance: .8 },
  hood: { at: [0, .53, -.04], distance: .9, yaw: Math.PI, pitch: .9 },
  cuffs: { at: [.25, .34, 0], distance: .85 },
  feet: { at: [0, .07, 0], distance: .85 },
};
const panels = ['left', 'right'].map(id => {
  const host = $(id), renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  host.append(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#dde4ea');
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8d98a3, 1.9));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1); sun.position.set(1.5, 3, 2.5); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.normalBias = .012; sun.shadow.bias = -.0004;
  Object.assign(sun.shadow.camera, { left: -1.5, right: 1.5, top: 1.5, bottom: -1.5 }); scene.add(sun);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.MeshLambertMaterial({ color: '#c9d2da' }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.002; floor.receiveShadow = true; scene.add(floor);
  const camera = new THREE.PerspectiveCamera(28, 1, .01, 20);
  const resize = () => { renderer.setSize(host.clientWidth, host.clientHeight, false); camera.aspect = host.clientWidth / Math.max(1, host.clientHeight); camera.updateProjectionMatrix(); };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  const pointers = new Map(); let pinch = 0;
  host.addEventListener('pointerdown', event => { pointers.set(event.pointerId, [event.clientX, event.clientY]); host.setPointerCapture(event.pointerId); });
  host.addEventListener('pointermove', event => {
    const last = pointers.get(event.pointerId); if (!last) return;
    if (pointers.size === 1) { yaw -= (event.clientX - last[0]) * .01; pitch = THREE.MathUtils.clamp(pitch + (event.clientY - last[1]) * .006, -.35, 1.3); }
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], distance = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch) setZoom(zoom * distance / pinch);
      pinch = distance;
    }
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) host.addEventListener(type, event => { pointers.delete(event.pointerId); pinch = 0; });
  host.addEventListener('wheel', event => { event.preventDefault(); setZoom(zoom * Math.exp(-event.deltaY * .001)); }, { passive: false });
  host.addEventListener('keydown', event => {
    if (!event.key.startsWith('Arrow')) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') yaw -= .15;
    if (event.key === 'ArrowRight') yaw += .15;
    if (event.key === 'ArrowUp') pitch = Math.min(1.3, pitch + .1);
    if (event.key === 'ArrowDown') pitch = Math.max(-.35, pitch - .1);
  });
  return { scene, renderer, camera, observer, floor, sun };
});
state.panels = panels;
function setZoom(value) { zoom = THREE.MathUtils.clamp(value, .7, 3); $('zoom').value = zoom; }
function pause(value) { paused = value; $('pause').textContent = paused ? 'Play' : 'Pause'; $('pause').setAttribute('aria-pressed', String(paused)); }
function dress() {
  for (const character of state.characters) character?.dress?.({ hair: $('hair').checked ? 'own' : 'none', outfit: $('clothes').value });
}
function pose() {
  elapsed = 0; $('phase').value = 0;
  const name = $('motion').value;
  for (const character of state.characters) {
    if (!character) continue;
    if (name !== 'rest') { character.play(name); character.update(0); }
    else {
      character.mixer.stopAllAction();
      const skeletons = new Set(); character.root.traverse(node => { if (node.skeleton) skeletons.add(node.skeleton); });
      for (const skeleton of skeletons) skeleton.pose();
    }
  }
  $('phase').disabled = name === 'rest'; $('pause').disabled = name === 'rest';
}
function seek(seconds) {
  for (const character of state.characters) {
    if (!character?.cur) continue;
    character.cur.time = seconds % character.cur.getClip().duration;
    character.update(0);
  }
}
async function rebuild() {
  const token = ++generation, body = $('body').value;
  state.ready = false; state.error = null;
  $('status').textContent = `Loading ${body === 'mio' ? 'Mio' : 'Eric'}…`; $('retry').hidden = true;
  for (const character of state.characters) character?.dispose();
  state.characters = [];
  const original = $('reference').value === 'original';
  $('left-label').textContent = original ? 'Original' : 'Claude';
  $('left-detail').textContent = original ? 'Game model · original outfit' : 'Blender rebuild';
  const results = await Promise.allSettled([original ? loadOriginal(body) : loadModel(body), loadAstra(body)]);
  if (dead || token !== generation) { for (const result of results) if (result.status === 'fulfilled') result.value.dispose(); return; }
  results.forEach((result, index) => { if (result.status === 'fulfilled') { state.characters[index] = result.value; panels[index].scene.add(result.value.root); } });
  dress(); pose();
  const failed = results.find(result => result.status === 'rejected');
  state.body = body;
  if (failed) {
    state.error = String(failed.reason?.message || failed.reason);
    $('status').textContent = 'A model could not load. Check the asset files, then retry.';
    $('retry').hidden = false;
    console.error(failed.reason);
  } else { state.ready = true; $('status').textContent = original ? 'The original keeps its own hair and outfit. Layer controls apply to Astra.' : ''; }
}
$('body').onchange = rebuild; $('reference').onchange = rebuild; $('retry').onclick = rebuild;
$('clothes').onchange = dress; $('hair').onchange = dress; $('motion').onchange = pose;
$('pause').onclick = () => pause(!paused);
$('phase').oninput = () => { pause(true); elapsed = Number($('phase').value) * (state.characters.find(Boolean)?.cur?.getClip().duration || 1); seek(elapsed); };
$('zoom').oninput = () => setZoom(Number($('zoom').value));
$('focus').onchange = () => {
  const view = focus[$('focus').value]; yaw = view.yaw ?? 0; pitch = view.pitch ?? .08; setZoom(1);
  if ($('focus').value === 'hood') { $('hair').checked = false; dress(); }
};
for (const button of document.querySelectorAll('[data-angle]')) button.onclick = () => { yaw = Number(button.dataset.angle) * Math.PI / 180; pitch = .08; };
let last = performance.now();
function frame(now) {
  if (dead) return;
  const dt = Math.min((now - last) / 1000, .05); last = now;
  if (!document.hidden) {
    if (!paused && $('motion').value !== 'rest') { elapsed += dt; seek(elapsed); $('phase').value = (elapsed % (state.characters.find(Boolean)?.cur?.getClip().duration || 1)) / (state.characters.find(Boolean)?.cur?.getClip().duration || 1); }
    const view = focus[$('focus').value], target = new THREE.Vector3(...view.at);
    for (const panel of panels) {
      const distance = view.distance / zoom * Math.max(1, .65 / panel.camera.aspect);
      panel.camera.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * distance, target.y + Math.sin(pitch) * distance, target.z + Math.cos(yaw) * Math.cos(pitch) * distance);
      panel.camera.lookAt(target); panel.renderer.render(panel.scene, panel.camera);
    }
  }
  requestAnimationFrame(frame);
}
state.pose = (name, time = 0) => { $('motion').value = name; pose(); pause(true); elapsed = time; seek(time); };
state.camera = (angle, look = 'whole') => { $('focus').value = look; $('focus').onchange(); yaw = angle; };
addEventListener('pagehide', event => {
  if (event.persisted) return;
  dead = true; generation++;
  for (const character of state.characters) character?.dispose();
  for (const panel of panels) { panel.observer.disconnect(); panel.floor.geometry.dispose(); panel.floor.material.dispose(); panel.sun.shadow.dispose(); panel.renderer.dispose(); }
});
const params = new URLSearchParams(location.search);
if (['mio', 'eric'].includes(params.get('body'))) $('body').value = params.get('body');
pause(paused); requestAnimationFrame(frame); rebuild();
