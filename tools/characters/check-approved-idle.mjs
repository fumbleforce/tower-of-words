// Isolated runtime idle loop and transitions, including Mio's foot-correction blend.
import fs from 'node:fs';
import { withBrowserJob } from '../lib/browser-job.mjs';
import { fileURLToPath } from 'node:url';
const base = process.env.BASE_URL || 'http://127.0.0.1:8771/';
const output = fileURLToPath(new URL('../../game3d/shots/approved-idle/', import.meta.url));
fs.mkdirSync(output, { recursive: true });
await withBrowserJob('check-approved-idle', async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 860 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/approved-idle-check', (r) =>
    r.fulfill({
      contentType: 'text/html',
      body: `<style>body{margin:0;background:#e8edf0}canvas{display:block}</style><script type="importmap">{"imports":{"three":"${base}game3d/vendor/three/three.module.js","three/addons/":"${base}game3d/vendor/"}}</script>`,
    }),
  );
  await page.goto(base + 'approved-idle-check');
  const report = await page.evaluate(async (base) => {
    const window = globalThis,
      document = window.document,
      { innerWidth, innerHeight } = window;
    const T = await import('three'),
      { loadEric, loadMeshy } = await import(base + 'game3d/js/avatar.js'),
      { loadMio } = await import(base + 'game3d/js/mio.js');
    const actors = await Promise.all([loadEric(), loadMio()]);
    window.actors = actors;
    const scene = new T.Scene();
    scene.background = new T.Color('#e8edf0');
    scene.add(new T.HemisphereLight(0xffffff, 0x6b788c, 3));
    const sun = new T.DirectionalLight(0xffffff, 2);
    sun.position.set(3, 5, 4);
    scene.add(sun);
    actors.forEach((a, i) => {
      a.root.position.x = (i - 0.5) * 1.15;
      scene.add(a.root);
    });
    const renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    document.body.appendChild(renderer.domElement);
    const camera = new T.PerspectiveCamera(32, innerWidth / innerHeight, 0.01, 20);
    camera.position.set(0, 0.9, 3.6);
    camera.lookAt(0, 0.62, 0);
    window.draw = () => renderer.render(scene, camera);
    window.resize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.position.z = window.innerWidth < 500 ? 8.2 : 3.6;
      camera.updateProjectionMatrix();
      window.draw();
    };
    const result = [];
    const sharedRig = await loadMeshy('mori');
    for (const a of [...actors, sharedRig]) {
      const bones = [];
      a.model.traverse((o) => {
        if (o.isBone) bones.push(o);
      });
      const snapshot = () => {
        a.root.updateMatrixWorld(true);
        return bones.map((b) => b.getWorldPosition(new T.Vector3()));
      };
      const idleBounds = new Map(bones.map((b) => [b, new T.Box3()]));
      for (let frame = 0; frame < 240; frame++) {
        a.update(1 / 60);
        snapshot().forEach((p, i) => idleBounds.get(bones[i]).expandByPoint(p));
      }
      const travel = (name) => {
        const b = bones.find((b) => b.name.toLowerCase().endsWith(name.toLowerCase()));
        return idleBounds.get(b).getSize(new T.Vector3()).length();
      };
      const stats = {
        id: a.id || 'mio',
        height: a.height,
        headTravel: travel('Head'),
        leftFootTravel: travel('LeftFoot'),
        rightFootTravel: travel('RightFoot'),
        transitions: [],
      };
      for (const state of ['walk', 'idle']) {
        const before = snapshot();
        a.setState(state);
        a.update(0);
        const immediate = snapshot();
        let maxStep = 0,
          maxInstant = 0,
          previous = immediate;
        for (let i = 0; i < bones.length; i++) maxInstant = Math.max(maxInstant, before[i].distanceTo(immediate[i]));
        for (let frame = 0; frame < 120; frame++) {
          a.update(1 / 60);
          const now = snapshot();
          now.forEach((p, i) => {
            maxStep = Math.max(maxStep, p.distanceTo(previous[i]));
            if (!Number.isFinite(p.length())) throw Error('Non-finite transform');
          });
          previous = now;
        }
        stats.transitions.push({ state, maxInstant, maxStep });
      }
      if (
        stats.headTravel < 0.003 ||
        stats.leftFootTravel > 1e-5 ||
        stats.rightFootTravel > 1e-5 ||
        stats.transitions.some((t) => t.maxInstant > 0.01 || t.maxStep > 0.12)
      )
        throw Error(JSON.stringify(stats));
      result.push(stats);
    }
    window.draw();
    return result;
  }, base);
  await page.screenshot({ path: output + 'front.png' });
  await page.evaluate(() => {
    const { actors, draw } = globalThis;
    actors.forEach((a) => a.setState('walk'));
    for (let f = 0; f < 18; f++) actors.forEach((a) => a.update(1 / 60));
    draw();
  });
  await page.screenshot({ path: output + 'walk.png' });
  await page.evaluate(() => {
    const { actors, draw } = globalThis;
    actors.forEach((a) => a.setState('idle'));
    for (let f = 0; f < 30; f++) actors.forEach((a) => a.update(1 / 60));
    draw();
  });
  await page.screenshot({ path: output + 'return.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => globalThis.resize());
  await page.screenshot({ path: output + 'phone.png' });
  if (errors.length) throw Error(errors.join('\n'));
  fs.writeFileSync(output + 'motion.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
});
