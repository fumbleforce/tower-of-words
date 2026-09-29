import * as THREE from 'three';
import { loadLibrary, buildCharacter, clipsFor } from '../recipe.js';
import { dressed, layerMesh } from './base.js';
import { disposeCharacter } from '../dispose.js';

// Both meshes stay in the loader's source-normalized bind coordinates. In
// particular, never normalize their separate bounding boxes to make them fit.
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
if (/^[a-z0-9-]+$/.test(params.get('review') || '')) $('review-link').href = '/bible/#review/' + params.get('review');
if (['mio', 'eric'].includes(params.get('body'))) $('body').value = params.get('body');
$('version').value = params.get('version') || 'v16';
if (params.get('fit') === 'fit3' || (!params.has('fit') && /^source\d+$/.test($('version').value))) $('fit').value = 'fit3';
if (['neutral', 'walk'].includes(params.get('motion'))) $('motion').value = params.get('motion');
if (params.get('colours') === 'original') $('colours').value = 'original';
if (params.get('source') === '0') { $('show-source').checked = false; $('candidate-opacity').value = '1'; }
const state = window.__creatorOverlay = { ready: false };
const host = $('viewport');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0, 0);
host.append(renderer.domElement);
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .01, 20);
const scenes = [new THREE.Scene(), new THREE.Scene()];
for (const scene of scenes) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x768391, 2));
  const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(2, 3, 4); scene.add(light);
}
const targets = scenes.map(() => new THREE.WebGLRenderTarget(1, 1));
const composite = new THREE.Scene();
const compositeMaterial = new THREE.ShaderMaterial({
  uniforms: { source: { value: targets[0].texture }, candidate: { value: targets[1].texture }, sourceAlpha: { value: .65 }, candidateAlpha: { value: .65 } },
  vertexShader: 'varying vec2 screenUV; void main(){screenUV=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader: `uniform sampler2D source,candidate; uniform float sourceAlpha,candidateAlpha; varying vec2 screenUV;
    void main(){vec4 a=texture2D(source,screenUV),b=texture2D(candidate,screenUV);
      float wa=a.a*sourceAlpha,wb=b.a*candidateAlpha,total=wa+wb;
      vec3 blended=(a.rgb*wa+b.rgb*wb)/max(total,.00001);
      vec3 colour=mix(vec3(.82,.855,.89),blended,min(total,1.));
      gl_FragColor=vec4(colour,1.);
      #include <colorspace_fragment>
    }`,
  depthTest: false, depthWrite: false,
});
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compositeMaterial); composite.add(quad);
let library, original, candidate, request = 0, dead = false, pendingFrame = false;
let yaw = 0, elevation = 0, playing = false, lastFrame = null;
let motionActions = [], motionTime = 0, duration = 0;
const posedVertex = new THREE.Vector3();
const centre = new THREE.Vector3(0, .5, 0);
const originalMaterials = new Map();
function disposeModel(model) {
  if (!model) return;
  for (const mesh of Object.values(model.meshes)) {
    const material = originalMaterials.get(mesh);
    if (material && mesh.material !== material) mesh.material.dispose();
    if (material) { mesh.material = material; originalMaterials.delete(mesh); }
  }
  disposeCharacter(model);
}
function render(now) {
  pendingFrame = false;
  if (playing && state.ready) {
    if (lastFrame !== null) motionTime = (motionTime + Math.min((now - lastFrame) / 1000, .1)) % duration;
    lastFrame = now; applyTime();
  }
  if (dead) return;
  const aspect = host.clientWidth / host.clientHeight;
  const face = $('focus').value === 'face';
  if (face && state.ready) updateFaceBox();
  if (face && state.faceBox) state.faceBox.getCenter(centre);
  else centre.set(0, .5, 0);
  const size = state.faceBox?.getSize(new THREE.Vector3());
  const span = (face && size ? Math.max(size.y, size.x / aspect) * 1.3 : 1.18) / Number($('zoom').value);
  camera.left = -span * aspect / 2; camera.right = span * aspect / 2;
  camera.top = span / 2; camera.bottom = -span / 2;
  camera.up.set(0, Math.abs(elevation) > 1.56 ? 0 : 1, Math.abs(elevation) > 1.56 ? -1 : 0);
  camera.position.set(Math.sin(yaw) * Math.cos(elevation), Math.sin(elevation), Math.cos(yaw) * Math.cos(elevation)).multiplyScalar(3).add(centre);
  camera.lookAt(centre); camera.updateProjectionMatrix();
  for (let i = 0; i < scenes.length; i++) { renderer.setRenderTarget(targets[i]); renderer.clear(); renderer.render(scenes[i], camera); }
  for (const name of ['source', 'candidate']) {
    const opacity = Number($(name + '-opacity').value);
    compositeMaterial.uniforms[name + 'Alpha'].value = $('show-' + name).checked ? opacity : 0;
    $(name + '-value').textContent = Math.round(opacity * 100) + '%';
  }
  renderer.setRenderTarget(null); renderer.render(composite, camera);
  if (playing && state.ready) invalidate();
}
function invalidate() { if (!dead && !pendingFrame) { pendingFrame = true; requestAnimationFrame(render); } }
function updateFaceBox() {
  const mesh = original.meshes.original;
  state.faceBox.makeEmpty();
  for (const triangle of state.faceTriangles) for (let k = 0; k < 3; k++) {
    mesh.getVertexPosition(triangle * 3 + k, posedVertex).applyMatrix4(mesh.matrixWorld);
    state.faceBox.expandByPoint(posedVertex);
  }
}
function playback(active) {
  playing = active && duration > 0 && state.ready;
  lastFrame = null;
  $('play').textContent = playing ? 'Pause' : 'Play';
  $('play').setAttribute('aria-pressed', String(playing));
  state.playing = playing;
  invalidate();
}
function applyTime() {
  for (let i = 0; i < motionActions.length; i++) {
    const model = [original, candidate][i], action = motionActions[i];
    action.time = motionTime;
    model.mixer.update(0);
    model.root.updateMatrixWorld(true); model.skeleton.update();
  }
  $('time').value = motionTime;
  $('time-value').textContent = `${motionTime.toFixed(3)} / ${duration.toFixed(3)} s`;
  Object.assign(state, { motion: $('motion').value, time: motionTime, duration });
}
function pose() {
  playback(false); motionActions = []; motionTime = 0; duration = 0;
  if (!state.ready) return;
  const clip = state.clips[$('motion').value];
  for (const model of [original, candidate]) {
    model.bindPose();
    if (clip) {
      const action = model.mixer.clipAction(clip);
      action.reset().setEffectiveWeight(1).play(); action.paused = true;
      motionActions.push(action);
    }
    model.root.updateMatrixWorld(true); model.skeleton.update();
  }
  duration = clip?.duration || 0;
  $('time').max = duration; $('time').disabled = $('play').disabled = !duration;
  applyTime(); invalidate();
}
function resize() {
  renderer.setSize(host.clientWidth, host.clientHeight, false);
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  for (const target of targets) target.setSize(size.x, size.y);
  invalidate();
}
const observer = new ResizeObserver(resize); observer.observe(host);
function surfaces() {
  for (const [model, colour, wire] of [[original, '#00bed4', 'wire-source'], [candidate, '#e94198', 'wire-candidate']]) {
    if (!model) continue;
    for (const mesh of Object.values(model.meshes)) {
      const sourceMaterial = originalMaterials.get(mesh);
      if (mesh.material !== sourceMaterial) mesh.material.dispose();
      mesh.material = $('colours').value === 'diagnostic' ? new THREE.MeshLambertMaterial({ color: model === candidate && mesh !== candidate.meshes.body ? '#788697' : colour, side: THREE.DoubleSide, flatShading: true }) : sourceMaterial;
      mesh.material.wireframe = $(wire).checked;
    }
  }
  invalidate();
}
function layers() {
  document.querySelectorAll('[data-layer]').forEach(input => {
    if (candidate?.meshes[input.dataset.layer]) candidate.meshes[input.dataset.layer].visible = input.checked;
  });
  invalidate();
}
async function load() {
  const token = ++request, body = $('body').value, version = $('version').value.trim(), fit = $('fit').value;
  playback(false); state.ready = false; state.error = null; window.__done = false; window.__err = null;
  $('status').textContent = 'Loading models…';
  let nextOriginal, nextCandidate;
  try {
    if (!/^[a-zA-Z0-9-]+$/.test(version)) throw new Error('Use a version name such as v16.');
    library ||= await loadLibrary();
    library.retargetRest = true; library.anims.neutral = 'candidates/idle-neutral.glb';
    const baseId = `clean-${body}-${version}`;
    const results = await Promise.allSettled([
      buildCharacter(library, { body, parts: {}, height: 1 }),
      dressed(library, body, { base: baseId, height: 1, layers: ['hair', 'top', 'bottom', 'shoes', 'stubble'], fit: fit ? `${baseId}-${fit}-layers` : null }),
    ]);
    if (results[0].status === 'fulfilled') nextOriginal = results[0].value;
    if (results[1].status === 'fulfilled') nextCandidate = results[1].value;
    const failure = results.find(result => result.status === 'rejected'); if (failure) throw failure.reason;
    const source = library.src[body];
    const clips = await clipsFor(library, source);
    const mesh = layerMesh(library, nextOriginal, body, 'complete-original-source', Array.from({ length: source.T }, (_, index) => index), [255, 255, 255]);
    nextOriginal.rig.add(mesh); nextOriginal.meshes.original = mesh;
    nextOriginal.bindPose(); nextCandidate.bindPose();
    if (dead || token !== request) { disposeModel(nextOriginal); disposeModel(nextCandidate); return; }
    disposeModel(original); disposeModel(candidate);
    original = nextOriginal; candidate = nextCandidate;
    scenes[0].add(original.root); scenes[1].add(candidate.root);
    for (const model of [original, candidate]) for (const item of Object.values(model.meshes)) originalMaterials.set(item, item.material);
    original.root.updateMatrixWorld(true); candidate.root.updateMatrixWorld(true);
    const faceBox = new THREE.Box3();
    for (const triangle of library.byId[body + '-head'].tris) for (let k = 0; k < 3; k++) faceBox.expandByPoint(new THREE.Vector3().fromArray(source.pos, (triangle * 3 + k) * 3));
    Object.assign(state, { ready: true, body, version, fit, original, candidate, camera, faceBox, faceTriangles: library.byId[body + '-head'].tris, clips, sourcePositions: source.pos });
    $('fit').options[1].textContent = /^source\d+$/.test(version) ? 'Source fitted layers' : 'fit3, rejected trial';
    $('version-note').textContent = /^source\d+$/.test(version) ? 'Source-derived body candidate; its fitted layers belong to this version.' : 'v16 is the rejected baseline. Enter a later exported version to inspect it.';
    $('stubble-label').hidden = !candidate.meshes.stubble;
    $('candidate-label').textContent = `Magenta: ${version}${version === 'v16' ? ', rejected' : ', candidate'}`;
    const sourceBox = new THREE.Box3().setFromBufferAttribute(mesh.geometry.attributes.position);
    const baseBox = new THREE.Box3().setFromBufferAttribute(candidate.meshes.body.geometry.attributes.position);
    const bounds = box => ({ min: box.min.toArray(), max: box.max.toArray() });
    state.bounds = { source: bounds(sourceBox), base: bounds(baseBox),
      delta: { min: baseBox.min.clone().sub(sourceBox.min).toArray(), max: baseBox.max.clone().sub(sourceBox.max).toArray() } };
    const format = values => values.map(value => value.toFixed(4)).join(', ');
    $('alignment').textContent = 'Shared source bind coordinates; no per-model scale or offset. Bounds below come from actual vertex positions.';
    $('bounds').textContent = `Coordinates: x, y, z. Full source includes hair and clothes. Bare base includes hidden scalp/body.\nSource min [${format(state.bounds.source.min)}], max [${format(state.bounds.source.max)}]\nBase min [${format(state.bounds.base.min)}], max [${format(state.bounds.base.max)}]\nBase minus source min [${format(state.bounds.delta.min)}], max [${format(state.bounds.delta.max)}]\nThese extents expose scale/offset differences. Matching extents would not prove matching faces or garment clearance.`;
    $('status').textContent = `${body === 'mio' ? 'Mio' : 'Eric'} source + ${baseId}${fit ? (/^source\d+$/.test(version) ? ', source fitted layers' : ', rejected ' + fit + ' trial') : ', original clothing positions'}.`;
    surfaces(); layers(); pose(); if (params.get('play') === '1') playback(true); window.__done = true;
  } catch (error) {
    if (nextOriginal !== original) disposeModel(nextOriginal);
    if (nextCandidate !== candidate) disposeModel(nextCandidate);
    if (token === request) { state.error = error.message; $('status').textContent = 'Could not load: ' + error.message + '. Candidate exports are local only; see Candidate files below.'; window.__err = error.message; }
  }
}
$('motion').onchange = pose;
$('play').onclick = () => playback(!playing);
$('time').oninput = () => { playback(false); motionTime = Number($('time').value); applyTime(); invalidate(); };
$('load').onclick = load; $('body').onchange = load; $('fit').onchange = load;
$('version').addEventListener('keydown', event => { if (event.key === 'Enter') load(); });
for (const id of ['show-source', 'show-candidate', 'source-opacity', 'candidate-opacity', 'focus', 'zoom']) $(id).oninput = invalidate;
for (const id of ['colours', 'wire-source', 'wire-candidate']) $(id).onchange = surfaces;
document.querySelectorAll('[data-layer]').forEach(input => { input.onchange = layers; });
for (const id of ['bare', 'dressed']) $(id).onclick = () => { document.querySelectorAll('[data-layer]').forEach(input => { input.checked = id === 'dressed'; }); layers(); };
document.querySelectorAll('[data-view]').forEach(button => { button.onclick = () => {
  const view = button.dataset.view; yaw = view === 'side' ? Math.PI / 2 : view === 'back' ? Math.PI : 0; elevation = view === 'top' ? Math.PI / 2 : 0; invalidate();
}; });
let drag;
host.onpointerdown = event => { drag = [event.clientX, event.clientY]; host.setPointerCapture(event.pointerId); };
host.onpointermove = event => {
  if (!drag) return;
  yaw -= (event.clientX - drag[0]) * .01; elevation = THREE.MathUtils.clamp(elevation + (event.clientY - drag[1]) * .01, -1.55, 1.55);
  drag = [event.clientX, event.clientY]; invalidate();
};
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) host.addEventListener(event, () => { drag = null; });
host.onkeydown = event => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
  event.preventDefault(); yaw += event.key === 'ArrowLeft' ? -.1 : event.key === 'ArrowRight' ? .1 : 0;
  elevation = THREE.MathUtils.clamp(elevation + (event.key === 'ArrowUp' ? .1 : event.key === 'ArrowDown' ? -.1 : 0), -1.55, 1.55); invalidate();
} };
addEventListener('pagehide', () => { dead = true; request++; observer.disconnect(); disposeModel(original); disposeModel(candidate); targets.forEach(target => target.dispose()); quad.geometry.dispose(); compositeMaterial.dispose(); renderer.dispose(); });
resize(); load();
