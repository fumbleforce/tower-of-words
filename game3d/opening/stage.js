// The opening's one 3D set: the bay at sunrise, the monorail guideway across it toward the island, the game's own
// three-car train (js/train/car.js, Blender skin from assets/train/monorail.glb) and the island's skyline.
// The train runs along +x toward the island; the low sun is behind the island, so shots toward it are backlit.
// Shots move the train and the camera; nothing here keeps time of its own.
import * as THREE from 'three';
import { loadMonorail, monorailParts } from '../js/train/models.js';
import { buildCar, buildBellows, LX, T, LZ, WIN, SEAT_Y } from '../js/train/car.js';
import { playerBody, mioBody } from '../js/chibi.js';
import { SUN, SKY_UNIFORMS, buildSky, buildSea } from './sky.js';
import { buildIsland } from './island.js';
import { buildLobby } from '../js/scenes/lobby.js';
import { buildOffice } from '../js/scenes/office.js';

export const SEA_Y = -17; // as in the game: the sea far below the car floor
export const BEAM_TOP = -0.16;
export const PITCH = 2 * (LX + T) + 0.52; // car to car, as the train place spaces its neighbours
export const ISLAND_X = 900; // where the straight line meets the island's curve (island.js)
// the beam's top along the line: level across the bay, down 13 over the last 300 to the island's beam
const ISL_BEAM = SEA_Y + 1.5 + 2.5 - 0.16; // island ground + platform deck - 0.16 (scenes/station-shed.js)
export function beamY(x) {
  const t = Math.min(1, Math.max(0, (x - (ISLAND_X - 300)) / 300));
  return BEAM_TOP + (ISL_BEAM - BEAM_TOP) * t * t * (3 - 2 * t);
}

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
  // Two lines across the bay, high on their pillars; near the island they come down (5 %) to the island's beam,
  // which the forecourt builds curving into the platform shed (island.js), and the far line swings in to join
  // the near one. beamY(x): the beam's top along the near line.
  const M = monorailParts();
  const line = new THREE.Group();
  scene.add(line);
  const X0 = -1600,
    SEG = 9.5;
  const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const lineDefs = [
    { z: () => 0, end: ISLAND_X },
    { z: (x) => -7.5 * (1 - smooth(ISLAND_X - 420, ISLAND_X - 90, x)), end: ISLAND_X - 90 },
  ];
  const m4 = new THREE.Matrix4(),
    q4 = new THREE.Quaternion(),
    e4 = new THREE.Euler(),
    one = new THREE.Vector3(1, 1, 1);
  for (const L of lineDefs) {
    const nSeg = Math.ceil((L.end - X0) / SEG);
    const beams = new THREE.InstancedMesh(M.beam.geometry, M.beam.material, nSeg);
    for (let i = 0; i < nSeg; i++) {
      const x0 = X0 + i * SEG,
        x1 = x0 + SEG;
      const y0 = beamY(x0),
        y1 = beamY(x1),
        z0 = L.z(x0),
        z1 = L.z(x1);
      e4.set(0, -Math.atan2(z1 - z0, SEG), Math.atan2(y1 - y0, SEG), 'YZX');
      q4.setFromEuler(e4);
      beams.setMatrixAt(i, m4.compose(new THREE.Vector3(x0, y0, z0), q4, one));
    }
    beams.frustumCulled = false;
    line.add(beams);
    const gap = 19;
    const nP = Math.ceil((L.end - 4 - X0) / gap);
    const pil = new THREE.InstancedMesh(M.pillar.geometry, M.pillar.material, nP);
    const foot = new THREE.InstancedMesh(M.foot.geometry, M.foot.material, nP);
    for (let i = 0; i < nP; i++) {
      const x = X0 + 6 + i * gap;
      // the pillar's top meets the beam's underside when its origin is 0.16 above the beam's top, as in the game
      pil.setMatrixAt(i, m4.makeTranslation(x, beamY(x) - BEAM_TOP, L.z(x)));
      foot.setMatrixAt(i, m4.makeTranslation(x, SEA_Y + 0.1, L.z(x)));
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
  // the game's own 3D Eric and Mio, seated on the far bench of a car facing the near windows (as the train place seats
  // its passengers: z = -(LZ - 0.24), facing +z). Loaded on request; a failed load leaves the pictures in place.
  const models = {};
  async function seatModels(list) {
    await Promise.all(
      list.map(async ([key, car, x]) => {
        try {
          const p = key === 'eric' ? await playerBody() : await mioBody(); // the bodies the game boots with (chibi.js)
          p.sitAt(x, SEAT_Y, -(LZ - 0.24) + 0.02, 0);
          p.update(0);
          cars[car].root.add(p.root);
          models[key] = p;
        } catch (e) {
          console.warn('opening: 3D', key, e);
        }
      }),
    );
    return models;
  }

  // ---------- the island: the game's own (island.js) ----------
  const isl = await buildIsland(uniforms, { joinX: ISLAND_X, seaY: SEA_Y });
  scene.add(isl.group, isl.ridge);

  // ---------- Honsha's station sign, hung under the platform shed's roof over the platform ----------
  {
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
    const A = isl.anchors;
    // over the platform beside the beam (island x -30.8), a third of the way down the shed, facing north up it
    const P = A.toWorld(-28.2, -2, 2.5 + 2.55);
    const north = A.toWorld(-28.2, -3, 2.5 + 2.55).sub(P);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.82), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide }));
    sign.position.copy(P);
    sign.lookAt(P.clone().add(north));
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.88, 0.05), new THREE.MeshStandardMaterial({ color: '#5f6f86', roughness: 0.5, metalness: 0.4 }));
    back.position.copy(P).addScaledVector(north, 0.03);
    back.quaternion.copy(sign.quaternion);
    scene.add(sign, back);
  }

  const sets = {};
  let active = scene;

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
    models,
    seatModels,
    anchors: isl.anchors,
    // before each shot: the optional set pieces hidden, the bay as the scene
    reset() {
      active = scene;
      train.rotation.set(0, 0, 0);
    },
    // the game's indoor places as sets of their own (built once, on first use): 'lobby' (the station's security
    // room and gate, scenes/lobby.js) and 'office' (B2, scenes/office.js). Returns the place's world object.
    set(name) {
      if (!sets[name]) {
        const w = name === 'lobby' ? buildLobby() : buildOffice();
        sets[name] = w;
      }
      active = sets[name].scene;
      return sets[name];
    },
    // the train standing anywhere: its middle car's floor centre at pos, running along dir (x, z)
    setTrainPose(pos, dir) {
      train.position.copy(pos);
      train.rotation.set(0, -Math.atan2(dir.z, dir.x), 0);
    },
    sun,
    // the train's middle car centre at x (y follows the beam)
    setTrain(x) {
      const y = beamY(x) - BEAM_TOP;
      train.position.set(x, y, 0);
      train.rotation.set(0, 0, Math.atan2(beamY(x + 4) - beamY(x - 4), 8));
    },
    // aim the camera: position, look-at point, vertical fov, optional roll (radians)
    look(pos, at, fov = 40, roll = 0) {
      camera.position.set(...pos);
      // depth precision: the near plane follows how far away the subject is (a close window or a distant island)
      const d = Math.hypot(pos[0] - at[0], pos[1] - at[1], pos[2] - at[2]);
      const near = Math.min(4, Math.max(0.05, d * 0.012));
      if (Math.abs(camera.near - near) > 1e-4) {
        camera.near = near;
        camera.far = Math.min(25000, Math.max(9000, near * 5000));
        camera.updateProjectionMatrix();
      }
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
      renderer.setClearColor(active === scene ? 0x000000 : 0x1a2030, 1);
      renderer.clear();
      if (active !== scene) {
        const w = Object.values(sets).find((x) => x.scene === active);
        w?.update?.(T);
      }
      renderer.render(active, camera);
    },
  };
}
export { WIN, LZ };
