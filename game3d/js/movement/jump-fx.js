// What a jump looks and sounds like round him (jump.js): a puff of dust at his feet on takeoff and landing, a short
// springy rise for the jump and a soft thump for the landing. The sounds are made here with Web Audio, like the
// motor hum (sfx.js hum): no files. Nothing sounds while muted or before the first tap.
//   dust(game, root, size)     a ring of puffs at his feet, in his place's space; they fade and are removed
//   jumpSound(pitch)           the jump: a quick rising tone
//   landSound(impact)          the landing: a low thump, louder for a bigger fall (impact 0..1.4)
//   fallSound()                a long falling whistle, for a fall off something high (falls.js)
import * as THREE from 'three';
import { running, bus, isMuted } from '../sfx.js';

let tex = null;
function puffTexture() {
  if (tex) return tex;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d'),
    gr = g.createRadialGradient(16, 16, 1, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)');
  gr.addColorStop(0.6, 'rgba(255,255,255,0.35)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 32, 32);
  tex = new THREE.CanvasTexture(c);
  return tex;
}

// the puffs alive now, stepped by the game's tweens; each removes itself
const LIFE = 0.42,
  N = 7;
export function dust(game, root, size = 1) {
  const space = root.parent;
  if (!space || !game.tween) return;
  const k = (root.scale.x || 1) * size,
    p = root.position.clone(); // where he was: the puffs stay as he moves on
  const mat = new THREE.SpriteMaterial({
    map: puffTexture(),
    color: '#d8d3c8',
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const puffs = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + Math.random() * 0.5,
      sp = new THREE.Sprite(mat);
    sp.position.set(p.x, p.y + 0.05 * k, p.z);
    sp.scale.setScalar(0.12 * k);
    sp.userData.dir = [Math.sin(a), Math.cos(a)];
    sp.renderOrder = 2;
    space.add(sp);
    puffs.push(sp);
  }
  game.tween(LIFE, (t) => {
    const e = 1 - (1 - t) * (1 - t);
    for (const sp of puffs) {
      const [dx, dz] = sp.userData.dir;
      sp.position.set(p.x + dx * 0.32 * k * e, p.y + (0.05 + 0.1 * e) * k, p.z + dz * 0.32 * k * e);
      sp.scale.setScalar((0.12 + 0.2 * e) * k);
    }
    mat.opacity = 0.55 * (1 - t);
    if (t >= 1) {
      for (const sp of puffs) space.remove(sp);
      mat.dispose();
    }
  });
}

function voice(c, { type = 'sine', f0, f1, t, gain, at = 0 }) {
  const o = c.createOscillator(),
    g = c.createGain(),
    now = c.currentTime + at;
  o.type = type;
  o.frequency.setValueAtTime(f0, now);
  o.frequency.exponentialRampToValueAtTime(f1, now + t);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, now + t);
  o.connect(g).connect(bus('sfx'));
  o.start(now);
  o.stop(now + t + 0.02);
}

export function jumpSound(pitch = 1) {
  const c = !isMuted() && running();
  if (!c) return;
  // a rounded "boing": a sine sweeping up, a soft square an octave under it for the bite
  voice(c, { f0: 260 * pitch, f1: 820 * pitch, t: 0.16, gain: 0.16 });
  voice(c, {
    type: 'square',
    f0: 130 * pitch,
    f1: 410 * pitch,
    t: 0.1,
    gain: 0.025,
  });
}

export function landSound(impact = 1) {
  const c = !isMuted() && running();
  if (!c) return;
  const g = Math.min(1, 0.35 + impact * 0.5);
  voice(c, { f0: 150, f1: 55, t: 0.12, gain: 0.22 * g });
  // the scuff of his shoes: a short burst of filtered noise
  const len = Math.floor(c.sampleRate * 0.07),
    b = c.createBuffer(1, len, c.sampleRate),
    d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = c.createBufferSource(),
    lp = c.createBiquadFilter(),
    gn = c.createGain();
  src.buffer = b;
  lp.type = 'lowpass';
  lp.frequency.value = 1400;
  gn.gain.value = 0.12 * g;
  src.connect(lp).connect(gn).connect(bus('sfx'));
  src.start();
}

export function fallSound() {
  const c = !isMuted() && running();
  if (!c) return;
  voice(c, { f0: 1400, f1: 260, t: 1.1, gain: 0.07 });
}
