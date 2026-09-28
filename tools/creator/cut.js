// Cut a source model into slots (hair, head, top, bottom, shoes, hands), one label per triangle.
// Meshy textures are a patchwork of small islands, roughly one per triangle, so the colour under each triangle's
// centre is a good hint; the strongest bone and the height do the rest. Rules per source come from library.json
// ("cut"): heights are fractions of the model's height, colours are sRGB.
import * as THREE from 'three';
import { BONES } from './recipe.js';

export function texSampler(tex) {
  const img = tex.image, c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  return (u, v) => {
    const px = Math.min(c.width - 1, Math.max(0, Math.floor(u * c.width))), py = Math.min(c.height - 1, Math.max(0, Math.floor(v * c.height)));
    const i = (py * c.width + px) * 4; return [d[i], d[i + 1], d[i + 2]];
  };
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const near = (c, list, r) => (list || []).some((k) => dist(c, k) < r);

// per-triangle facts: centre, normal, colour under the centre, strongest bone
export function triFacts(src) {
  const sample = texSampler(src.tex), out = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < src.T; t++) {
    a.fromArray(src.pos, t * 9); b.fromArray(src.pos, t * 9 + 3); c.fromArray(src.pos, t * 9 + 6);
    const cen = a.clone().add(b).add(c).divideScalar(3);
    const n = b.clone().sub(a).cross(c.clone().sub(a)); const area = n.length() / 2; n.normalize();
    let rgb = src.faceRGB[t];
    const textured = !rgb;
    if (!rgb) {
      const u = (src.uv[t * 6] + src.uv[t * 6 + 2] + src.uv[t * 6 + 4]) / 3, v = (src.uv[t * 6 + 1] + src.uv[t * 6 + 3] + src.uv[t * 6 + 5]) / 3;
      rgb = sample(u, v);
    }
    out.push({ cen, n, area, rgb, textured, bone: BONES[src.dom.td[t]] });
  }
  return out;
}

export function cutSource(src, cfg) {
  const F = triFacts(src);
  const skin = (c) => near(c, cfg.skin, cfg.skinR || 40);
  const hairC = (c) => near(c, cfg.hair, cfg.hairR || 45);
  const bottomC = (c) => near(c, cfg.bottom, cfg.bottomR || 40);
  const collar = src.P.Head.y + (cfg.collar || 0), hem = src.P.Hips.y + (cfg.hem || 0);
  // the face: the box of the skin on the head bones
  const faceBox = new THREE.Box3();
  F.forEach((f) => { if (/Head|headfront|head_end/.test(f.bone) && skin(f.rgb) && f.n.z > 0.2) faceBox.expandByPoint(f.cen); });
  faceBox.expandByScalar(cfg.facePad || 0.01);
  const labels = F.map((f) => {
    const y = f.cen.y, b = f.bone;
    if (/^(Head|head_end|headfront)$/.test(b)) {
      if (skin(f.rgb)) return 'head';
      const inFace = faceBox.containsPoint(f.cen) && f.n.z > 0.1 && Math.abs(f.cen.x - src.P.Head.x) < (cfg.faceHalf || 1);
      if (inFace && (cfg.eyesTextured ? f.textured : !hairC(f.rgb))) return 'head';
      return y < collar ? 'top' : 'hair';
    }
    if (b === 'neck') return skin(f.rgb) ? 'head' : y > collar ? 'hair' : 'top';
    if (/Hand$/.test(b)) return skin(f.rgb) ? 'hands' : 'top';
    if (/ForeArm$/.test(b)) return skin(f.rgb) ? 'hands' : 'top';
    if (/Arm$|Shoulder$/.test(b)) return 'top';
    if (/^Spine/.test(b)) return skin(f.rgb) ? 'head' : 'top';
    if (/Foot$|ToeBase$/.test(b)) return 'shoes';
    if (/Leg$/.test(b) && !/UpLeg/.test(b)) return 'bottom';
    // hips and thighs: the jacket or hoodie hangs over the top of them
    if (cfg.bottom) return bottomC(f.rgb) || y < hem ? 'bottom' : 'top';
    return y > hem ? 'top' : 'bottom';
  });
  // the key colour of each slot: the most common colour by area (for tinting), skin for the head and hands
  const keys = {};
  for (const slot of ['hair', 'head', 'top', 'bottom', 'shoes', 'hands']) {
    if (slot === 'head' || slot === 'hands') { keys[slot] = cfg.skin[0]; continue; }
    const bins = new Map();
    F.forEach((f, t) => {
      if (labels[t] !== slot) return;
      const k = f.rgb.map((x) => Math.round(x / 24)).join();
      const e = bins.get(k) || { a: 0, sum: [0, 0, 0] }; e.a += f.area; for (let i = 0; i < 3; i++) e.sum[i] += f.rgb[i] * f.area; bins.set(k, e);
    });
    let best = null; for (const e of bins.values()) if (!best || e.a > best.a) best = e;
    keys[slot] = best ? best.sum.map((x) => Math.round(x / best.a)) : [128, 128, 128];
  }
  return { labels, keys, facts: F };
}
