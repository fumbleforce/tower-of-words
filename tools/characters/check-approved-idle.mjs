// Isolated runtime idle loop and transitions, including Mio's foot-correction blend.
import fs from 'node:fs';
import { withBrowserJob } from '../lib/browser-job.mjs';
import { fileURLToPath } from 'node:url';
const base = process.env.BASE_URL || 'http://127.0.0.1:8771/';
const output = fileURLToPath(new URL('../../game3d/shots/approved-idle/', import.meta.url));
fs.mkdirSync(output, { recursive: true });
await withBrowserJob('check-approved-idle', async (browser) => {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 860 },
  });
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
    const actors = await Promise.all([loadEric(), loadMio(), loadMeshy('mori')]);
    window.actors = actors;
    const scene = new T.Scene();
    scene.background = new T.Color('#e8edf0');
    scene.add(new T.HemisphereLight(0xffffff, 0x6b788c, 3));
    const sun = new T.DirectionalLight(0xffffff, 2);
    sun.position.set(3, 5, 4);
    scene.add(sun);
    actors.forEach((a, i) => {
      a.root.position.x = (i - 1) * 0.9;
      scene.add(a.root);
    });
    const renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    document.body.appendChild(renderer.domElement);
    const camera = new T.PerspectiveCamera(32, innerWidth / innerHeight, 0.01, 20);
    camera.position.set(0, 0.9, 4.2);
    camera.lookAt(0, 0.62, 0);
    window.draw = () => renderer.render(scene, camera);
    window.resize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.position.z = window.innerWidth < 500 ? 11 : 4.2;
      camera.updateProjectionMatrix();
      window.draw();
    };
    const floor = new T.Mesh(new T.PlaneGeometry(10, 10), new T.MeshLambertMaterial({ color: '#bac3c9' }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor, new T.GridHelper(8, 80, 0x879298, 0xabb6bd));
    window.floorView = () => {
      actors.forEach((actor, i) => {
        actor.root.visible = i === 1;
      });
      camera.position.set(1.1, 0.14, 0);
      camera.lookAt(0, 0.15, 0);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const result = [];
    for (const a of actors) {
      const bones = [];
      a.model.traverse((o) => {
        if (o.isBone) bones.push(o);
      });
      const snapshot = () => {
        a.root.updateMatrixWorld(true);
        return bones.map((b) => b.getWorldPosition(new T.Vector3()));
      };
      const named = (name) => bones.find((bone) => bone.name.toLowerCase().endsWith(name.toLowerCase()));
      const yaw = (left, right) => {
        const l = a.root.worldToLocal(named(left).getWorldPosition(new T.Vector3()));
        const r = a.root.worldToLocal(named(right).getWorldPosition(new T.Vector3()));
        const line = l.sub(r);
        return Math.abs((Math.atan2(line.z, Math.abs(line.x)) * 180) / Math.PI);
      };
      const floorY = () => {
        let low = Infinity;
        const point = new T.Vector3();
        a.model.traverse((mesh) => {
          if (!mesh.isSkinnedMesh) return;
          for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
            mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
            low = Math.min(low, a.root.worldToLocal(point).y);
          }
        });
        return low;
      };
      let hipYaw = 0,
        shoulderYaw = 0,
        minFloor = Infinity,
        maxFloor = -Infinity;
      const idleBounds = new Map(bones.map((b) => [b, new T.Box3()]));
      for (let frame = 0; frame < 240; frame++) {
        a.update(1 / 60);
        snapshot().forEach((p, i) => idleBounds.get(bones[i]).expandByPoint(p));
        hipYaw = Math.max(hipYaw, yaw('LeftUpLeg', 'RightUpLeg'));
        shoulderYaw = Math.max(shoulderYaw, yaw('LeftArm', 'RightArm'));
        if (frame % 30 === 0) {
          const floor = floorY();
          minFloor = Math.min(minFloor, floor);
          maxFloor = Math.max(maxFloor, floor);
        }
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
        hipYaw,
        shoulderYaw,
        minFloor,
        maxFloor,
        transitions: [],
      };
      for (const state of ['walk', 'idle']) {
        const before = snapshot();
        a.setState(state);
        a.update(0);
        const immediate = snapshot();
        let maxStep = 0,
          maxInstant = 0,
          steadyWalk = 0,
          previous = immediate;
        for (let i = 0; i < bones.length; i++) maxInstant = Math.max(maxInstant, before[i].distanceTo(immediate[i]));
        for (let frame = 0; frame < 120; frame++) {
          a.update(1 / 60);
          const now = snapshot();
          now.forEach((p, i) => {
            const step = p.distanceTo(previous[i]);
            if (frame < 18) maxStep = Math.max(maxStep, step);
            if (state === 'walk' && frame >= 30) steadyWalk = Math.max(steadyWalk, step);
            if (!Number.isFinite(p.length())) throw Error('Non-finite transform');
          });
          previous = now;
        }
        if (state === 'walk') stats.steadyWalk = steadyWalk;
        stats.transitions.push({ state, maxInstant, maxStep });
      }
      stats.snapLimit = Math.min(0.07, Math.max(0.015, stats.steadyWalk * 1.25));
      stats.pass = !(
        stats.hipYaw >= 3 ||
        stats.shoulderYaw >= 3 ||
        stats.minFloor < -0.003 ||
        stats.maxFloor > 0.005 ||
        stats.headTravel < 0.003 ||
        stats.leftFootTravel > 1e-5 ||
        stats.rightFootTravel > 1e-5 ||
        stats.transitions.some((t) => t.maxInstant > 0.001 || t.maxStep > stats.snapLimit)
      );
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
  await page.setViewportSize({ width: 1366, height: 860 });
  await page.evaluate(() => {
    globalThis.resize();
    globalThis.floorView();
  });
  await page.screenshot({ path: output + 'mio-floor-side.png' });
  if (errors.length) throw Error(errors.join('\n'));
  fs.writeFileSync(output + 'motion.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.some((actor) => !actor.pass)) throw Error('Idle pose or transition check failed; see motion.json');
});
