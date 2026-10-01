// Draw-call pass for a finished place: static meshes that share a look are merged into one mesh per look (and per
// patch of floor), so the phone draws a few hundred things a frame instead of a few thousand. Nothing in a place
// file has to change, and it must not change how anything looks.
//
//   import { optimizePlace } from './perf/batch.js';
//   optimizePlace(place, { game });          // once, when the place has been built (main.js prepare())
//
// How it stays safe without knowing which things a place animates:
// - People, the things the story talks about (their obj and outline()), skinned meshes, lines, points, custom
//   shaders, see-through glass and colour-less tricks (the train's shadow proxy) are never merged. Named meshes
//   are left alone too (places look them up by name and raycast them, like the train floor).
// - A merged mesh stays in the scene where it was, only switched to no layer, so the cameras skip it while code
//   can still move it, raycast it or hang things off it.
// - Every frame, before the first render pass, the pass checks each merged mesh and every node between it and
//   its batch: position, rotation, scale, visibility, parent, material and geometry, and its material's colour,
//   opacity and the like. The moment anything changes, that mesh goes back to drawing itself (its triangles in
//   the batch are collapsed, so there's no rebuild and no hitch). If a group moved (a door, the train car
//   swaying), its meshes are merged again under that group once they've held still for a moment, and the batch
//   then moves with it.
// - New meshes (a rebuilt shell, a prop brought in later) are merged once they've held still for 2 s.
//
// Looks: meshes whose materials differ only in colour share one material, with the colour baked into the vertex
// colours (exactly the same shading: the shader multiplies the same numbers). Everything else is grouped by
// identical material settings.
import * as THREE from 'three';
import { drain } from './slice.js';
import { split } from './batch-split.js';
import { makeTwin, dropTwin } from './batch-twin.js';
import { matKey, hasTex, plainData, matSnap, matSame, nodeSnap, nodeSame, srcSnap, srcSame } from './batch-snap.js';

const OBR = THREE.Object3D.prototype.onBeforeRender,
  OAR = THREE.Object3D.prototype.onAfterRender;
const MOBR = THREE.Material.prototype.onBeforeRender;
const BAKE = new Set([
  'MeshStandardMaterial',
  'MeshLambertMaterial',
  'MeshPhongMaterial',
  'MeshBasicMaterial',
  'MeshToonMaterial',
]);
// layers mask for a merged mesh: layer 31 only, so no camera (main, shadow, AO, outline) draws it, while a raycaster
// with layer 31 enabled (main.js hover) still finds it
const HIDDEN = 1 << 31;
const STILL_MS = 2000;
// meshes let go because a group above them moved (the train car starting to sway) are merged again under that group
// after this long, with the scans that follow coming this often until they are: the train's short first minutes
// otherwise ran mostly unmerged while each level of moving groups was found a scan a second
const REGROUP_MS = 300;
const Q = new URLSearchParams(location.search);
// see-through meshes stay on their own: merging them changes the order they're drawn in against other see-through
// things (tested: the lobby's lamp glow shifted by up to 64/255 in places). ?trans turns it on for experiments.
const TRANS = Q.has('trans');

export function optimizePlace(place, opt = {}) {
  if (place.perf) return place.perf;
  const off = Q.has('nobatch') || opt.off;
  const scene = place.scene;
  const game = opt.game || window.__game;
  // batches are split (median cuts along the longest side) until each covers at most SPAN metres or holds at most
  // TRIS triangles, so the parts off screen still get culled; shadow-only batches only split by triangles
  const SPAN = +(Q.get('span') || opt.span || 3),
    TRIS = +(Q.get('tris') || opt.tris || 6000),
    STRIS = 20000,
    LIGHT = +(Q.get('light') || 1500);
  // the ink look (style study) tells materials apart by colour; baking colours into one material would lose those lines
  const style = +(Q.get('style') || 0);
  const bakeOK = !(opt.noBake || Q.has('nobake') || style > 0);
  const info = new Map(); // mesh -> { state: 'batched' | 'dynamic' | 'wait', since, snap, batch, ... }
  const watch = new Map(); // node -> { snap, n }   (nodes between a merged mesh and its batch, the mesh included)
  const mats = new Map(); // material -> { snap, n }
  const movers = new Set(); // groups seen moving: batches go under them
  const matFlips = new WeakMap(); // mesh -> times its material changed while merged
  const live = new Set(); // meshes drawn by a batch right now
  // outlined meshes lifted out of their batches, and the twins drawing them (see outlines below)
  const lifted = new Set();
  const twins = new Map(); // visible batch -> its twin
  const twinOf = new Map(); // lifted mesh -> the twin drawing it
  let twinsStale = false;
  let dead = false;
  const batches = new Set();
  const dirtyIdx = new Set();
  const stats = { merged: 0, released: 0, batches: 0, buildMs: 0, scans: 0, checkMs: 0 };
  const perf = { stats, batches, info, movers, scan, check, dispose, toggle, why, toggleBatch, describe, forOutline };
  place.perf = perf;
  if (off) return perf;
  // groups the place moves every frame (place.perfMovers: the train car swaying, the pillars going by): batches go
  // under them from the first scan, built before the place shows, instead of every mesh under them drawing on its
  // own for the first second or so while the pass finds them moving a level at a time
  for (const n of place.perfMovers || []) if (n && n.isObject3D) movers.add(n);

  // People and the things the story talks about keep to themselves: their meshes only merge with each other,
  // under their own root (so outlines, hover and show/hide still work on the whole of them). Eric and Mio, and
  // whatever a thing's outline() names, are left alone completely.
  const BOUNDS = !Q.has('nobound');
  let bounds = new Set();
  const excluded = () => {
    const ex = new Set(),
      bd = new Set();
    for (const r of Object.values(place.people || {})) {
      if (r && r.root) (BOUNDS ? bd : ex).add(r.root);
      // a person's torso breathes every frame once the place is played (cast.js idle()): batch under it from the
      // start, or the parts on it draw one by one for the first second after every entry, until the pass sees it move
      if (r && r.torso && r.torso.isObject3D) movers.add(r.torso);
    }
    for (const t of Object.values(place.things || {})) {
      if (!t) continue;
      if (t.obj && t.obj.isObject3D) (BOUNDS ? bd : ex).add(t.obj);
      if (typeof t.outline === 'function') {
        try {
          for (const o of [].concat(t.outline())) if (o && o.isObject3D) ex.add(o);
        } catch {
          /* */
        }
      }
    }
    if (game) {
      if (game.player && game.player.root) ex.add(game.player.root);
      if (game.mioNpc && game.mioNpc.root) ex.add(game.mioNpc.root);
    }
    for (const o of ex) bd.delete(o);
    bounds = bd;
    return ex;
  };
  const inBound = (o) => {
    for (let p = o; p; p = p.parent) if (bounds.has(p)) return true;
    return false;
  };

  // why a mesh can't be merged ('' = it can)
  function reason(o) {
    if (!o.isMesh) return 'not a mesh';
    if (o.isSkinnedMesh) return 'skinned';
    if (o.isInstancedMesh || o.isBatchedMesh) return 'instanced';
    if (o.userData.perfBatch) return 'batch';
    if (o.userData.noBatch) return 'noBatch';
    if (o.name && !inBound(o) && !o.userData.stackable) return 'named';
    if (o.onBeforeRender !== OBR || o.onAfterRender !== OAR) return 'render callback';
    const m = o.material,
      g = o.geometry;
    if (!m || Array.isArray(m)) return 'material array';
    if (!g || !g.isBufferGeometry || !g.attributes.position) return 'no geometry';
    if (
      m.isShaderMaterial ||
      m.isRawShaderMaterial ||
      m.isPointsMaterial ||
      m.isLineBasicMaterial ||
      m.isSpriteMaterial
    )
      return 'shader';
    if (m.onBeforeRender !== MOBR) return 'material callback';
    if (!m.colorWrite) return 'no colour write';
    if (m.clippingPlanes && m.clippingPlanes.length) return 'clipped';
    // anything drawn in the see-through pass (even at full opacity) is sorted per object against the others there
    // (contact footprints, blob shadows and light pools, places/life.js and engine.js: among themselves they stack to
    // the same pixels in any order, so they may merge with each other, their colours baked into vertex colours)
    if (m.transparent && !TRANS && !o.userData.stackable) return 'see-through';
    if (g.morphAttributes && Object.keys(g.morphAttributes).length) return 'morph';
    if (g.attributes.tangent || g.attributes.skinIndex) return 'tangent/skin attr';
    if (g.attributes.position.itemSize !== 3) return 'position size';
    if (m.vertexColors && (!g.attributes.color || g.attributes.color.itemSize !== 3)) return 'colour attr';
    if (g.drawRange.count !== Infinity || g.drawRange.start !== 0) return 'draw range';
    if (o.layers.mask !== 1) return 'layers ' + o.layers.mask;
    return '';
  }
  const eligible = (o) => !reason(o);
  // diagnostics: what every mesh in the scene is doing and why
  function why() {
    const ex = excluded(),
      out = {};
    const add = (k) => {
      out[k] = (out[k] || 0) + 1;
    };
    const walk = (o, exc, hid) => {
      if (ex.has(o)) exc = true;
      if (!o.visible) hid = true;
      if (o.isMesh || o.isLine || o.isPoints || o.isSprite) {
        const r = info.get(o);
        if (o.userData.perfBatch) add('(batch)');
        else if (r && r.state !== 'wait') add(r.state);
        else if (exc) add('Eric, Mio or an outline');
        else if (hid) add('hidden');
        else add(coplanar.has(o) ? 'coplanar' : reason(o) || (r ? 'waiting' : 'single in its group'));
      }
      for (const c of o.children) walk(c, exc, hid);
    };
    walk(scene, false, false);
    return out;
  }
  // where a mesh sits relative to the group its batch would hang under (so a swaying train car still counts as still)
  // From the local transforms of the nodes in between, not the world matrices: those are only as fresh as the last
  // render or whatever called getWorldPosition since (which updates a node's parents, not its children), so between
  // frames an anchor's could be newer than its meshes' and a mesh on the swaying train car never looked still.
  function relMatrix(o, a, out) {
    out.identity();
    for (let n = o; n && n !== a; n = n.parent) {
      if (n.matrixAutoUpdate) n.updateMatrix();
      out.premultiply(n.matrix);
    }
    return out;
  }
  const _rs = new THREE.Matrix4();
  function relSnap(o) {
    const a = anchorOf(o);
    if (!a) return '';
    relMatrix(o, a, _rs);
    const m = o.material; // and how its material looks now: one still changing isn't still
    let s = a.id + ':' + m.uuid + ':' + o.geometry.uuid + ':' + m.opacity + ':' + (m.color ? m.color.getHex() : '');
    if (m.emissive) s += ':' + m.emissive.getHex() + ':' + m.emissiveIntensity;
    for (const v of _rs.elements) s += ',' + Math.round(v * 1e5);
    return s;
  }
  const anchorOf = (o) => {
    for (let p = o.parent; p; p = p.parent) if (movers.has(p) || bounds.has(p) || p === scene) return p;
    return null;
  };

  // the shadow map draws a mesh with a plain depth material unless its material cuts holes or bends it
  const shadowable = (o) => {
    const m = o.material;
    return !(
      m.alphaTest > 0 ||
      m.alphaMap ||
      m.displacementMap ||
      m.clippingPlanes ||
      o.customDepthMaterial ||
      o.customDistanceMaterial ||
      m.alphaToCoverage
    );
  };
  const soloCaster = (o) => o.castShadow && shadowable(o);
  const shadowSide = (m) =>
    m.shadowSide != null
      ? m.shadowSide
      : m.side === THREE.FrontSide
        ? THREE.BackSide
        : m.side === THREE.BackSide
          ? THREE.FrontSide
          : THREE.DoubleSide;
  // a shadow-only batch is culled by every camera except a light's shadow camera
  let shadowFr = new Set();
  const findShadowFrustums = () => {
    const f = new Set();
    scene.traverse((l) => {
      if (l.isLight && l.shadow) {
        const x = l.shadow.getFrustum ? l.shadow.getFrustum() : l.shadow._frustum;
        if (x) f.add(x);
      }
    });
    shadowFr = f;
  };
  const MeshCull = THREE.Mesh.prototype.intersectsFrustum;
  function shadowOnlyCull(fr) {
    return shadowFr.has(fr) && MeshCull.call(this, fr);
  }

  // Flat meshes lying exactly on another surface (a label on a tray, a mat on a counter) draw only because both get
  // the very same depth from the GPU's own maths. Baked into a batch, one of them would be a hair off and the pair
  // would z-fight, so both stay on their own.
  let coplanar = new Set();
  function findCoplanar() {
    const t0 = performance.now();
    const EPS = 2e-4,
      boxes = [],
      flats = [];
    scene.traverse((o) => {
      if (!o.isMesh || o.userData.perfBatch || !o.geometry || !o.geometry.attributes.position) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
      boxes.push([o, b]);
      for (let a = 0; a < 3; a++)
        if (b.max.getComponent(a) - b.min.getComponent(a) < EPS) {
          flats.push([o, b, a]);
          break;
        }
    });
    // boxes by the height of their top face on each axis, in cells of EPS: a candidate's top is within 2 EPS of the
    // plane (a flat one's bottom within EPS, so its top within 2 EPS), so the five cells around the plane hold them all
    const cells = [new Map(), new Map(), new Map()];
    if (flats.length)
      for (const e of boxes)
        for (let a = 0; a < 3; a++) {
          const k = Math.floor(e[1].max.getComponent(a) / EPS);
          let c = cells[a].get(k);
          if (!c) cells[a].set(k, (c = []));
          c.push(e);
        }
    const out = new Set();
    for (const [f, fb, a] of flats) {
      const pl = fb.min.getComponent(a),
        u = (a + 1) % 3,
        v = (a + 2) % 3,
        k0 = Math.floor(pl / EPS);
      for (let k = k0 - 2; k <= k0 + 2; k++)
        for (const [g, gb] of cells[a].get(k) || []) {
          if (g === f || (f.userData.stackable && g.userData.stackable)) continue; // write no depth: no fight
          // g's top face is in the plane (f lies on it), or g is flat in the same plane too; things merely standing on
          // a flat floor (their bottom in the plane, facing down) don't count
          const gFlat = gb.max.getComponent(a) - gb.min.getComponent(a) < EPS;
          if (Math.abs(gb.max.getComponent(a) - pl) > EPS && !(gFlat && Math.abs(gb.min.getComponent(a) - pl) <= EPS))
            continue;
          if (gb.max.getComponent(u) < fb.min.getComponent(u) || gb.min.getComponent(u) > fb.max.getComponent(u))
            continue;
          if (gb.max.getComponent(v) < fb.min.getComponent(v) || gb.min.getComponent(v) > fb.max.getComponent(v))
            continue;
          out.add(f);
          out.add(g);
        }
    }
    stats.coplanarMs = performance.now() - t0;
    coplanar = out;
  }

  // ---------- scan: find meshes to merge and build their batches ----------
  const _m = new THREE.Matrix4(),
    _v = new THREE.Vector3(),
    _s = new THREE.Sphere();
  // scan() runs it at once; the first scan of a place runs as scanSteps, a job that yields every few dozen meshes
  function scan(now = performance.now(), all = false) {
    drain(scanSteps(now, all));
  }
  function* scanSteps(now, all) {
    stats.scans++;
    let t0 = performance.now();
    scene.updateMatrixWorld();
    findShadowFrustums();
    const ex = excluded();
    // anything that became an outline target since it was merged goes back to drawing itself
    for (const x of ex)
      x.traverse((o) => {
        const r = info.get(o);
        if (r && r.state === 'batched') release(o, false);
      });
    const groups = new Map(),
      where = new Map(),
      snaps = new Map(),
      mk = new Map();
    // batches with a quarter or more of their meshes gone back to drawing themselves are rebuilt from what's left
    if (!all)
      for (const b of [...batches])
        if (b.live < 0.75 * b.total) for (const o of [...b.parts.keys()]) release(o, false, true);
    if (all || stats.scans % 5 === 0) findCoplanar();
    for (const o of coplanar) {
      const r = info.get(o);
      if (r && r.state === 'batched') release(o, false);
    }
    const stack = [scene],
      seen = new Set();
    let n = 0;
    while (stack.length) {
      if ((++n & 63) === 0) {
        stats.scanMs = (stats.scanMs || 0) + performance.now() - t0;
        yield;
        t0 = performance.now();
      }
      const o = stack.pop();
      if (ex.has(o) || o.isBone || o.userData.perfBatch || o.userData.noBatch || coplanar.has(o)) continue;
      // hidden subtrees wait until they show, but for a hidden group that moves (the train's station, shown as it pulls
      // in): its batches hang under it and hide with it
      if (!o.visible && (o.isMesh || !movers.has(o))) continue;
      for (let i = 0; i < o.children.length; i++) stack.push(o.children[i]);
      if (!o.isMesh) continue;
      let r = info.get(o);
      seen.add(o);
      if (r && (r.state === 'batched' || r.state === 'dynamic')) continue;
      if (!eligible(o)) continue;
      if (!all) {
        const sn = relSnap(o);
        if (!r || r.snap !== sn) {
          // it moved against its would-be batch: if a group above it did the moving, batch under that group from now on;
          // a mesh that keeps moving by itself is left to draw itself
          let self = r ? r.self || 0 : 0;
          if (r && r.chain) {
            let hi = null;
            for (const [n, snap] of r.chain) if (!nodeSame(n, snap)) hi = n;
            if (hi === o) self++;
            else if (hi) movers.add(hi);
          }
          if (self >= 3) {
            info.set(o, { state: 'dynamic' });
            continue;
          }
          const anc = anchorOf(o),
            chain = [];
          for (let n = o; n && n !== anc; n = n.parent) chain.push([n, nodeSnap(n)]);
          if (r && r.snap === '') regroup = true;
          info.set(o, {
            state: 'wait',
            since: r && r.snap === '' ? Math.min(r.since, now) : now,
            snap: relSnap(o),
            chain,
            self,
          });
          continue;
        }
        if (now - r.since < STILL_MS) continue;
        snaps.set(o, sn);
      } else snaps.set(o, relSnap(o));
      const m = o.material,
        anchor = anchorOf(o);
      if (!anchor) continue;
      const bake =
        bakeOK && (!m.transparent || o.userData.stackable) && BAKE.has(m.type) && plainData(m) && !m.clippingPlanes;
      const uv = hasTex(m) && !!o.geometry.attributes.uv;
      if (hasTex(m) && !o.geometry.attributes.uv) continue;
      const nrm = !!o.geometry.attributes.normal;
      // where it is (in the anchor's frame) and how heavy, for splitting
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      _s.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
      _v.copy(_s.center);
      anchor.worldToLocal(_v);
      where.set(o, {
        x: _v.x,
        y: _v.y,
        z: _v.z,
        t: (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3,
      });
      // meshes that cast a shadow the plain way go into a shadow-only batch; the visible batch then casts nothing
      const sh = o.castShadow && shadowable(o);
      let k0 = mk.get(m);
      if (!k0) mk.set(m, (k0 = [matKey(m, false), matKey(m, true)]));
      const key = [
        anchor.id,
        bake ? 'B' : 'E',
        k0[bake ? 0 : 1],
        uv,
        nrm,
        o.castShadow && !sh,
        o.receiveShadow,
        o.renderOrder,
        o.frustumCulled,
        JSON.stringify(o.userData),
      ].join('|');
      let gr = groups.get(key);
      if (!gr) groups.set(key, (gr = { anchor, bake, uv, nrm, mat: m, list: [], cast: o.castShadow && !sh }));
      gr.list.push(o);
    }
    // the merging itself is queued and done a few milliseconds at a time (see pump), so it never holds up a frame
    for (const gr0 of groups.values())
      for (const list of split(gr0.list, gr0.mat.transparent ? Math.min(SPAN, 2) : SPAN, TRIS, where, LIGHT)) {
        // a mesh with nothing to merge with still casts its shadow through a shadow-only batch (the shadow pass draws
        // depth only, so any material goes); it draws itself from a batch of one
        if (list.length < 2 && !soloCaster(list[0])) continue;
        jobs.push(() => {
          // still where it was when grouped, and not merged or moving since
          const ok = list.filter(
            (o) =>
              o.parent && (!info.get(o) || info.get(o).state === 'wait') && eligible(o) && relSnap(o) === snaps.get(o),
          );
          if (ok.length < 2 && !(ok.length === 1 && soloCaster(ok[0]))) return;
          const gr = { ...gr0, list: ok };
          build(gr);
          const casters = ok.filter((o) => o.castShadow && shadowable(o));
          const bySide = new Map();
          for (const o of casters) {
            const sd = shadowSide(o.material);
            if (!bySide.has(sd)) bySide.set(sd, []);
            bySide.get(sd).push(o);
          }
          for (const [side, l] of bySide)
            for (const part of split(l, 1e9, STRIS, where, LIGHT))
              build({ anchor: gr.anchor, shadow: true, side, list: part });
        });
      }
    jobs.push(consolidate);
    // forget meshes that left the scene (a rebuilt shell) and weren't merged
    if (!all) for (const [o, r] of info) if (r.state !== 'batched' && !seen.has(o) && !o.parent) info.delete(o);
    stats.scanMs = (stats.scanMs || 0) + performance.now() - t0;
  }

  // shadow-only batches are first made per visible batch (so the shadows never drop out for a frame), then merged
  // per group and side: the new one is built before the old ones go, and both cast the same shadow meanwhile
  function consolidate() {
    const by = new Map();
    for (const b of batches)
      if (b.shadow && b.fresh) {
        const k = b.mesh.parent.id + '|' + b.side;
        if (!by.has(k)) by.set(k, []);
        by.get(k).push(b);
      }
    for (const list of by.values()) {
      if (list.length < 2) continue;
      const srcs = [];
      for (const b of list) for (const o of b.parts.keys()) srcs.push(o);
      const where = new Map();
      for (const o of srcs)
        where.set(o, {
          x: 0,
          y: 0,
          z: 0,
          t: (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3,
        });
      const anchor = list[0].mesh.parent,
        side = list[0].side;
      if (!anchor) continue;
      for (const b of list) b.fresh = false;
      // one job per new batch, and the old ones go only after the last is built
      for (const part of split(srcs, 1e9, STRIS, where, LIGHT))
        jobs.push(() => {
          const ok = part.filter((o) => info.get(o) && info.get(o).state === 'batched');
          if (ok.length) build({ anchor, shadow: true, side, list: ok, merged: true });
        });
      jobs.push(() => {
        for (const b of list) if (batches.has(b)) dropBatch(b);
      });
    }
  }
  function dropBatch(b) {
    if (twins.has(b)) twinsStale = true;
    for (const o of b.parts.keys()) {
      const r = info.get(o);
      if (r && r.batches) r.batches = r.batches.filter((x) => x !== b);
    }
    b.mesh.parent && b.mesh.parent.remove(b.mesh);
    b.mesh.geometry.dispose();
    b.mesh.material.dispose();
    batches.delete(b);
    stats.batches = batches.size;
  }
  // the work queue, run in slices of BUDGET ms between frames
  const jobs = [];
  perf.busy = () => jobs.length > 0; // merging still queued (js/perf/warm.js waits for it)
  const BUDGET = +(Q.get('pbudget') || opt.budget || 6);
  let pumping = false;
  // a job is a function, or a function returning a generator (a long job: it stays first in the queue and runs a step
  // at a time until it's done)
  function pump() {
    if (dead) return;
    const t0 = performance.now();
    while (jobs.length && performance.now() - t0 < BUDGET) {
      const j = jobs[0],
        tj = performance.now();
      try {
        const r = typeof j === 'function' ? j() : j.next();
        if (r && typeof r.next === 'function') jobs[0] = r;
        else if (typeof j === 'function' || r.done) jobs.splice(jobs.indexOf(j), 1);
      } catch (e) {
        jobs.splice(jobs.indexOf(j), 1);
        console.warn('perf batch job', e);
      }
      stats.maxJobMs = Math.max(stats.maxJobMs || 0, performance.now() - tj);
    }
    stats.buildMs += performance.now() - t0;
    if (jobs.length) setTimeout(pump, 0);
    else pumping = false;
  }
  function kick() {
    if (!pumping && jobs.length) {
      pumping = true;
      setTimeout(pump, 0);
    }
  }

  function build(gr) {
    const { anchor, list, shadow } = gr;
    const bake = !shadow && gr.bake,
      uv = !shadow && gr.uv,
      nrm = !shadow && gr.nrm;
    let nv = 0,
      ni = 0;
    for (const o of list) {
      const g = o.geometry;
      nv += g.attributes.position.count;
      ni += g.index ? g.index.count : g.attributes.position.count;
    }
    const pos = new Float32Array(nv * 3),
      nor = nrm ? new Float32Array(nv * 3) : null,
      uvs = uv ? new Float32Array(nv * 2) : null;
    // baked light from look/bake.js (aBake, 1 minus a colour) goes into the vertex colours too
    const baked = !shadow && list.some((o) => o.geometry.attributes.aBake);
    const withCol = !shadow && (bake || gr.mat.vertexColors || baked);
    const cols = withCol ? new Float32Array(nv * 3) : null;
    // what each mesh is made of (look/procedural.js aLook) rides along per vertex
    const lookA = !shadow && list.some((o) => o.geometry.attributes.aLook) ? new Float32Array(nv * 4) : null;
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    const nm = new THREE.Matrix3();
    let v0 = 0,
      i0 = 0;
    const parts = [];
    for (const o of list) {
      const g = o.geometry,
        P = g.attributes.position,
        N = g.attributes.normal,
        U = g.attributes.uv,
        C = g.attributes.color,
        AB = baked ? g.attributes.aBake : null;
      relMatrix(o, anchor, _m);
      nm.getNormalMatrix(_m);
      const flip = _m.determinant() < 0;
      const n = P.count,
        e = _m.elements,
        ne = nm.elements;
      for (let i = 0; i < n; i++) {
        const x = P.getX(i),
          y = P.getY(i),
          z = P.getZ(i),
          j = (v0 + i) * 3;
        const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
        pos[j] = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
        pos[j + 1] = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
        pos[j + 2] = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
        if (nor) {
          const a = N.getX(i),
            b = N.getY(i),
            c = N.getZ(i);
          let nx = ne[0] * a + ne[3] * b + ne[6] * c,
            ny = ne[1] * a + ne[4] * b + ne[7] * c,
            nz = ne[2] * a + ne[5] * b + ne[8] * c;
          const l = Math.hypot(nx, ny, nz) || 1;
          nx /= l;
          ny /= l;
          nz /= l;
          nor[j] = nx;
          nor[j + 1] = ny;
          nor[j + 2] = nz;
        }
        if (uvs) {
          uvs[(v0 + i) * 2] = U.getX(i);
          uvs[(v0 + i) * 2 + 1] = U.getY(i);
        }
        if (lookA) {
          const L = g.attributes.aLook,
            q = (v0 + i) * 4;
          if (L) {
            lookA[q] = L.getX(i);
            lookA[q + 1] = L.getY(i);
            lookA[q + 2] = L.getZ(i);
            lookA[q + 3] = L.getW(i);
          } else lookA[q + 3] = 0.8;
        }
        if (cols) {
          const mc = bake ? o.material.color : null;
          let r = 1,
            gg = 1,
            bb = 1;
          if (o.material.vertexColors && C) {
            r = C.getX(i);
            gg = C.getY(i);
            bb = C.getZ(i);
          }
          if (mc) {
            r *= mc.r;
            gg *= mc.g;
            bb *= mc.b;
          }
          if (AB) {
            r *= 1 - AB.getX(i);
            gg *= 1 - AB.getY(i);
            bb *= 1 - AB.getZ(i);
          }
          cols[j] = r;
          cols[j + 1] = gg;
          cols[j + 2] = bb;
        }
      }
      const I = g.index,
        cnt = I ? I.count : n;
      for (let t = 0; t < cnt; t += 3) {
        const a = I ? I.getX(t) : t,
          b = I ? I.getX(t + 1) : t + 1,
          c = I ? I.getX(t + 2) : t + 2;
        idx[i0 + t] = v0 + a;
        if (flip) {
          idx[i0 + t + 1] = v0 + c;
          idx[i0 + t + 2] = v0 + b;
        } else {
          idx[i0 + t + 1] = v0 + b;
          idx[i0 + t + 2] = v0 + c;
        }
      }
      parts.push({ o, v0, i0, cnt });
      v0 += n;
      i0 += cnt;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    if (nor) geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    if (uvs) geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    if (cols) geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    if (lookA) geo.setAttribute('aLook', new THREE.BufferAttribute(lookA, 4));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    const src = list[0];
    let mat;
    if (shadow) {
      mat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
      mat.shadowSide = gr.side;
    } else {
      mat = gr.mat.clone();
      if (bake) {
        mat.color && mat.color.setRGB(1, 1, 1);
        mat.vertexColors = true;
      }
      if (baked) mat.vertexColors = true;
      // clone() leaves out shader patches (look/procedural.js): the batch draws with the same one
      if (gr.mat.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) {
        mat.onBeforeCompile = gr.mat.onBeforeCompile;
        mat.customProgramCacheKey = gr.mat.customProgramCacheKey;
      }
      if (gr.mat.defaultAttributeValues) mat.defaultAttributeValues = gr.mat.defaultAttributeValues;
    }
    mat.userData = { ...(shadow ? {} : gr.mat.userData), perfBatch: true };
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = shadow ? 'perf-shadow' : 'perf-batch';
    if (shadow) {
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = true;
      mesh.intersectsFrustum = shadowOnlyCull;
      mesh.userData.noAO = true;
      mesh.userData.noInk = true;
    } else {
      mesh.castShadow = gr.cast;
      mesh.receiveShadow = src.receiveShadow;
      mesh.renderOrder = src.renderOrder;
      mesh.frustumCulled = src.frustumCulled;
      Object.assign(mesh.userData, src.userData);
    }
    mesh.userData.perfBatch = true;
    mesh.matrixAutoUpdate = false;
    anchor.add(mesh);
    mesh.updateMatrixWorld(true);
    const b = {
      mesh,
      parts: new Map(),
      live: 0,
      total: parts.length,
      shadow: !!shadow,
      side: gr.side,
      fresh: !!shadow && !gr.merged,
      orig: shadow ? null : idx.slice(),
    };
    for (const p of parts) {
      b.parts.set(p.o, p);
      b.live++;
      if (shadow) {
        const r = info.get(p.o);
        if (r && r.batches) r.batches.push(b);
        continue;
      } // the visible batch set up the watch
      const r = { state: 'batched', batches: [b], mask: p.o.layers.mask, snap: srcSnap(p.o), nodes: [] };
      info.set(p.o, r);
      live.add(p.o);
      p.o.layers.mask = HIDDEN;
      for (let n = p.o; n && n !== anchor; n = n.parent) {
        let w = watch.get(n);
        if (!w) watch.set(n, (w = { snap: nodeSnap(n), srcs: new Set() }));
        w.srcs.add(p.o);
        r.nodes.push(n);
      }
      let mw = mats.get(p.o.material);
      if (!mw) mats.set(p.o.material, (mw = { snap: matSnap(p.o.material), srcs: new Set() }));
      mw.srcs.add(p.o);
      stats.merged++;
    }
    batches.add(b);
    stats.batches = batches.size;
  }

  // ---------- release: a merged mesh goes back to drawing itself ----------
  function release(o, dynamic, ready = false, group = false) {
    const r = info.get(o);
    if (!r || r.state !== 'batched') return;
    for (const b of r.batches) {
      const p = b.parts.get(o);
      if (!p) continue;
      const idx = b.mesh.geometry.index;
      idx.array.fill(p.v0, p.i0, p.i0 + p.cnt); // collapsed to one point: draws nothing
      idx.addUpdateRange(p.i0, p.cnt);
      dirtyIdx.add(idx);
      b.parts.delete(o);
      b.live--;
      if (b.live <= 0) {
        b.mesh.parent && b.mesh.parent.remove(b.mesh);
        b.mesh.geometry.dispose();
        b.mesh.material.dispose();
        batches.delete(b);
        stats.batches = batches.size;
      }
    }
    o.layers.mask = r.mask;
    live.delete(o);
    if (lifted.delete(o)) twinsStale = true;
    for (const n of r.nodes) {
      const w = watch.get(n);
      if (w) {
        w.srcs.delete(o);
        if (!w.srcs.size) watch.delete(n);
      }
    }
    const mw = mats.get(o.material) || [...mats.entries()].find(([, v]) => v.srcs.has(o))?.[1];
    if (mw) {
      mw.srcs.delete(o);
    }
    for (const [m, v] of mats) if (!v.srcs.size) mats.delete(m);
    info.set(
      o,
      dynamic
        ? { state: 'dynamic' }
        : ready
          ? { state: 'wait', since: -1e9, snap: relSnap(o) }
          : { state: 'wait', since: performance.now() - (group ? STILL_MS - REGROUP_MS : 0), snap: '' },
    );
    stats.released++;
  }

  // ---------- outlines ----------
  // main.js outlines what Eric is near and what the mouse is over (game.objsOf). A merged mesh in that set is taken
  // out of its batch while it's outlined (its triangles there collapsed) and put back after, so the outline's depth
  // pass doesn't see it. Meanwhile its triangles draw from a twin of the batch (js/perf/batch-twin.js), one draw per
  // batch the thing was in, and the outline pass selects the twins in its place (forOutline, read by perf/outline.js).
  function outlined() {
    const want = new Set();
    if (game && game.place === place && game.objsOf && !game.busy) {
      const sel = [game.near, !document.body.classList.contains('phone') && game.hover].filter(Boolean);
      for (const m of sel) {
        let objs = [];
        try {
          objs = game.objsOf(m) || [];
        } catch {
          /* */
        }
        for (const x of objs)
          x &&
            x.traverse &&
            x.traverse((o) => {
              const r = info.get(o);
              if (r && r.state === 'batched') want.add(o);
            });
      }
    }
    for (const o of lifted)
      if (!want.has(o)) {
        lifted.delete(o);
        lift(o, false);
      }
    for (const o of want)
      if (!lifted.has(o)) {
        lifted.add(o);
        lift(o, true);
      }
    if (twinsStale) rebuildTwins();
  }
  function lift(o, out) {
    const r = info.get(o);
    if (!r || r.state !== 'batched') return;
    for (const b of r.batches) {
      if (b.shadow) continue;
      const p = b.parts.get(o);
      if (!p) continue;
      const idx = b.mesh.geometry.index;
      if (out) idx.array.fill(p.v0, p.i0, p.i0 + p.cnt);
      else idx.array.set(b.orig.subarray(p.i0, p.i0 + p.cnt), p.i0);
      idx.addUpdateRange(p.i0, p.cnt);
      dirtyIdx.add(idx);
    }
    twinsStale = true;
  }
  function rebuildTwins() {
    twinsStale = false;
    for (const t of twins.values()) dropTwin(t);
    twins.clear();
    twinOf.clear();
    const by = new Map();
    for (const o of lifted)
      for (const b of info.get(o).batches) {
        if (b.shadow || !batches.has(b) || !b.parts.has(o)) continue;
        if (!by.has(b)) by.set(b, []);
        by.get(b).push(o);
      }
    for (const [b, list] of by) {
      const t = makeTwin(
        b,
        list.map((o) => b.parts.get(o)),
      );
      t.visible = b.mesh.visible;
      twins.set(b, t);
      for (const o of list) twinOf.set(o, t);
    }
  }
  // what the outline pass selects for these meshes: a lifted mesh's twin instead of the mesh
  function forOutline(list) {
    return twinOf.size ? [...new Set(list.map((o) => twinOf.get(o) || o))] : list;
  }

  // ---------- every frame, before the first render pass ----------
  function check() {
    const t0 = performance.now();
    for (const [n, w] of watch) {
      if (nodeSame(n, w.snap)) continue;
      const srcs = [...w.srcs];
      if (n.isMesh && info.get(n) && info.get(n).state === 'batched') {
        // the mesh itself changed: it draws itself from now on; the others hanging under it are handled as a group
        release(n, true);
        for (const s of srcs) if (s !== n) release(s, false);
        movers.add(n);
      } else {
        // a group moved or showed/hid: merge its meshes again under it once they're still
        movers.add(n);
        for (const s of srcs) release(s, false, false, true);
        nextScan = Math.min(nextScan, performance.now() + REGROUP_MS);
      }
    }
    for (const o of live) {
      const r = info.get(o);
      if (!srcSame(o, r.snap)) release(o, true);
    }
    // a material that changed (the lift ride dims the floor's light pools) draws itself, and merges again once it
    // has held still; one that keeps changing (a third time) draws itself from then on
    for (const [m, w] of mats)
      if (!matSame(m, w.snap))
        for (const s of [...w.srcs]) {
          const n = (matFlips.get(s) || 0) + 1;
          matFlips.set(s, n);
          release(s, n >= 3);
        }
    outlined();
    for (const idx of dirtyIdx) idx.needsUpdate = true;
    dirtyIdx.clear();
    stats.checkMs += performance.now() - t0;
  }

  let fresh = true,
    regroup = false,
    raf = 0,
    nextScan = performance.now() + STILL_MS;
  const tick = () => {
    fresh = true;
    if (!dead) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  const prevOBR = scene.onBeforeRender;
  scene.onBeforeRender = function (...a) {
    if (fresh) {
      fresh = false;
      check();
      const now = performance.now();
      if (now > nextScan && !jobs.length) {
        nextScan = now + (regroup ? REGROUP_MS : 1000);
        regroup = false;
        scan(now, false);
        kick();
      }
    }
    return prevOBR.apply(this, a);
  };
  // A/B for the pixel checks: off shows every merged mesh on its own and hides the batches, on puts it back
  let shown = true;
  function toggle(on) {
    shown = on;
    for (const b of batches) b.mesh.visible = on;
    for (const t of twins.values()) t.visible = on;
    for (const [o, r] of info) if (r.state === 'batched') o.layers.mask = on ? HIDDEN : r.mask;
  }
  // one batch off (its meshes drawn on their own) or back on: the day check uses it to find which batch differs
  function toggleBatch(b, on) {
    b.mesh.visible = on;
    if (twins.has(b)) twins.get(b).visible = on;
    for (const o of b.parts.keys()) {
      const r = info.get(o);
      if (r && r.state === 'batched' && !b.shadow) o.layers.mask = on ? HIDDEN : r.mask;
      else if (r && b.shadow && !on) {
        /* shadow-only: its meshes cast through their own batch */
      }
    }
  }
  function describe(b) {
    const path = (o) => {
      const a = [];
      for (let x = o; x && x !== scene; x = x.parent)
        a.push(x.name || x.type[0] + (x.parent ? x.parent.children.indexOf(x) : '?'));
      return a.reverse().join('/');
    };
    const o = b.parts.keys().next().value;
    return {
      kind: b.shadow ? 'shadow' : 'visible',
      meshes: b.parts.size,
      anchor: path(b.mesh.parent),
      first: o ? path(o) : '',
      mat: o
        ? o.material.type +
          (o.material.transparent ? ' transparent' : '') +
          ' ' +
          (o.material.color ? '#' + o.material.color.getHexString() : '')
        : '',
    };
  }
  function dispose() {
    dead = true;
    cancelAnimationFrame(raf);
    scene.onBeforeRender = prevOBR;
    for (const t of twins.values()) dropTwin(t);
    twins.clear();
    twinOf.clear();
    for (const [o, r] of [...info]) if (r.state === 'batched') release(o, true);
  }

  // the first pass runs right after the place is built, off the critical path (it yields between slices)
  jobs.push(() => scanSteps(performance.now(), true));
  kick();
  return perf;
}
