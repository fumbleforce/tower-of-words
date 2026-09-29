// What a place is made of, for the perf pass: meshes, materials, geometries, triangles by subtree, and which
// nodes move, change visibility or swap materials during a few seconds of play.
//   node game3d/tools/perf/probe.mjs [place=office] [--secs 4]      (take the browser lock)
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
const argv = process.argv.slice(2);
const place = argv.find((a) => !a.startsWith('--')) || 'office';
const secs = +(argv[argv.indexOf('--secs') + 1] || 4);
const b = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 393, height: 851 } });
p.on('pageerror', (e) => console.log('pageerror', e.message));
await p.goto(`http://127.0.0.1:8771/game3d/index.html?q=1&place=${place}&skip`);
await p.waitForFunction(() => window.__game && window.__game.place && window.__done, null, { timeout: 180000 });
const r = await p.evaluate(async (secs) => {
  const g = window.__game, S = g.place.scene;
  const path = (o) => { const a = []; for (let x = o; x && x !== S; x = x.parent) a.push(x.name || x.type[0] + (x.parent ? x.parent.children.indexOf(x) : '')); return a.reverse().join('/'); };
  const meshes = []; S.traverse((o) => { if (o.isMesh || o.isLine || o.isPoints || o.isSprite) meshes.push(o); });
  const tri = (o) => { const gg = o.geometry; if (!gg) return 0; const n = gg.index ? gg.index.count : gg.attributes.position.count; return o.isMesh ? n / 3 * (o.count || 1) : 0; };
  const mats = new Set(), geos = new Set(); let skinned = 0, inst = 0, transparent = 0, named = 0, arr = 0, tris = 0, shadow = 0, skTris = 0;
  const sig = new Map();
  for (const o of meshes) {
    const m = o.material; (Array.isArray(m) ? m : [m]).forEach((x) => mats.add(x)); geos.add(o.geometry);
    if (o.isSkinnedMesh) { skinned++; skTris += tri(o); } if (o.isInstancedMesh) inst++; if (Array.isArray(m)) arr++; else if (m && m.transparent) transparent++;
    if (o.name) named++; if (o.castShadow) shadow++; tris += tri(o);
    if (!Array.isArray(m) && m) { const k = m.type + JSON.stringify([m.color && m.color.getHex(), m.emissive && m.emissive.getHex(), m.map && m.map.uuid, m.roughness, m.metalness, m.transparent, m.opacity, m.side, m.flatShading, m.vertexColors, m.emissiveIntensity]); sig.set(k, (sig.get(k) || 0) + 1); }
  }
  // triangles by top-2-level subtree
  const by = new Map();
  for (const o of meshes) { const pa = path(o).split('/').slice(0, 3).join('/'); const e = by.get(pa) || { n: 0, t: 0 }; e.n++; e.t += tri(o); by.set(pa, e); }
  // big meshes
  const big = meshes.map((o) => [path(o), Math.round(tri(o)), o.isSkinnedMesh ? 'skinned' : '']).sort((a, b) => b[1] - a[1]).slice(0, 25);
  // dynamics
  const nodes = []; S.traverse((o) => { if (o !== S) nodes.push(o); });
  const snap = (o) => [o.position.x, o.position.y, o.position.z, o.quaternion.x, o.quaternion.y, o.quaternion.z, o.quaternion.w, o.scale.x, o.scale.y, o.scale.z, o.visible, o.material ? (o.material.uuid || 'arr') : ''];
  const base = new Map(nodes.map((o) => [o, snap(o)]));
  const moved = new Map();
  const oldBR = S.onBeforeRender;
  let calls = 0;
  S.onBeforeRender = function (...a) { calls++; for (const o of nodes) { const s = snap(o), b0 = base.get(o); for (let i = 0; i < s.length; i++) if (s[i] !== b0[i]) { const k = i < 3 ? 'pos' : i < 7 ? 'rot' : i < 10 ? 'scale' : i === 10 ? 'vis' : 'mat'; const e = moved.get(o) || new Set(); e.add(k); moved.set(o, e); } } return oldBR.apply(this, a); };
  await new Promise((x) => setTimeout(x, secs * 1000));
  S.onBeforeRender = oldBR;
  const under = (o) => { let n = 0; o.traverse((c) => { if (c.isMesh) n++; }); return n; };
  const mv = [...moved.entries()].filter(([o]) => ![...moved.keys()].some((a) => a !== o && (() => { for (let x = o.parent; x; x = x.parent) if (x === a) return true; return false; })() && false)).map(([o, k]) => [path(o), [...k].join(','), under(o), o.type]);
  return { place: g.place.name, renderCalls: calls, meshes: meshes.length, materials: mats.size, uniqueMatSigs: sig.size, geometries: geos.size, skinned, skTris, inst, transparent, arrMat: arr, named, castShadow: shadow, tris: Math.round(tris), topSubtrees: [...by.entries()].sort((a, b) => b[1].t - a[1].t).slice(0, 25).map(([k, v]) => `${k} n=${v.n} t=${Math.round(v.t)}`), big, moved: mv.length, movedList: mv.slice(0, 120) };
}, secs);
console.log(JSON.stringify(r, null, 1));
await b.close();
