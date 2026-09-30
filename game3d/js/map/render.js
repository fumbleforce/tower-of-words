// Top-down renders of the built places for the map (map/screen.js). Each place is built the way the game builds it
// (game.prepare), then drawn straight down with an orthographic camera into a corner of the game's own canvas and
// copied out at once, so no second WebGL context is needed. The copy is a 2D canvas in the place's local frame,
// north up, covering its map area plus a margin of backdrop.
import * as THREE from 'three';
import { CHUNKS } from '../scenes/island-layout.js';

export const MARGIN = 6; // units of backdrop drawn around a place's view (shown with "Backdrop" on)
const GROUND = '#2b3037';

// one place's render: { canvas, x0, z0, ppu } (x0, z0: the local point at the canvas's top-left; ppu: pixels a unit)
export function renderPlace(game, place, name) {
  const p = CHUNKS[name];
  const renderer = game.renderer;
  const [ax0, ax1, az0, az1] = p.view;
  const x0 = ax0 - MARGIN,
    x1 = ax1 + MARGIN,
    z0 = az0 - MARGIN,
    z1 = az1 + MARGIN;
  const size = renderer.getSize(new THREE.Vector2());
  const dpr = renderer.getPixelRatio();
  // as many pixels as fit in the game canvas, up to 28 device pixels a unit
  const ppu = Math.min(28, (size.x * dpr) / (x1 - x0), (size.y * dpr) / (z1 - z0));
  const w = Math.floor((x1 - x0) * ppu),
    h = Math.floor((z1 - z0) * ppu);
  const cam = new THREE.OrthographicCamera(-(x1 - x0) / 2, (x1 - x0) / 2, (z1 - z0) / 2, -(z1 - z0) / 2, 1, 200);
  cam.up.set(0, 0, -1); // north up
  cam.position.set((x0 + x1) / 2, 80, (z0 + z1) / 2);
  cam.lookAt((x0 + x1) / 2, 0, (z0 + z1) / 2);
  cam.updateMatrixWorld();

  const scene = place.scene;
  const hidden = [game.player?.root, game.mioNpc?.root].filter((o) => o && o.visible && isIn(o, scene));
  hidden.forEach((o) => (o.visible = false));
  const background = scene.background,
    fog = scene.fog;
  scene.background = new THREE.Color(GROUND);
  scene.fog = null;
  const clear = renderer.getClearColor(new THREE.Color()),
    clearAlpha = renderer.getClearAlpha();
  const autoClear = renderer.autoClear;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  try {
    renderer.setRenderTarget(null);
    renderer.autoClear = true;
    renderer.shadowMap.needsUpdate = true;
    // viewport and scissor are in CSS pixels, from the bottom-left corner
    renderer.setViewport(0, 0, w / dpr, h / dpr);
    renderer.setScissor(0, 0, w / dpr, h / dpr);
    renderer.setScissorTest(true);
    renderer.render(scene, cam);
    const gl = renderer.domElement;
    out.getContext('2d').drawImage(gl, 0, gl.height - h, w, h, 0, 0, w, h);
  } finally {
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, size.x, size.y);
    renderer.setScissor(0, 0, size.x, size.y);
    renderer.setClearColor(clear, clearAlpha);
    renderer.autoClear = autoClear;
    renderer.shadowMap.needsUpdate = true;
    scene.background = background;
    scene.fog = fog;
    hidden.forEach((o) => (o.visible = true));
  }
  return { canvas: out, x0, z0, ppu };
}

function isIn(object, scene) {
  for (let o = object; o; o = o.parent) if (o === scene) return true;
  return false;
}

// every placed place, built if it isn't yet; onEach(name, render) as each one is ready
export async function renderAll(game, onEach) {
  const renders = {};
  for (const name of Object.keys(CHUNKS)) {
    try {
      const { place } = await game.prepare(name);
      await new Promise((r) => requestAnimationFrame(r));
      renders[name] = renderPlace(game, place, name);
      onEach?.(name, renders[name]);
    } catch (error) {
      console.warn('map: could not draw', name, error);
    }
  }
  return renders;
}
