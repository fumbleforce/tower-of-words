// The opening's one 3D set: the bay at sunrise, the monorail guideway across it toward the island, the game's own
// three-car train (js/train/car.js, Blender skin from assets/train/monorail.glb) and the island's skyline.
// The train runs along +x toward the island; the low sun is behind the island, so shots toward it are backlit.
// Shots move the train and the camera; nothing here keeps time of its own.
import * as THREE from 'three';
import { loadMonorail, monorailParts } from '../js/train/models.js';
import { buildCar, buildBellows, LX, T, LZ, WIN } from '../js/train/car.js';
import { SUN, SKY_UNIFORMS, buildSky, buildSea } from './sky.js';
import { buildIsland } from './island.js';

export const SEA_Y = -17; // as in the game: the sea far below the car floor
export const BEAM_TOP = -0.16;
export const PITCH = 2 * (LX + T) + 0.52; // car to car, as the train place spaces its neighbours
export const ISLAND_X = 900; // where the straight line meets the island's curve (island.js)
export const STATION_X = 300; // the platform set for the arrival shot, shown only in that shot

export async function buildStage(renderer) {
  await loadMonorail();
  const scene = new THREE.Scene();
  const uniforms = SKY_UNIFORMS();
  scene.add(buildSky(uniforms));
  scene.add(buildSea(uniforms, SEA_Y));

  // light, matched to the sky: a warm low sun and a blue sky fill
  const sun = new THREE.DirectionalLight('#ffe6cc', 3.2);
  sun.position.copy(SUN).multiplyScalar(100);
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#b9d4ff', '#2e5470', 1.15);
  scene.add(hemi);

  // ---------- the guideway ----------
  const M = monorailParts();
  const line = new THREE.Group();
  scene.add(line);
  const X0 = -1600,
    SEG = 9.5;
  const nSeg = Math.ceil((ISLAND_X - X0) / SEG);
  for (const z of [0, -7.5]) {
    const beams = new THREE.InstancedMesh(M.beam.geometry, M.beam.material, nSeg);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < nSeg; i++) beams.setMatrixAt(i, m4.makeTranslation(X0 + i * SEG, BEAM_TOP, z));
    beams.frustumCulled = false;
    line.add(beams);
    const gap = 19;
    const nP = Math.ceil((ISLAND_X - 4 - X0) / gap);
    const pil = new THREE.InstancedMesh(M.pillar.geometry, M.pillar.material, nP);
    const foot = new THREE.InstancedMesh(M.foot.geometry, M.foot.material, nP);
    for (let i = 0; i < nP; i++) {
      const x = X0 + 6 + i * gap;
      pil.setMatrixAt(i, m4.makeTranslation(x, 0, z)); // the pillar's top meets the beam's underside at y = 0, as in the game
      foot.setMatrixAt(i, m4.makeTranslation(x, SEA_Y + 0.1, z));
    }
    pil.frustumCulled = foot.frustumCulled = false;
    line.add(pil, foot);
  }

  // ---------- the train: three closed cars and the bellows between ----------
  const train = new THREE.Group();
  scene.add(train);
  const cars = [];
  for (let i = 0; i < 3; i++) {
    const c = buildCar('closed', { furnished: true });
    c.root.remove(c.proxy);
    c.root.position.x = (i - 1) * PITCH;
    train.add(c.root);
    cars.push(c);
  }
  for (const s of [-1, 1]) {
    const b = buildBellows();
    b.position.x = s * (PITCH / 2);
    train.add(b);
  }
  // a soft warm lamp inside each car, so the benches read through the glass
  for (const c of cars) {
    const p = new THREE.PointLight('#ffe7c8', 1.6, 7, 1.5);
    p.position.set(0, 1.1, 0);
    c.root.add(p);
  }
  // people at the windows: cast portraits on cards just inside the near-side glass (z+), facing out
  const riders = {};
  const texCache = new Map();
  function riderTex(img) {
    if (!texCache.has(img)) {
      const t = new THREE.Texture(img);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      t.needsUpdate = true;
      texCache.set(img, t);
    }
    return texCache.get(img);
  }
  // put a portrait in car `car` (0..2) at window x (car-local), h metres tall, its bottom at y
  function seat(key, img, car, x, { h = 1.35, y = 0.16, z = LZ - 0.32 } = {}) {
    const asp = img.width / img.height;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(h * asp, h),
      new THREE.MeshBasicMaterial({ map: riderTex(img), transparent: true, alphaTest: 0.02, depthWrite: false, toneMapped: false }),
    );
    m.position.set(x, y + h / 2, z);
    m.renderOrder = 1;
    cars[car].root.add(m);
    riders[key] = m;
    return m;
  }

  // ---------- the island: the game's own (island.js) ----------
  const isl = buildIsland(uniforms, { joinX: ISLAND_X, seaY: SEA_Y });
  scene.add(isl.group, isl.curve, isl.ridge);

  // ---------- Honsha station: the platform where the line ends ----------
  const station = new THREE.Group();
  scene.add(station);
  {
    const conc = new THREE.MeshStandardMaterial({ color: '#c9ced6', roughness: 0.9 });
    const roof = new THREE.MeshStandardMaterial({ color: '#eef1f4', roughness: 0.6, emissive: new THREE.Color('#c9d6e4'), emissiveIntensity: 0.55 });
    const steel = new THREE.MeshStandardMaterial({ color: '#5f6f86', roughness: 0.5, metalness: 0.4 });
    const tactile = new THREE.MeshStandardMaterial({ color: '#f2c94c', roughness: 0.8 });
    const glass = new THREE.MeshStandardMaterial({ color: '#a8c6dc', roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.45 });
    const x0 = STATION_X - 90,
      x1 = STATION_X + 4,
      len = x1 - x0,
      xm = (x0 + x1) / 2;
    for (const sz of [1, -1]) {
      const deck = new THREE.Mesh(new THREE.BoxGeometry(len, 12, 5.2), conc);
      deck.position.set(xm, -6.02, sz * (1.55 + 2.6));
      const strip = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.3), tactile);
      strip.position.set(xm, 0.0, sz * 2.25);
      station.add(deck, strip);
    }
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(len, 0.25, 14), roof);
    canopy.position.set(xm, 4.4, 0);
    station.add(canopy);
    for (let x = x0 + 6; x < x1; x += 10)
      for (const sz of [1, -1]) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 4.4, 12), steel);
        c.position.set(x, 2.2, sz * 5.2);
        station.add(c);
      }
    for (const sz of [1, -1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(len, 3.6, 0.08), glass);
      wall.position.set(xm, 1.8, sz * 6.7);
      station.add(wall);
    }
    // the hanging station sign, square to the platform so arriving eyes read it
    const cv = document.createElement('canvas');
    cv.width = 1024;
    cv.height = 384;
    const g = cv.getContext('2d');
    g.fillStyle = '#f7f8fa';
    g.fillRect(0, 0, 1024, 384);
    g.fillStyle = '#1b2b4f';
    g.fillRect(0, 300, 1024, 84);
    g.fillStyle = '#6fd0c6';
    g.fillRect(0, 292, 1024, 10);
    g.fillStyle = '#1b2b4f';
    g.textAlign = 'center';
    g.font = '64px "OP Dela"';
    g.fillText('ほんしゃ', 512, 92);
    g.font = '150px "OP Dela"';
    g.fillText('本社', 512, 250);
    g.fillStyle = '#ffffff';
    g.font = '700 46px "Zen Kaku Gothic New"';
    g.fillText('HONSHA  ·  Head Office', 512, 358);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.2), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    sign.rotation.y = Math.PI / 2;
    sign.position.set(STATION_X - 34, 3.3, 3.7);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.3, 3.3), steel);
    back.position.set(STATION_X - 34.05, 3.3, 3.7);
    for (const dz of [-1.2, 1.2]) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), steel);
      rod.position.set(STATION_X - 34.05, 4.15, 3.7 + dz);
      station.add(rod);
    }
    station.add(sign, back);
    station.userData.signX = STATION_X - 34;
    station.visible = false; // the arrival shot shows it (stage.reset hides it again)
  }

  // ---------- camera ----------
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 20000);

  return {
    scene,
    camera,
    uniforms,
    train,
    cars,
    riders,
    seat,
    riderTex,
    station,
    anchors: isl.anchors,
    // before each shot: the optional set pieces hidden
    reset() {
      station.visible = false;
    },
    sun,
    // the train's middle car centre at x (y follows the beam)
    setTrain(x) {
      train.position.set(x, 0, 0);
    },
    // aim the camera: position, look-at point, vertical fov, optional roll (radians)
    look(pos, at, fov = 40, roll = 0) {
      camera.position.set(...pos);
      camera.up.set(Math.sin(roll), Math.cos(roll), 0);
      camera.lookAt(...at);
      if (roll) camera.rotateZ(roll);
      if (camera.fov !== fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    },
    // the sun's place on screen in uv (0..1, y up), or null when it is behind the camera
    sunOnScreen() {
      const p = camera.position.clone().addScaledVector(SUN, 5000).project(camera);
      if (p.z > 1 || Math.abs(p.x) > 1.6 || Math.abs(p.y) > 1.6) return null;
      return [(p.x + 1) / 2, (p.y + 1) / 2];
    },
    render(T, rt) {
      uniforms.uTime.value = T;
      renderer.setRenderTarget(rt);
      renderer.setClearColor(0x000000, 1);
      renderer.clear();
      renderer.render(scene, camera);
    },
  };
}
export { WIN, LZ };
