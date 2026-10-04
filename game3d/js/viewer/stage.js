// The character viewer's stage: a soft-lit floor with a grid, the people in a row along x, facing the camera, and
// OrbitControls (turn, zoom and pan, by mouse or touch). Rendered as the game renders (engine.js: sRGB out, neutral
// tone mapping, PCF shadows).
//   const st = stage(canvas); st.set(entities); st.fit(); st.frame(dt) each frame
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const BG = '#dfe4e8';

export function stage(canvas, labels) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 9, 22); // moved with the camera (frame)
  scene.add(new THREE.HemisphereLight('#f4f7fb', '#8d9590', 1.5));
  const sun = new THREE.DirectionalLight('#fff6ea', 2.0);
  sun.position.set(2.5, 5, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#dfe8ff', 0.5);
  fill.position.set(-3, 2, -2);
  scene.add(fill);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(150, 64),
    new THREE.MeshStandardMaterial({ color: '#cdd3d6', roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(120, 240, '#a7b0b6', '#bcc4c9');
  grid.position.y = 0.002;
  grid.material.transparent = true;
  grid.material.opacity = 0.7;
  scene.add(grid);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.03, 300);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.screenSpacePanning = true;
  controls.minDistance = 0.25;
  controls.maxDistance = 60;
  controls.maxPolarAngle = Math.PI * 0.495; // not under the floor
  // desktop: left turns, right pans, middle zooms (shift, ctrl or cmd with the left also pans: OrbitControls);
  // touch: one finger turns, two pinch to zoom and drag to pan
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  let moved = false;
  controls.addEventListener('start', () => (moved = true));

  const group = new THREE.Group();
  scene.add(group);
  let shown = [],
    span = { w: 1, h: 1.2 };

  // the row: each entity as wide as it needs, centred on x = 0
  function set(list) {
    for (const e of shown) if (!list.includes(e)) group.remove(e.root);
    shown = list;
    const w = list.reduce((s, e) => s + e.width, 0);
    let x = -w / 2;
    for (const e of list) {
      e.root.position.set(x + e.width / 2, 0, 0);
      x += e.width;
      group.add(e.root);
      e.root.traverse((o) => {
        if (o.isMesh) o.castShadow = o.receiveShadow = true;
      });
    }
    span = { w: Math.max(w, 0.6), h: Math.max(0.5, ...list.map((e) => e.height)) };
    const s = sun.shadow.camera,
      r = span.w / 2 + 1.2;
    Object.assign(s, { left: -r, right: r, top: r, bottom: -r, near: 0.5, far: 14 });
    s.updateProjectionMatrix();
    if (!moved) fit();
  }

  // the whole row in view, from the front and a little above
  function fit() {
    const aspect = camera.aspect,
      v = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const h = span.h * 1.25,
      w = span.w * 1.1;
    const d = Math.max(h / 2 / v, w / 2 / (v * aspect)) + 0.3;
    const target = new THREE.Vector3(0, span.h * 0.5, 0);
    controls.target.copy(target);
    camera.position.copy(target).add(new THREE.Vector3(0, 0.32, 1).normalize().multiplyScalar(d));
    camera.near = Math.max(0.02, d / 100);
    camera.updateProjectionMatrix();
    controls.update();
    moved = false;
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / Math.max(1, r.height);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(() => {
    resize();
    if (!moved) fit();
  }).observe(canvas);
  resize();

  // name tags under their feet, in CSS pixels over the canvas; none while the people stand too close on screen for
  // their names to fit
  const _p = new THREE.Vector3();
  function tags() {
    const r = canvas.getBoundingClientRect();
    const at = shown.map((e) => {
      e.root.getWorldPosition(_p);
      _p.z += 0.25;
      _p.project(camera);
      return [_p.x, _p.y, _p.z];
    });
    const xs = at.map(([x]) => ((x + 1) / 2) * r.width).sort((a, b) => a - b);
    const crowded = xs.some((x, i) => i && x - xs[i - 1] < 76);
    shown.forEach((e, i) => {
      const el = labels.get(e);
      if (!el) return;
      const [x, y, z] = at[i];
      const vis = !crowded && z < 1 && Math.abs(x) < 1.1 && Math.abs(y) < 1.1;
      el.hidden = !vis;
      if (vis)
        el.style.transform = `translate(${r.left + ((x + 1) / 2) * r.width}px, ${r.top + ((1 - y) / 2) * r.height}px) translate(-50%, 4px)`;
    });
  }

  function frame(dt) {
    for (const e of shown) e.update(dt);
    controls.update();
    // the fog starts past the people, however far the camera is
    const d = camera.position.distanceTo(controls.target);
    scene.fog.near = d + 6;
    scene.fog.far = d + 22;
    renderer.render(scene, camera);
    tags();
  }
  return { set, fit, frame, controls, camera, renderer };
}
