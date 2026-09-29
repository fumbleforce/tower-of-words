import * as THREE from 'three';
import { loadLibrary, buildCharacter, SLOTS } from './recipe.js';
import { disposeCharacter } from './dispose.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const round3 = params.get('round') === '3';
const view = { yaw: 0, elevation: .08, distance: 3.2 };
const state = window.__comparison = {
  ready: false, loading: true, body: params.get('body') === 'eric' ? 'eric' : 'mio',
  baseline: params.get('baseline') === 'held' ? 'held' : round3 ? 'previous' : 'source', motion: 'idle',
  paused: matchMedia('(prefers-reduced-motion: reduce)').matches,
  currentAction: {}, characters: null, view, retargetRest: false, error: null,
};
const events = new AbortController();
let lib, renderer, observer, generation = 0, dead = false, failedBody, drag, last = performance.now();
const panels = {};
$('body').value = state.body;
$('previous-idle').hidden = !round3;
$('baseline').value = state.baseline;
$('review-link').href = `/bible/#review/creator-idle-neutral-${round3 ? '3' : '2'}`;
$('candidate-title').textContent = round3 ? 'Relaxed idle candidate' : 'Neutral idle candidate';

function status(message, error = false) {
  $('status').textContent = message;
  $('status').dataset.error = String(error);
}

function describe() {
  $('original-title').textContent = state.baseline === 'previous' ? 'Previous neutral idle'
    : state.baseline === 'held' ? 'Current held idle' : 'Original idle';
  $('original-caption').textContent = state.motion === 'walk' ? 'Walking with the original walk clip.'
    : state.baseline === 'previous' ? 'Earlier breathing loop, with arms held outward.'
    : state.baseline === 'held' ? 'Frozen at 0.4 seconds, as in the creator.' : 'Full source clip, including its turns.';
  $('candidate-caption').textContent = state.motion === 'walk' ? 'Walking with the same walk clip.'
    : round3 ? 'Lowered arms, stronger breathing and sway.' : 'Four-second breathing loop.';
  $('play').textContent = state.paused ? 'Play animation' : 'Pause animation';
  $('walk').setAttribute('aria-pressed', String(state.motion === 'walk'));
  $('idle').setAttribute('aria-pressed', String(state.motion === 'idle'));
  state.currentAction = {
    original: state.motion === 'walk' ? 'walk' : state.baseline === 'previous' ? 'previous'
      : state.baseline === 'held' ? 'idle' : 'source',
    candidate: state.motion === 'walk' ? 'walk' : 'neutral',
  };
}

function applyMotion(restart = false) {
  describe();
  if (!state.characters) return;
  for (const [side, character] of Object.entries(state.characters)) {
    if (restart) character.bindPose();
    character.play(state.currentAction[side], restart ? 0 : .2);
    character.update(0);
    character.root.updateMatrixWorld(true);
  }
}

function disposePair(pair) {
  for (const character of Object.values(pair || {})) disposeCharacter(character);
}

async function rebuild() {
  const token = ++generation, body = $('body').value;
  state.loading = true; state.ready = false; state.error = null;
  $('retry').hidden = true;
  status(`Loading ${body === 'eric' ? 'Eric' : 'Mio'}…`);
  const recipe = { body, height: 1, parts: Object.fromEntries(SLOTS.map(slot => [slot, `${body}-${slot}`])) };
  const results = await Promise.allSettled([buildCharacter(lib, recipe), buildCharacter(lib, recipe)]);
  const built = results.filter(result => result.status === 'fulfilled').map(result => result.value);
  if (token !== generation || dead) { built.forEach(disposeCharacter); return; }
  const failure = results.find(result => result.status === 'rejected');
  if (failure) {
    built.forEach(disposeCharacter);
    failedBody = body; state.loading = false; state.ready = Boolean(state.characters);
    state.error = String(failure.reason?.message || failure.reason);
    if (state.characters) $('body').value = state.body;
    status(`Could not load ${body}: ${state.error}${state.characters ? `. Still showing ${state.body}.` : ''}`, true);
    $('retry').hidden = false;
    return;
  }
  disposePair(state.characters);
  state.characters = { original: results[0].value, candidate: results[1].value };
  for (const [side, character] of Object.entries(state.characters)) panels[side].scene.add(character.root);
  state.body = body; state.loading = false; state.ready = true; failedBody = null;
  applyMotion(true);
  status(state.paused ? 'Paused. Press Play animation to start both views.' : '');
}

function makePanel(side) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#e9ecf1');
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa3b5, 2));
  const light = new THREE.DirectionalLight(0xffffff, 1.6); light.position.set(1.2, 2.5, 2.2); scene.add(light);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(.65, 48), new THREE.MeshLambertMaterial({ color: '#cfd5df' }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.004; scene.add(floor);
  return { scene, floor, element: $(`${side}-view`), camera: new THREE.PerspectiveCamera(24, 1, .01, 50) };
}

function resize() {
  renderer.setSize($('stage').clientWidth, $('stage').clientHeight, false);
}

function draw(now) {
  const dt = Math.min(Math.max((now - last) / 1000, 0), .05); last = now;
  if (dead || document.hidden) return;
  if (!state.paused) for (const character of Object.values(state.characters || {})) character.update(dt);
  const stage = $('stage').getBoundingClientRect();
  renderer.setScissorTest(false); renderer.clear(); renderer.setScissorTest(true);
  for (const panel of Object.values(panels)) {
    const rect = panel.element.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    const x = rect.left - stage.left, y = stage.bottom - rect.bottom;
    const camera = panel.camera;
    camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix();
    // Keep both bodies inside narrow phone panels without changing their scale.
    const distance = view.distance * Math.max(1, .6 / camera.aspect);
    camera.position.set(Math.sin(view.yaw) * Math.cos(view.elevation) * distance,
      .5 + Math.sin(view.elevation) * distance, Math.cos(view.yaw) * Math.cos(view.elevation) * distance);
    camera.lookAt(0, .5, 0);
    renderer.setViewport(x, y, rect.width, rect.height); renderer.setScissor(x, y, rect.width, rect.height);
    renderer.render(panel.scene, camera);
  }
}

function setDistance(distance) {
  view.distance = THREE.MathUtils.clamp(distance, 1.8, 5.5);
  $('zoom').value = String(view.distance);
}

function connectControls() {
  $('body').onchange = () => { if (lib) void rebuild(); };
  $('baseline').onchange = () => { state.baseline = $('baseline').value; applyMotion(true); };
  $('play').onclick = () => { state.paused = !state.paused; describe(); if (!state.error && !state.loading) status(''); };
  for (const motion of ['walk', 'idle']) $(motion).onclick = () => { state.motion = motion; applyMotion(); };
  $('restart').onclick = () => applyMotion(true);
  for (const [id, yaw] of [['front', 0], ['side', Math.PI / 2], ['back', Math.PI]]) $(id).onclick = () => {
    view.yaw = yaw; view.elevation = .08;
  };
  $('zoom').oninput = () => setDistance(Number($('zoom').value));
  $('retry').onclick = () => { if (failedBody) $('body').value = failedBody; void initialise(); };
  const canvas = renderer.domElement;
  const listen = (event, handler, options = {}) => canvas.addEventListener(event, handler, { ...options, signal: events.signal });
  listen('pointerdown', event => {
    if (event.button !== 0) return;
    drag = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
    canvas.setPointerCapture(event.pointerId);
  });
  listen('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointer) return;
    view.yaw -= (event.clientX - drag.x) * .01;
    view.elevation = THREE.MathUtils.clamp(view.elevation + (event.clientY - drag.y) * .005, -.25, 1.2);
    drag.x = event.clientX; drag.y = event.clientY;
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(event, () => { drag = null; });
  listen('wheel', event => { event.preventDefault(); setDistance(view.distance + event.deltaY * .003); }, { passive: false });
  listen('keydown', event => {
    if (event.key === 'ArrowLeft') view.yaw += .12;
    else if (event.key === 'ArrowRight') view.yaw -= .12;
    else if (event.key === 'ArrowUp') view.elevation = Math.min(1.2, view.elevation + .08);
    else if (event.key === 'ArrowDown') view.elevation = Math.max(-.25, view.elevation - .08);
    else if (event.key === '+' || event.key === '=') setDistance(view.distance - .2);
    else if (event.key === '-') setDistance(view.distance + .2);
    else if (event.key === 'Home') { view.yaw = 0; view.elevation = .08; setDistance(3.2); }
    else return;
    event.preventDefault();
  });
}

function cleanup() {
  dead = true; generation++; state.ready = false; events.abort(); observer?.disconnect();
  renderer?.setAnimationLoop(null); disposePair(state.characters); state.characters = null;
  for (const panel of Object.values(panels)) { panel.floor.geometry.dispose(); panel.floor.material.dispose(); }
  for (const source of Object.values(lib?.src || {})) source.tex.dispose();
  renderer?.dispose();
}

async function initialise() {
  if (dead) return;
  $('retry').hidden = true; state.error = null; state.loading = true;
  try {
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor('#e9ecf1'); renderer.domElement.tabIndex = 0;
      renderer.domElement.setAttribute('aria-label', 'Both character views. Arrow keys orbit; plus and minus zoom.');
      $('stage').prepend(renderer.domElement);
      panels.original = makePanel('original'); panels.candidate = makePanel('candidate');
      observer = new ResizeObserver(resize); observer.observe($('stage')); resize();
      connectControls(); renderer.setAnimationLoop(draw);
    }
    if (!lib) {
      status('Loading the characters…');
      lib = await loadLibrary();
      if (dead) {
        for (const source of Object.values(lib.src)) source.tex.dispose();
        return;
      }
      // The alias plays the original file without play('idle')'s 0.4-second hold.
      lib.anims.source = lib.anims.idle;
      lib.anims.previous = 'candidates/idle-neutral.glb';
      lib.anims.neutral = `candidates/idle-neutral${round3 ? '-3' : ''}.glb`;
      lib.retargetRest = false;
    }
    if (!dead) await rebuild();
  } catch (error) {
    if (dead) return;
    state.error = String(error.message || error); state.loading = false; state.ready = Boolean(state.characters);
    status(`Could not load the comparison: ${state.error}`, true); $('retry').hidden = false;
  }
}

$('retry').onclick = () => void initialise();
addEventListener('pagehide', cleanup, { once: true });
describe();
void initialise();
