// Small beats of motion and sound for the moments that should feel good:
//   learned(game, 'word' | 'command')   a word or command learned: a ring runs out across the floor from Eric, a few
//                                       motes of light rise off him, the camera leans in a touch and back, and the
//                                       chime plays (the command one is fuller and borrows the kotodama's low tone)
// Motion is short (under a second), soft-edged and never blocks input.
import * as THREE from 'three';
import { sfx } from './sfx.js';

const COL = { word: '#6fd0c6', command: '#d8f8ff' };
let dotTex = null;
function tex() {
  if (dotTex) return dotTex;
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  return (dotTex = new THREE.CanvasTexture(c));
}

export async function learned(game, kind = 'word') {
  sfx(kind === 'command' ? 'command' : 'word');
  const place = game.place, who = game.player; if (!place || !who || !game.tween) return;
  place.cam?.nudge?.(kind === 'command' ? 1.1 : 0.9);
  const space = place.space, root = who.root, sc = place.charScale || 1;
  const col = new THREE.Color(COL[kind] || COL.word);
  const made = [];
  // floor rings (one for a word, two a beat apart for a command)
  const rings = [];
  for (let i = 0; i < (kind === 'command' ? 2 : 1); i++) {
    const m = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const r = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.325, 48), m); r.rotation.x = -Math.PI / 2; r.renderOrder = 3;
    r.position.set(root.position.x, (root.position.y || 0) + 0.015, root.position.z); space.add(r); made.push(r); rings.push({ r, m, d: i * 0.22 });
  }
  // motes rising off him
  const N = kind === 'command' ? 12 : 7;
  const pos = new Float32Array(N * 3), seeds = [];
  for (let i = 0; i < N; i++) seeds.push({ a: Math.random() * Math.PI * 2, r: 0.12 + Math.random() * 0.14, s: 0.5 + Math.random() * 0.5, d: Math.random() * 0.25 });
  const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pm = new THREE.PointsMaterial({ color: col, size: 0.09 * sc, map: tex(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, pm); pts.renderOrder = 6; space.add(pts); made.push(pts);
  const dur = kind === 'command' ? 1.3 : 1.0;
  await game.tween(dur, (k) => {
    const t = k * dur;
    for (const q of rings) {
      const u = Math.max(0, Math.min(1, (t - q.d) / 0.7)), e = 1 - (1 - u) ** 3;
      q.r.scale.setScalar((1 + e * 1.8) * sc); q.m.opacity = u > 0 ? (kind === 'command' ? 0.45 : 0.35) * (1 - u) ** 1.5 : 0;
      q.r.position.x = root.position.x; q.r.position.z = root.position.z;
    }
    for (let i = 0; i < N; i++) {
      const s = seeds[i], u = Math.max(0, (t - s.d) / (dur - s.d)), a = s.a + u * (kind === 'command' ? 2.2 : 1.2);
      pos[i * 3] = root.position.x + Math.cos(a) * s.r * sc * (1 + u * 0.4);
      pos[i * 3 + 1] = (root.position.y || 0) + (0.55 + u * 0.9 * s.s) * sc;
      pos[i * 3 + 2] = root.position.z + Math.sin(a) * s.r * sc * (1 + u * 0.4);
    }
    geo.attributes.position.needsUpdate = true;
    pm.opacity = k < 0.15 ? k / 0.15 : Math.max(0, 1 - (k - 0.5) / 0.5);
  });
  for (const o of made) { space.remove(o); o.geometry.dispose(); o.material.dispose(); }
}
