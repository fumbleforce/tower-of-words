// Honsha station's Blender-built outside (tools/station/station.py, game3d/assets/station/station.glb, #382): the
// station block finished on every side, the platform shed with its two side platforms, the covered walkway and the
// pieces the approach beams are strung from. Every node is one mesh in the forecourt's own frame, its colours in its
// vertices; the street style (scenes/diorama/) then finishes them by their `surf` like the rest of the forecourt.
//
// loadStationModel() is awaited before a place that builds the station is built (places/lifecycle.js: the forecourt
// and the shop street, whose station garden builds it again; the opening, game3d/opening/island.js, awaits it before
// buildForecourt). If the file can't be fetched (patchy signal) or the code runs outside a browser, stationModel()
// stays null and scenes/station-exterior.js and station-shed.js build the older code-made station instead.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from '../../vendor/loaders/GLTFLoader.js';
import { mat, textTexture, plane, JP_FONT } from '../props.js';
import { skyEnv } from '../train/models.js';

let parts = null,
  loading = null,
  lean = false;

// the places that build the station (the shop street builds it again over its station garden)
export const STATION_PLACES = new Set(['forecourt', 'shotengai', 'campus']); // campus: the platform shed only

// lighter: the phone's lighter build (perf/phone.js phoneLighter): no small detail nodes (st_fine, sh_fine)
export function loadStationModel({ lighter = false } = {}) {
  lean = lighter;
  if (typeof document === 'undefined') return Promise.resolve();
  return (loading ??= new GLTFLoader()
    .loadAsync(new URL('../../assets/station/station.glb', import.meta.url).href)
    .then((g) => {
      const out = {};
      g.scene.traverse((o) => o.isMesh && (out[o.name] = o.geometry));
      parts = out;
    })
    .catch((e) => console.warn('station.glb', e)));
}

// Set directly (tests).
export function setStationModel(p) {
  parts = p;
}
export const stationModel = () => parts;
export const stationLighter = () => lean;

// How each node looks: its street-style surface (diorama/materials.js finishStreet), roughness and metalness; glass
// is made separately (stationGlass). bounce: the light thrown up off the sunlit platforms and paving (below).
const LOOK = {
  st_walls: { surf: 'cladding', roughness: 0.9 },
  st_stone: { surf: 'stone', roughness: 0.85 },
  st_metal: { paint: true, roughness: 0.55, metalness: 0.25 },
  st_fine: { surf: 'metal', roughness: 0.5, metalness: 0.3 },
  sh_concrete: { surf: 'concrete', roughness: 0.9 },
  sh_metal: { paint: true, roughness: 0.4, metalness: 0.15, bounce: 0.42 },
  sh_fine: { surf: 'metal', roughness: 0.5, metalness: 0.3 },
  sh_roof: { paint: true, roughness: 0.4, metalness: 0.15, bounce: 0.3 },
  wk_roof: { paint: true, roughness: 0.4, metalness: 0.15, bounce: 0.3 },
};
const mats = {};

// Light thrown up off the sunlit platforms and paving onto the shed's soffit, the walkway's roof and the steel in
// their shade, which the sky's ground light alone leaves near black: the surface's own colour added back, in full on
// faces looking down, near half on upright ones, none on faces looking up (in the sun already).
function bounce(material, k) {
  material.userData.bounce = k;
  material.onBeforeCompile = (s) => {
    s.uniforms.uBounce = { value: k };
    s.fragmentShader =
      'uniform float uBounce;\n' +
      s.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * uBounce *
          clamp(0.45 - 0.55 * inverseTransformDirection(normal, viewMatrix).y, 0.0, 1.0);`,
      );
  };
  material.customProgramCacheKey = () => 'station-bounce-' + k;
}
// clone() leaves out the shader patch: a mesh whose material was copied (the fades, scenes/occluders.js) gets it back
export function keepBounce(mesh) {
  const m = mesh?.material,
    k = m?.userData.bounce;
  if (k && m.onBeforeCompile === THREE.Material.prototype.onBeforeCompile) bounce(m, k);
}

// A mesh of a node (null without the model), named `name`.
export function stationMesh(node, name = 'station:' + node, { cast = true, recv = true } = {}) {
  const g = parts?.[node];
  if (!g) return null;
  const { surf, paint, bounce: lift, ...look } = LOOK[node];
  // painted steel keeps its colours and a soft sky sheen (the monorail's, train/models.js), outside the street finish
  mats[node] ??= new THREE.MeshStandardMaterial({
    name: node,
    vertexColors: true,
    flatShading: true,
    ...look,
    ...(paint ? { envMap: skyEnv(), envMapIntensity: 0.45 } : {}),
  });
  if (paint) mats[node].userData.noLook = true;
  if (lift && !mats[node].userData.bounce) bounce(mats[node], lift);
  const m = new THREE.Mesh(g, mats[node]);
  m.name = name;
  if (surf) m.userData.surf = surf;
  else m.userData.noLook = true;
  m.castShadow = cast;
  m.receiveShadow = recv;
  return m;
}

// The glass nodes' panes, each a thin box of its own (24 corners, its face mapped 0..1), so the street style's
// window panes (diorama/glazing.js varyPanes) give every pane its own interior. The file has one quad per pane face.
const paneCache = new Map();
function panes(node) {
  if (paneCache.has(node)) return paneCache.get(node);
  const g = parts[node],
    pos = g.attributes.position,
    idx = g.index ? g.index.array : [...Array(pos.count).keys()];
  // triangles that share a corner belong to one quad
  const up = [...Array(pos.count).keys()],
    find = (i) => (up[i] === i ? i : (up[i] = find(up[i])));
  for (let t = 0; t < idx.length; t += 3) for (const k of [1, 2]) up[find(idx[t + k])] = find(idx[t]);
  const boxes = new Map(),
    p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const r = find(i);
    if (!boxes.has(r)) boxes.set(r, new THREE.Box3());
    boxes.get(r).expandByPoint(p.fromBufferAttribute(pos, i));
  }
  const list = [],
    seen = new Set(),
    s = new THREE.Vector3(),
    c = new THREE.Vector3();
  for (const b of boxes.values()) {
    b.getSize(s);
    b.getCenter(c);
    const key =
      c
        .toArray()
        .map((v) => v.toFixed(2))
        .join() +
      s
        .toArray()
        .map((v) => v.toFixed(2))
        .join();
    if (seen.has(key)) continue; // a pane's inner face, at the same place as its outer one
    seen.add(key);
    const t = 0.02;
    list.push(new THREE.BoxGeometry(Math.max(s.x, t), Math.max(s.y, t), Math.max(s.z, t)).translate(c.x, c.y, c.z));
  }
  const out = mergeGeometries(list);
  list.forEach((x) => x.dispose());
  paneCache.set(node, out);
  return out;
}

// The station's windows: the colour the street style knows as window glass (diorama/materials.js finishWindows), and
// its own material, which glows after work (kit/light/glow.js). The shed's glazing is plain glass that reflects the
// monorail's sky (train/models.js skyEnv) and lets the shed show through, so its north end and back wall read as
// glass from outside rather than as dark slabs in their shade.
export function stationGlass(node) {
  if (!parts?.[node]) return null;
  const shed = node !== 'st_glass';
  const material = shed
    ? new THREE.MeshStandardMaterial({
        color: '#c3d3dc',
        roughness: 0.1,
        metalness: 0.2,
        envMap: skyEnv(),
        envMapIntensity: 1.1,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      })
    : mat('#8c9dad', { roughness: 0.45, metalness: 0.05 }).clone();
  const m = new THREE.Mesh(shed ? parts[node] : panes(node), material);
  m.name = shed ? 'station:shedGlass' : 'station:glass';
  m.receiveShadow = true;
  return m;
}

// The approach beam and its piers along a list of points ([x, z], one metre or so apart) at the beam's top `top`:
// segments of ap_beam, and at each `piers` index a column (ap_col) under a hammerhead (ap_head), turned to the beam.
export function approachGeometry(points, top, piers, beamH) {
  if (!parts?.ap_beam) return null;
  const beam = [],
    heads = [],
    m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    UP = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i + 1 < points.length; i++) {
    const [ax, az] = points[i],
      [bx, bz] = points[i + 1],
      len = Math.hypot(bx - ax, bz - az);
    q.setFromAxisAngle(UP, Math.atan2(bx - ax, bz - az));
    m.compose(new THREE.Vector3(ax, top, az), q, new THREE.Vector3(1, 1, len + 0.02));
    beam.push(parts.ap_beam.clone().applyMatrix4(m));
  }
  for (const i of piers) {
    const [ax, az] = points[i],
      [bx, bz] = points[Math.min(points.length - 1, i + 1)];
    q.setFromAxisAngle(UP, Math.atan2(bx - ax, bz - az));
    const foot = top - beamH;
    m.compose(new THREE.Vector3(ax, foot, az), q, new THREE.Vector3(1, 1, 1));
    heads.push(parts.ap_head.clone().applyMatrix4(m));
    m.compose(new THREE.Vector3(ax, 0, az), q, new THREE.Vector3(1, foot - 0.55, 1));
    heads.push(parts.ap_col.clone().applyMatrix4(m));
  }
  const out = [mergeGeometries(beam), heads.length ? mergeGeometries(heads) : null];
  [...beam, ...heads].forEach((g) => g.dispose());
  return out;
}

// the name: 本社駅 HONSHA STATION, white on slate (on the roof, and on the platforms' name boards)
let signTex = null;
export function stationSign(w = 4.4, h = 0.55) {
  signTex ??= textTexture(
    (ctx, W, H) => {
      ctx.fillStyle = '#3f4650';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#e8e9e6';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      ctx.font = '700 88px ' + JP_FONT;
      ctx.fillText('本社駅', W * 0.44, H / 2 + 4);
      ctx.textAlign = 'left';
      ctx.font = '600 54px sans-serif';
      ctx.fillText('HONSHA STATION', W * 0.48, H / 2 + 4);
    },
    1024,
    128,
  );
  const s = plane(w, h, signTex);
  s.name = 'station:sign';
  return s;
}
