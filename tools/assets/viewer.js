// 3D previews for the asset gallery and its thumbnail renderer. Everything is built by the game's own code
// (game3d/js), so a preview shows exactly what the game shows: the Meshy models through their loaders, the
// code-built chibis through cast.js and train/people.js, the prop kit through props.js, and whole rooms through
// the scene builders. The page needs an import map for 'three' and 'three/addons/' (see index.html).
import * as THREE from 'three';

const G = new URL('../../game3d/js/', import.meta.url).href;
const mod = (p) => import(G + p);
const repo = (p) => new URL('../../' + p, import.meta.url).href;

// ------------------------------------------------------------------ building one asset
// view: the entry's `view` from assets.json. Returns { object, scene?, room?, actions, play(id), update(dt), focus? }
export async function buildAsset(view) {
  switch (view.type) {
    case 'meshy': return figure(await meshy(view), view);
    case 'mio': return figure(await (await mod('mio.js')).loadMio({ height: view.height || 1.12 }), view);
    case 'glb': return glb(view);
    case 'chibi': return chibi(view);
    case 'kit': return kit(view);
    case 'room': return room(view);
    default: throw new Error('no 3D view for ' + view.type);
  }
}

async function meshy(view) {
  const av = await mod('avatar.js');
  return view.id === 'eric' ? av.loadEric({ height: view.height || 1.2 }) : av.loadMeshy(view.id, { height: view.height || 1.2 });
}

// a seat block under a seated figure (the train's seat height)
function seat(top = 0.3) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.62, top, 0.5), new THREE.MeshStandardMaterial({ color: '#5b6f8f', roughness: 0.8 }));
  m.position.set(0, top / 2, -0.06); m.castShadow = true; m.receiveShadow = true;
  return m;
}

// a rigged Meshy character: states (idle, walk, run, sit), gestures and the phone pose where the rig has them
function figure(m, view) {
  const g = new THREE.Group(); g.add(m.root);
  const seatBlock = seat(0.3); seatBlock.visible = false; g.add(seatBlock);
  const actions = [['idle', 'Idle'], ['walk', 'Walk'], ['run', 'Run'], ['sit', 'Sit']].map(([id, label]) => ({ id, label }));
  for (const k of m.gestures || []) actions.push({ id: 'g:' + k, label: k[0].toUpperCase() + k.slice(1) });
  if (m.phone) actions.push({ id: 'phone', label: 'Phone' });
  let loopG = null, phoneOn = false;
  const play = async (id) => {
    loopG = null;
    if (phoneOn && m.phone) { phoneOn = false; m.phone('away'); }
    seatBlock.visible = id === 'sit';
    if (id === 'sit') { m.sitAt(0, 0.3, 0, 0); return; }
    m.root.position.set(0, 0, 0); m.seated = false;
    if (id.startsWith('g:')) {
      m.setState('idle');
      const k = id.slice(2); loopG = k;
      while (loopG === k) { await m.gesture(k); await new Promise((r) => setTimeout(r, 900)); }
      return;
    }
    if (id === 'phone') { m.setState('idle'); phoneOn = true; m.phone('look'); return; }
    m.setState(id);
  };
  const first = view.play || (view.gesture ? 'g:' + view.gesture : view.phone ? 'phone' : 'idle');
  play(first);
  return { object: g, actions, current: first, play, update: (dt) => { m.update(dt); if (m.placePhone) m.placePhone(); }, meshy: m };
}

// any GLB: its own clips, played one at a time (an optional base-colour texture for files that come without one)
async function glb(view) {
  const { GLTFLoader } = await import(new URL('../../game3d/vendor/loaders/GLTFLoader.js', import.meta.url).href);
  const gltf = await new GLTFLoader().loadAsync(repo(view.src));
  const model = gltf.scene;
  let tex = null;
  if (view.tex) { tex = await new THREE.TextureLoader().loadAsync(repo(view.tex)); tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; }
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    if (tex) o.material = new THREE.MeshLambertMaterial({ map: tex });
  });
  // stand it on the ground at a chibi's height (Meshy files come in arbitrary units)
  const box = new THREE.Box3().setFromObject(model), h = box.max.y - box.min.y || 1;
  const holder = new THREE.Group(); holder.add(model); holder.scale.setScalar(1.2 / h); model.position.y -= box.min.y;
  const g = new THREE.Group(); g.add(holder);
  const mixer = new THREE.AnimationMixer(model);
  const clips = gltf.animations || [];
  const actions = clips.map((c, i) => ({ id: String(i), label: c.name && !/^(Armature|mixamo)/i.test(c.name) ? c.name : `Clip ${i + 1}` }));
  let cur = null;
  const play = (id) => { const c = clips[+id]; if (!c) return; if (cur) cur.stop(); cur = mixer.clipAction(c); cur.reset().play(); };
  if (clips.length) play('0');
  return { object: g, actions: actions.length > 1 ? actions : [], current: '0', play, update: (dt) => mixer.update(dt) };
}

// the code-built people and the cat
async function chibi(view) {
  const cast = await mod('cast.js');
  const ppl = await mod('train/people.js');
  let r;
  if (view.fn === 'eric') r = (await mod('avatar.js')).buildEric();
  else if (view.fn === 'passenger') { const car = await mod('train/car.js'); r = ppl.buildPassengers(car.LZ, car.SEAT_Y)[view.arg || 0]; }
  else if (view.fn === 'cat') { const c = ppl.cat(); c.scale.setScalar(1.4); const g = new THREE.Group(); g.add(c); return { object: g, actions: [], play() {}, update() {} }; }
  else if (view.fn === 'oldplayer') r = ppl.buildPlayer();
  else r = cast.PEOPLE[view.fn](view.arg || 0);
  if (!r || !r.root) throw new Error('no chibi ' + view.fn);
  const g = new THREE.Group(); g.add(r.root);
  const seated = r.root.position.y > 0.04 || view.fn === 'passenger';
  r.root.position.x = 0; r.root.position.z = 0; r.root.rotation.y = 0;
  const base = { y: r.root.position.y };
  const seatBlock = seat(0.22 * (r.root.scale.y || 1) + 0.02); g.add(seatBlock); seatBlock.visible = seated;
  const actions = seated ? [] : [{ id: 'idle', label: 'Stand' }, { id: 'walk', label: 'Walk' }, { id: 'sit', label: 'Sit' }];
  let mode = view.play || 'idle', ph = 0, t = 0;
  const rest = () => { r.root.position.y = base.y; for (const l of r.legs || []) l.rotation.set(0, 0, 0); for (const k of r.knees || []) k.rotation.set(0, 0, 0); for (const a of r.arms || []) a.rotation.set(0, 0, 0); };
  const play = (id) => {
    mode = id; rest(); seatBlock.visible = seated;
    if (id === 'sit') { ppl.sit(r); ppl.armsLap(r); r.root.position.y = Math.max(r.root.position.y, 0); seatBlock.visible = true; }
  };
  if (!seated) play(mode);
  return {
    object: g, actions, current: mode, play,
    update(dt) {
      t += dt; r.ph = r.ph || 0;
      if (mode === 'walk') { ph += dt * 9.5; ppl.walkPose(r, ph, 1); } else if (r.torso) { r.torso.scale.y = 1 + 0.012 * Math.sin(t * 1.7); }
    },
  };
}

// one builder from the prop kit
async function kit(view) {
  const files = { briefcase: 'cast.js', mug: 'cast.js', phone: 'train/people.js', book: 'train/people.js' };
  const m = await mod(files[view.fn] || 'props.js');
  const o = m[view.fn]();
  const g = new THREE.Group(); g.add(o);
  o.traverse((x) => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
  const box = new THREE.Box3().setFromObject(o);
  o.position.y -= box.min.y;                  // stand it on the floor, whatever its own origin
  return { object: g, actions: [], play() {}, update() {} };
}

// a whole room from the game's scene builder; `anchor` and `spot` aim the camera at one named thing
async function room(view) {
  let w, scene;
  if (view.room === 'office') { w = (await mod('scenes/office.js')).buildOffice(); scene = w.scene; }
  else if (view.room === 'lobby') { w = (await mod('scenes/lobby.js')).buildLobby(); scene = w.scene; }
  else if (view.room === 'forecourt') { w = (await mod('scenes/forecourt.js')).buildForecourt(); scene = w.scene; }
  else if (view.room === 'plaza') { w = (await mod('scenes/plaza.js')).buildPlaza(); scene = w.scene; }
  else if (view.room === 'dorm-court') { w = (await mod('scenes/dorm-court.js')).buildDormCourt(); scene = w.scene; }
  else if (view.room === 'dorms') { w = (await mod('scenes/dorms.js')).buildDorms(); scene = w.scene; }
  else if (view.room === 'train') {
    const car = (await mod('train/car.js')).buildCar('land');
    scene = new THREE.Scene(); scene.background = new THREE.Color('#9fb3c8');
    scene.add(new THREE.HemisphereLight('#dfe8f5', '#8a8378', 2.0));
    const sun = new THREE.DirectionalLight('#ffe0b0', 2.4); sun.position.set(-4, 9, 6); sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 }); sun.shadow.mapSize.set(2048, 2048); scene.add(sun);
    // the carriage's passengers, seated where the game puts them
    const ppl = await mod('train/people.js'); const C = await mod('train/car.js');
    for (const r of ppl.buildPassengers(C.LZ, C.SEAT_Y)) car.root.add(r.root);
    scene.add(car.root); w = { root: car.root };
  }
  const anim = [];
  scene.traverse((o) => { if (o.userData && typeof o.userData.tick === 'function') anim.push(o); });
  return {
    scene, object: w.root, room: view.room, actions: [], play() {}, update() {},
    focus: view.anchor ? { anchor: view.anchor, spot: view.spot, small: view.small } : null,
  };
}

// ------------------------------------------------------------------ the stage: renderer, camera, turntable
export class Stage {
  constructor(el, { width, height, pixelRatio } = {}) {
    this.el = el;
    this.r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
    this.r.outputColorSpace = THREE.SRGBColorSpace; this.r.toneMapping = THREE.NeutralToneMapping;
    this.r.shadowMap.enabled = true; this.r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.r.setPixelRatio(pixelRatio || Math.min(2, window.devicePixelRatio || 1));
    el.appendChild(this.r.domElement);
    this.size(width, height);
    this.cam = new THREE.PerspectiveCamera(30, 1, 0.05, 200);
    this.yaw = 0.5; this.pitch = 0.18; this.dist = 3; this.target = new THREE.Vector3(0, 0.6, 0);
    this.auto = true; this.clock = new THREE.Clock(); this.running = false;
    this.figureScene = this.makeFigureScene();
    this.bindPointer();
    if (!width) { this.ro = new ResizeObserver(() => this.size()); this.ro.observe(el); }
  }
  size(w, h) {
    const W = w || this.el.clientWidth || 480, H = h || this.el.clientHeight || 480;
    this.r.setSize(W, H, !!(w && h) ? true : false);
    if (this.cam) { this.cam.aspect = W / H; this.cam.updateProjectionMatrix(); }
    this.W = W; this.H = H;
  }
  makeFigureScene() {
    const s = new THREE.Scene(); s.background = new THREE.Color('#1d232d');
    s.add(new THREE.HemisphereLight('#d3def0', '#6a6258', 2.1));
    const sun = new THREE.DirectionalLight('#ffe2bf', 2.6); sun.position.set(-1.6, 4, 3); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2 }); s.add(sun);
    const rim = new THREE.DirectionalLight('#9fc4ff', 0.9); rim.position.set(2, 2, -3); s.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), new THREE.MeshStandardMaterial({ color: '#2b333f', roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.add(floor);
    this.floor = floor;
    return s;
  }
  // show a built asset and frame it
  show(b) {
    if (this.built && !this.built.scene && this.built.object.parent) this.built.object.parent.remove(this.built.object);
    this.built = b;
    if (b.scene) { this.scene = b.scene; }
    else { this.scene = this.figureScene; this.scene.add(b.object); }
    this.frame();
  }
  frame() {
    const b = this.built; if (!b) return;
    b.object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(b.object);
    const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    if (b.focus && b.focus.anchor) {
      const [x, y, z] = b.focus.anchor, t = new THREE.Vector3(x, y, z);
      const sp = b.focus.spot ? new THREE.Vector3(b.focus.spot[0], y, b.focus.spot[1]) : t.clone().add(new THREE.Vector3(0, 0, 1));
      const dir = sp.sub(t); dir.y = 0; if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1); dir.normalize();
      this.target.copy(t); this.target.y = Math.max(0.35, y * 0.8);
      this.yaw = Math.atan2(dir.x, dir.z); this.pitch = 0.62; this.dist = b.focus.small ? 3.0 : 4.2; this.cam.fov = 30;
      this.auto = false; this.minD = 0.8; this.maxD = 30;
      if (b.room === 'train') {
        // look down into the carriage from above its open top, the way the game's camera sees it
        this.target.copy(t); this.target.y = Math.min(y, 0.9); this.pitch = 1.0; this.dist = 2.8; this.cam.fov = 40;
      }
    } else if (b.scene) {
      // the room's floor size (scenes/office.js X0..X1, Z0..Z1; scenes/lobby.js X, Z; train/car.js LX, LZ), not its
      // bounding box, which can hold a street or a sky
      const span = { office: 14, lobby: 12.6 }[b.room] || Math.max(size.x, size.z) * 1.05;
      this.target.set(0, 0.3, b.room === 'train' ? 0 : 0.4); this.yaw = 0.0; this.pitch = b.room === 'train' ? 0.8 : 0.95;
      this.cam.fov = 28; this.dist = span / (2 * Math.tan(THREE.MathUtils.degToRad(14))) * 0.95; this.minD = 1; this.maxD = this.dist * 2.5; this.auto = false;
    } else {
      const h = Math.max(size.y, 0.2), wdt = Math.max(size.x, size.z);
      this.target.set(c.x, box.min.y + h * 0.5, c.z); this.cam.fov = 26; this.pitch = 0.16;
      this.dist = Math.max(h, wdt * 0.9) / (2 * Math.tan(THREE.MathUtils.degToRad(this.cam.fov / 2))) * 1.4 + wdt * 0.3;
      this.minD = this.dist * 0.35; this.maxD = this.dist * 3;
      const k = Math.max(0.6, Math.min(3, wdt * 1.4, h * 1.4)); this.floor.scale.setScalar(k);
    }
    this.cam.updateProjectionMatrix();
    this.place();
  }
  place() {
    const cp = Math.cos(this.pitch);
    this.cam.position.set(this.target.x + Math.sin(this.yaw) * cp * this.dist, this.target.y + Math.sin(this.pitch) * this.dist, this.target.z + Math.cos(this.yaw) * cp * this.dist);
    this.cam.lookAt(this.target);
  }
  bindPointer() {
    const c = this.r.domElement; c.style.touchAction = 'none'; c.style.cursor = 'grab';
    const pts = new Map(); let pinch = 0;
    c.addEventListener('pointerdown', (e) => { c.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); this.auto = false; c.style.cursor = 'grabbing'; });
    c.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      const [px, py] = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch) this.zoom(pinch / d); pinch = d; return;
      }
      this.yaw -= (e.clientX - px) * 0.008; this.pitch = Math.max(-0.2, Math.min(1.45, this.pitch + (e.clientY - py) * 0.006)); this.place();
    });
    const up = (e) => { pts.delete(e.pointerId); pinch = 0; c.style.cursor = 'grab'; };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom(Math.exp(e.deltaY * 0.001)); }, { passive: false });
  }
  zoom(k) { this.dist = Math.max(this.minD || 0.3, Math.min(this.maxD || 50, this.dist * k)); this.place(); }
  step(dt) {
    if (!this.built) return;
    this.built.update(Math.min(dt, 0.1));
    if (this.auto && !this.built.scene) { this.yaw += dt * 0.45; this.place(); }
    this.r.render(this.scene, this.cam);
  }
  start() {
    if (this.running) return; this.running = true; this.clock.getDelta();
    const loop = () => { if (!this.running) return; this.step(this.clock.getDelta()); this.raf = requestAnimationFrame(loop); };
    loop();
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }
  dispose() {
    this.stop(); if (this.ro) this.ro.disconnect();
    if (this.built && !this.built.scene && this.built.object.parent) this.built.object.parent.remove(this.built.object);
    this.r.dispose(); this.r.forceContextLoss && this.r.forceContextLoss(); this.r.domElement.remove();
  }
}
