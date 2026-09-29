import * as THREE from 'three';
import { loadLibrary } from '../recipe.js';
import { dressed, layersOf } from './base.js';
import { disposeCharacter } from '../dispose.js';
import { loadMio } from '../../../game3d/js/mio.js';
import { loadEric } from '../../../game3d/js/avatar.js';
import { buildOffice } from '../../../game3d/js/scenes/office.js';

// Staging: diagnostic comparison, outside the story. Two independent views show
// figures at the same origin, facing +Z, feet on y=0 and standing height 1.
// Camera starts at (0, .64, 3.4), 24-degree lens aimed at (0, .5, 0). The entire
// figure and a plain floor are visible; no room geometry is behind the lens.
// Both cameras orbit together. Office lights are cloned from buildOffice;
// the old studio preset is available to isolate the effect of lighting.
const $ = id => document.getElementById(id);
const dressedRound = new URLSearchParams(location.search).get('round') === '4';
if (dressedRound) {
  document.title = 'Dressed chibi bases'; document.querySelector('h1').textContent = document.title;
  $('review-link').href = '/bible/#review/creator-base-4';
  $('intro').textContent = 'Original hair and clothes over the closed base, beside the current game character. Hide layers to inspect the body underneath.';
  $('candidate').innerHTML = '<option value="v16-flat">v16: simpler hips, dressed</option><option value="v15-flat">v15: previous body, dressed</option>';
  $('layers').hidden = false;
  $('fit-control').hidden = false;
  $('scale-note').textContent = 'Both figures are scaled to their dressed standing height. Hiding layers keeps that scale; the skin-only body does not grow to fill the missing hair or shoes.';
  $('geometry-note').textContent = 'v16 removes one hip ring from v15. Head, eyes, limbs and rig stay the same. Choose original layer positions or the automatic fitted trial. Both still have fit defects.';
}
const state = window.__baseComparison = { ready: false, body: 'mio', candidate: 'v15-flat', panels: [] };
const office = buildOffice();
const officeLights = office.scene.children.filter(object => object.isLight);
let lib, source, base, generation = 0, dead = false, paused = false;
let yaw = 0, elevation = .04, distance = 3.4;
const panels = ['reference', 'base'].map(id => {
  const host = $(id), renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, .01, 80);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshLambertMaterial({ color: '#8f949b' }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.004; floor.receiveShadow = true; scene.add(floor);
  const actor = new THREE.Group(); scene.add(actor);
  const lights = new THREE.Group(); scene.add(lights);
  const resize = () => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  let drag;
  host.addEventListener('pointerdown', event => { drag = { x: event.clientX, y: event.clientY }; host.setPointerCapture(event.pointerId); });
  host.addEventListener('pointermove', event => { if (!drag) return; yaw -= (event.clientX - drag.x) * .01; elevation = THREE.MathUtils.clamp(elevation + (event.clientY - drag.y) * .005, -.2, 1.2); drag = { x: event.clientX, y: event.clientY }; });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) host.addEventListener(event, () => { drag = null; });
  host.addEventListener('wheel', event => { event.preventDefault(); distance = THREE.MathUtils.clamp(distance + event.deltaY * .003, 1.7, 5); $('zoom').value = distance; }, { passive: false });
  host.addEventListener('keydown', event => {
    const shifts = { ArrowLeft: -.15, ArrowRight: .15 };
    if (event.code in shifts) { yaw += shifts[event.code]; event.preventDefault(); }
  });
  return { host, renderer, scene, camera, actor, floor, lights, observer };
});
state.panels = panels;
function lighting() {
  for (const panel of panels) {
    for (const object of panel.lights.children) object.shadow?.dispose();
    panel.lights.clear();
    const isOffice = $('light').value === 'office';
    panel.scene.background = new THREE.Color(isOffice ? '#33373f' : '#e9ecf1');
    panel.renderer.toneMapping = isOffice ? THREE.NeutralToneMapping : THREE.NoToneMapping;
    const lights = isOffice ? officeLights.map(light => light.clone()) : [new THREE.HemisphereLight(0xffffff, 0x9aa3b5, 2), new THREE.DirectionalLight(0xffffff, 1.6)];
    if (!isOffice) lights[1].position.set(1.2, 2.5, 2.2);
    for (const light of lights) { panel.lights.add(light); if (light.target) panel.lights.add(light.target); }
  }
}
function disposeSource(character) {
  if (!character) return;
  character.root.removeFromParent(); character.mixer.stopAllAction(); character.mixer.uncacheRoot(character.model);
  const geometries = new Set(), materials = new Set(), textures = new Set(), skeletons = new Set();
  character.root.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.skeleton) skeletons.add(object.skeleton); for (const material of [].concat(object.material || [])) { materials.add(material); if (material.map) textures.add(material.map); } });
  for (const item of [...geometries, ...materials, ...textures, ...skeletons]) item.dispose();
}
function normalize(panel, character) {
  panel.actor.clear(); panel.actor.position.set(0, 0, 0); panel.actor.scale.setScalar(1); panel.actor.add(character.root);
  panel.actor.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(character.root), height = box.max.y - box.min.y;
  panel.actor.scale.setScalar(1 / height);
  panel.actor.position.set(-(box.min.x + box.max.x) / 2 / height, -box.min.y / height, -(box.min.z + box.max.z) / 2 / height);
}
function pose() {
  if (!base || !source) return;
  const name = $('pose').value;
  if (name === 'bind') {
    base.bindPose(); source.mixer.stopAllAction();
    const skeletons = new Set(); source.root.traverse(object => { if (object.skeleton) skeletons.add(object.skeleton); });
    for (const skeleton of skeletons) skeleton.pose();
  } else {
    // Reset through the other state because the game adapters cache their state name.
    source.setState(name === 'walk' ? 'idle' : 'walk'); source.setState(name); source.update(0);
    base.play(name === 'idle' ? 'neutral' : 'walk', .2); base.update(0);
  }
  state.pose = name;
}
function layers() {
  if (!base || !dressedRound) return;
  let visible = 0;
  document.querySelectorAll('[data-layer]').forEach(input => {
    const mesh = base.meshes[input.dataset.layer];
    if (mesh) { mesh.visible = input.checked; if (input.checked) visible++; }
  });
  $('candidate-title').textContent = $('candidate').selectedOptions[0].textContent.replace(', dressed', '');
  $('candidate-detail').textContent = `${base.base.d.T} base triangles · ${visible ? visible + ' layers, ' + ($('fit').value ? 'fitted trial' : 'original positions') : 'skin only'}`;
}
function matchMioLayerColours(candidate, reference) {
  // Keep the game shader and its per-face colours, including green trim. Both
  // readers preserve the source GLB triangle order when expanding the mesh.
  let original;
  reference.root.traverse(object => { if (object.isSkinnedMesh) original = object; });
  if (!original || original.geometry.attributes.position.count !== lib.src.mio.pos.length / 3) {
    throw new Error('Mio source topology differs; cannot copy game layer colours.');
  }
  for (const [slot, layer] of Object.entries(layersOf(lib, 'mio', candidate.base))) {
    const mesh = candidate.meshes[slot]; if (!mesh) continue;
    for (const key of ['color', 'useTex', 'tint']) {
      const attribute = original.geometry.getAttribute(key), width = attribute.itemSize;
      const values = new Float32Array(layer.tris.length * 3 * width);
      layer.tris.forEach((triangle, index) => values.set(attribute.array.subarray(triangle * 3 * width, (triangle + 1) * 3 * width), index * 3 * width));
      mesh.geometry.setAttribute(key, new THREE.BufferAttribute(values, width));
    }
    mesh.material.dispose(); mesh.material = original.material.clone();
    mesh.material.onBeforeCompile = original.material.onBeforeCompile;
    mesh.material.side = THREE.DoubleSide;
  }
}
async function rebuild() {
  const token = ++generation, body = $('body').value, choice = $('candidate').value;
  $('fit').disabled = choice !== 'v16-flat';
  if ($('fit').disabled) $('fit').value = '';
  state.ready = false; state.error = null; $('retry').hidden = true; $('status').textContent = 'Loading models…';
  let nextSource, nextBase;
  try {
    lib ||= await loadLibrary(); lib.anims.neutral = 'candidates/idle-neutral.glb'; lib.retargetRest = true;
    // Await both so a later resolution cannot leak a character after an error.
    const visibleLayers = dressedRound ? ['hair', 'top', 'bottom', 'shoes', ...(body === 'eric' ? ['stubble'] : [])] : [];
    const baseId = `clean-${body}-${choice.split('-')[0]}`;
    const fit = dressedRound && $('fit').value ? `${baseId}-${$('fit').value}-layers` : null;
    const results = await Promise.allSettled([body === 'mio' ? loadMio({ height: 1 }) : loadEric({ height: 1 }), dressed(lib, body, { base: baseId, height: 1, layers: visibleLayers, fit })]);
    if (results[0].status === 'fulfilled') nextSource = results[0].value;
    if (results[1].status === 'fulfilled') nextBase = results[1].value;
    const failure = results.find(result => result.status === 'rejected'); if (failure) throw failure.reason;
    if (dressedRound && body === 'mio') matchMioLayerColours(nextBase, nextSource);
    if (dead || token !== generation) { disposeSource(nextSource); disposeCharacter(nextBase); return; }
    disposeSource(source); disposeCharacter(base); source = nextSource; base = nextBase;
    base.meshes.body.material.flatShading = !choice.endsWith('smooth'); base.meshes.body.material.needsUpdate = true;
    source.setState('idle'); source.update(0); base.play('neutral', 0); base.update(0);
    normalize(panels[0], source); normalize(panels[1], base); pose();
    $('stubble-control').hidden = body !== 'eric';
    Object.assign(state, { ready: true, body, candidate: choice, source, base });
    $('reference-detail').textContent = `${body === 'mio' ? 'Mio' : 'Eric'}: game materials and model`;
    $('candidate-title').textContent = $('candidate').selectedOptions[0].textContent;
    $('candidate-detail').textContent = `${base.base.d.T} base triangles · ${dressedRound ? 'original source layers' : 'skin-only base'}`;
    layers();
    $('status').textContent = '';
  } catch (error) {
    disposeSource(nextSource); disposeCharacter(nextBase);
    if (token === generation) { state.error = error.message; $('status').textContent = 'Could not load the comparison: ' + error.message; $('retry').hidden = false; }
  }
}
$('body').onchange = rebuild; $('candidate').onchange = rebuild; $('retry').onclick = rebuild;
$('fit').onchange = rebuild;
document.querySelectorAll('[data-layer]').forEach(input => { input.onchange = layers; });
for (const id of ['bare', 'clothed']) $(id).onclick = () => {
  document.querySelectorAll('[data-layer]').forEach(input => { input.checked = id === 'clothed'; }); layers();
};
$('pose').onchange = pose; $('light').onchange = lighting;
$('pause').onclick = () => { paused = !paused; $('pause').setAttribute('aria-pressed', String(paused)); $('pause').textContent = paused ? 'Play' : 'Pause'; };
for (const [id, angle] of [['front', 0], ['side', Math.PI / 2], ['back', Math.PI]]) $(id).onclick = () => { yaw = angle; elevation = .04; };
$('zoom').oninput = () => { distance = Number($('zoom').value); };
let last = performance.now();
function frame(now) {
  if (dead) return;
  const dt = Math.min((now - last) / 1000, .05); last = now;
  if (!document.hidden) {
    if (!paused && $('pose').value !== 'bind') { source?.update(dt); base?.update(dt); }
    for (const panel of panels) { panel.camera.position.set(Math.sin(yaw) * Math.cos(elevation) * distance, .5 + Math.sin(elevation) * distance, Math.cos(yaw) * Math.cos(elevation) * distance); panel.camera.lookAt(0, .5, 0); panel.renderer.render(panel.scene, panel.camera); }
  }
  requestAnimationFrame(frame);
}
addEventListener('pagehide', () => {
  dead = true; generation++; disposeSource(source); disposeCharacter(base);
  for (const panel of panels) { panel.observer.disconnect(); panel.floor.geometry.dispose(); panel.floor.material.dispose(); panel.lights.traverse(object => object.shadow?.dispose()); panel.renderer.dispose(); }
  office.scene.traverse(object => { object.geometry?.dispose(); for (const material of [].concat(object.material || [])) material.dispose(); object.shadow?.dispose(); });
});
if (matchMedia('(prefers-reduced-motion: reduce)').matches) $('pause').click();
lighting(); requestAnimationFrame(frame); rebuild();
