// Render identical bird poses through the old and new pipelines, then compare GPU pixels and save both sheets.
// BEFORE=game3d AFTER=.claude/worktrees/<name>/game3d OUT=/tmp/creature-parity node game3d/tools/perf/creature-parity.mjs
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const before = process.env.BEFORE || 'game3d';
const after = process.env.AFTER;
if (!after || after === before) throw Error('AFTER must name the other checkout to compare');
const out = process.env.OUT || '/tmp/creature-parity';
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('creature-pixel-parity', async browser => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/perf-creature-fixture', route => route.fulfill({ contentType: 'text/html', body: `
    <html><head><meta charset="utf-8"><script type="importmap">{"imports":{"three":"/game3d/vendor/three/three.module.js","three/addons/":"/game3d/vendor/"}}</script>
    <style>body{margin:0;background:#e5e8ec;font:16px sans-serif}h1{font-size:20px;margin:12px}canvas{display:block}.label{position:absolute;pointer-events:none;color:#303640}</style>
    </head><body><h1>Bird rendering: folded · half folded · wings up · wings down</h1></body></html>` }));
  await page.goto('http://127.0.0.1:8771/perf-creature-fixture');
  for (const [label, base] of [['before', before], ['after', after]]) {
    const result = await page.evaluate(async ({ label, base }) => {
      const THREE = await import('three');
      const { BirdMeshes } = await import(`/${base}/js/creatures/meshes.js`);
      let renderer = globalThis.fixtureRenderer;
      if (!renderer) {
        renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
        renderer.setSize(1280, 880); renderer.setPixelRatio(1);
        document.body.append(renderer.domElement); globalThis.fixtureRenderer = renderer;
      }
      const scene = new THREE.Scene(); scene.background = new THREE.Color('#e5e8ec');
      scene.add(new THREE.HemisphereLight(0xffffff, 0x687080, 2));
      const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(2, 3, 4); scene.add(light);
      const camera = new THREE.PerspectiveCamera(32, 320 / 220, 0.01, 10);
      camera.position.set(1, 0.7, 1.5); camera.lookAt(0, 0.08, 0);
      const kinds = ['pigeon', 'sparrow', 'crow', 'gull'];
      const poses = [[1, 0], [0.5, 0.3], [0, 1], [0, -1]];
      renderer.setScissorTest(true);
      for (let row = 0; row < kinds.length; row++) for (let col = 0; col < poses.length; col++) {
        const flock = new BirdMeshes(kinds[row], 2, 1.4);
        const [fold, flap] = poses[col];
        flock.pose(1, { p: new THREE.Vector3(), yaw: -0.25, pitch: 0.15, roll: 0.1, fold, flap, size: 1 });
        flock.commit(true); scene.add(flock.group);
        renderer.setViewport(col * 320, (3 - row) * 220, 320, 220);
        renderer.setScissor(col * 320, (3 - row) * 220, 320, 220);
        renderer.render(scene, camera);
        scene.remove(flock.group);
        if (label === 'before') {
          const el = document.createElement('div'); el.className = 'label'; el.textContent = kinds[row];
          el.style.cssText = `left:${col * 320 + 12}px;top:${row * 220 + 57}px`; document.body.append(el);
        }
        flock.group.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.skeleton?.dispose(); } });
        flock.body.material.dispose();
      }
      const gl = renderer.getContext(), pixels = new Uint8Array(1280 * 880 * 4);
      gl.readPixels(0, 0, 1280, 880, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      if (label === 'before') { globalThis.referencePixels = pixels; return { reference: true }; }
      let changed = 0, substantial = 0, maxChannelDelta = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        let delta = 0;
        for (let c = 0; c < 3; c++) delta = Math.max(delta, Math.abs(pixels[i + c] - globalThis.referencePixels[i + c]));
        if (delta) changed++; if (delta > 3) substantial++; maxChannelDelta = Math.max(maxChannelDelta, delta);
      }
      return { pixels: pixels.length / 4, changed, substantial, maxChannelDelta,
        substantialFraction: substantial / (pixels.length / 4) };
    }, { label, base });
    await page.screenshot({ path: path.join(out, `${label}.png`) });
    console.log(label, JSON.stringify(result));
    if (label === 'after') {
      fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ before, after, ...result, errors }, null, 2) + '\n');
      if (result.substantialFraction > 0.001) throw Error('Bird poses differ in more than 0.1% of rendered pixels');
    }
  }
  const motion = await page.evaluate(async ({ before, after }) => {
    const THREE = await import('three');
    const oldModule = await import(`/${before}/js/scenes/outdoor/pigeons.js`);
    const newModule = await import(`/${after}/js/scenes/outdoor/pigeons.js`);
    const oldRoot = new THREE.Group(), newRoot = new THREE.Group();
    const oldFlock = oldModule.pigeons(oldRoot, [0, 0]);
    const newFlock = newModule.pigeons(newRoot, [0, 0]);
    const states = new Set(), point = new THREE.Vector3(), matrix = new THREE.Matrix4();
    let returns = 0, previous = 'ground';
    for (let step = 0; step < 1200; step++) {
      const state = newFlock.state().flock;
      const player = state === 'ground' ? { x: 0, z: 0 } : { x: 100, z: 100 };
      if (state === 'away') { oldFlock.hurry(); newFlock.hurry(); }
      oldFlock.update(0.1, step / 10, player); newFlock.update(0.1, step / 10, player);
      const next = newFlock.state().flock; states.add(next);
      if (next === 'ground' && previous !== 'ground') returns++;
      previous = next;
      if (JSON.stringify(oldFlock.state()) !== JSON.stringify(newFlock.state())) throw Error('Flock behavior changed');
      for (let part = 0; part < oldRoot.children.length; part++) {
        const oldMesh = oldRoot.children[part], mesh = newRoot.children[part];
        if (oldMesh.instanceMatrix.array.some((value, i) => value !== mesh.instanceMatrix.array[i]))
          throw Error('Pigeon pose changed');
        let live = 0;
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, matrix);
          if (matrix.determinant() === 0) continue;
          live++;
          if (!mesh.visible) throw Error('Visible bird hidden');
          const positions = mesh.geometry.attributes.position;
          for (let vertex = 0; vertex < positions.count; vertex++) {
            point.fromBufferAttribute(positions, vertex).applyMatrix4(matrix);
            if (point.distanceTo(mesh.boundingSphere.center) > mesh.boundingSphere.radius + 1e-5)
              throw Error('Moving pigeon leaves its culling sphere');
          }
        }
        if (mesh.visible !== (live > 0)) throw Error('Empty bird part still drawn');
      }
    }
    if (returns < 2 || !states.has('away') || !states.has('landing')) throw Error('Flight/return cycles incomplete');
    return { simulatedSeconds: 120, returns, states: [...states], identicalMatrices: true, allVerticesInsideBounds: true };
  }, { before, after });
  fs.writeFileSync(path.join(out, 'motion.json'), JSON.stringify(motion, null, 2) + '\n');
  console.log('motion', JSON.stringify(motion));
  if (errors.length) throw Error(errors.join('\n'));
}, { timeoutMs: 120000 });
