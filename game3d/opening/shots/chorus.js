// Chorus (38.82 to 64.43 s) and the title (to 70 s). The band slams back in on the island; then the roll call:
// the one who plays (Eric, or Carina), the words that become magic (kotodama), Mio, B2's team on 「てつだって」, the
// people of the island, a run of faces as the world starts to move, everyone together on the held note, and the
// title over the train as the interlude starts and the music fades.
import * as THREE from 'three';
import { HIT, bar, beat, pulse, END } from '../timeline.js';
import { k, ease, clamp, lerp, glint, speedLines, toFrame, text, typeIn, drawPortrait, vgrad, soft, sunburst, halftone, stripes, gulls, rng, FONT, W, H, IMG } from '../paint.js';
import { card, panelCard, shade } from '../cards.js';
import { CAST } from '../cast.js';
import { drawLogo } from '../logo.js';
import { ISLAND_X } from '../stage.js';
import { RUSH } from './verse.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const B = (n) => beat(n); // beat numbers: the chorus slam is beat 96, a bar is 4 beats

// a run of rising kana, the kotodama particles
const KANA = 'うごいてまってあけてとまってついてきこえるてつだってひらいてことばまほう';
function kanaRain(g, lt, { count = 40, seed = 5, color = '111,208,198', speed = 160, alpha = 1 } = {}) {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const ch = KANA[Math.floor(r() * KANA.length)];
    const x = r() * W,
      y0 = r() * (H + 400),
      sz = 30 + r() * 70,
      sp = speed * (0.5 + r());
    const y = ((((y0 - lt * sp) % (H + 400)) + H + 400) % (H + 400)) - 200;
    const tw = 0.5 + 0.5 * Math.sin(lt * 3 + i);
    text(g, ch, x, y, { font: FONT.jp, size: sz, align: 'center', color: `rgba(${color},${(0.25 + 0.55 * tw) * alpha})` });
  }
}
// rings spreading from a point
function ripples(g, x, y, t, { n = 4, gap = 0.35, speed = 900, color = '111,208,198', width = 6 } = {}) {
  for (let i = 0; i < n; i++) {
    const lt = t - i * gap;
    if (lt <= 0) continue;
    const r = lt * speed,
      a = Math.max(0, 1 - lt / 1.4);
    g.save();
    g.strokeStyle = `rgba(${color},${a})`;
    g.lineWidth = width * (1 + a);
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }
}
// glowing text: a blurred copy under a sharp one
function glowText(g, str, x, y, o) {
  g.save();
  g.filter = `blur(${Math.round((o.size || 100) * 0.12)}px)`;
  text(g, str, x, y, { ...o, color: o.glow || '#6fd0c6' });
  g.restore();
  text(g, str, x, y, o);
}

// a slanted panel layout: n panels across the frame, slant in pixels
function panels(n, slant = 160, gap = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * (W + slant) - slant / 2,
      b = ((i + 1) / n) * (W + slant) - slant / 2;
    out.push([
      [a + slant / 2 + gap, -10],
      [b + slant / 2 - gap, -10],
      [b - slant / 2 - gap, H + 10],
      [a - slant / 2 + gap, H + 10],
    ]);
  }
  return out;
}

export const CHORUS = [
  {
    // はじめまして, 新しい街: the band slams in on the island. The camera rises off the water as the train runs in.
    id: 'reveal',
    t: [HIT.chorus, bar(26)],
    in: { type: 'flash', d: 0.18, at: 0.5 },
    scene3d(S, lt) {
      // from the held frame (verse.js RUSH) up to the island seen whole from the south-west, as on the island map
      const p = ease.inOut3(clamp(lt / 3.2));
      S.setTrain(ISLAND_X - 300 + lt * 22);
      const m = S.anchors.mid;
      const from = RUSH[0].map((v) => v[1]),
        fromAt = RUSH[1].map((v) => v[1]);
      const to = [m.x - 200, 150, m.z + 300],
        toAt = [m.x, -16, m.z - 10];
      S.look(from.map((v, i) => lerp(v, to[i], p)), fromAt.map((v, i) => lerp(v, toAt[i], p)), lerp(36, 40, p));
    },
    draw(g, lt, T, S) {
      // the greeting lands with the band, then lifts away
      const a = 1 - k(lt, 1.2, 1.7);
      if (a > 0) {
        g.save();
        g.globalAlpha = a;
        const y = 300 - k(lt, 1.2, 1.7) * 40;
        typeIn(g, 'はじめまして', W / 2, y, lt + 0.6, { font: FONT.jp, size: 170, align: 'center', color: '#ffffff', stroke: '#1b2b4f', strokeW: 26, stagger: 0.07, from: 1.5 });
        g.restore();
      }
      gulls(g, [0, 1, 2, 3, 4].map((i) => ({ x: 400 + i * 90 + lt * 70, y: 260 + (i % 2) * 40 - lt * 20, s: 16, ph: i })), lt, 'rgba(30,44,80,0.8)');
    },
    flare: () => 0.9,
    fx: (lt) => ({ chroma: 0.008 * Math.exp(-lt / 0.2), zoom: 1 + 0.04 * Math.exp(-lt / 0.25) }),
  },
  {
    // The one who plays: Eric...
    id: 'hero-eric',
    t: [bar(26), B(107)],
    in: { type: 'wipe', d: 0.3, at: 0.5, param: [-2.6, 0.01, 0.04], band: '#6fd0c6' },
    draw(g, lt, T) {
      card(g, lt, 'eric', { pic: 'eric-neutral', side: 'right', nameAt: 0.25 });
      speedLines(g, W * 0.66, H * 0.45, lt, { color: 'rgba(255,255,255,0.18)', count: 40, inner: 520, width: 10 });
    },
  },
  {
    // ...or Carina, the same job and the same island
    id: 'hero-carina',
    t: [B(107), B(109)],
    in: { type: 'whip', d: 0.24, at: 0.5 },
    draw(g, lt) {
      card(g, lt, 'carina', { pic: 'carina-neutral', side: 'left', nameAt: 0.12, enter: 0.25 });
    },
  },
  {
    // 言葉が僕の 魔法になる: words become his magic. In B2's copy room (the game's own, scenes/office.js) the word card
    // for うごいて comes up as the game teaches it (the word, how it's read, what it means), its kana fly into the old
    // copier, and the copier shimmers teal and wakes; then まほう.
    id: 'kotodama',
    t: [B(109), B(120)],
    in: { type: 'iris', d: 0.4, at: 0.5, param: [0.5, 0.45, 0.03], band: '#6fd0c6' },
    scene3d(S, lt, T) {
      const w = S.set('office');
      const c = w.copier.position;
      const p = ease.inOut2(clamp(lt / 4.4));
      // the copier wakes when the word reaches it: its body glows teal, flickers, then settles
      const hit = T - 45.6;
      const glow = hit > 0 ? Math.exp(-hit / 0.9) * (0.6 + 0.4 * Math.sin(hit * 30) ** 2) : 0;
      w.copier.traverse((o) => {
        if (!o.isMesh) return;
        if (!o.userData.opBase) {
          o.material = o.material.clone();
          o.userData.opBase = true;
        }
        if (o.material.emissive) {
          o.material.emissive.set('#36e0c8');
          o.material.emissiveIntensity = glow * 1.4;
        }
      });
      S.look([c.x + lerp(1.1, 0.7, p), lerp(1.25, 1.1, p), c.z + lerp(2.2, 1.6, p)], [c.x, 0.62, c.z], lerp(46, 40, p));
    },
    draw(g, lt, T, S) {
      const w = S.set('office');
      const cp = w.copier.position;
      const target = toFrame(S.camera, V(cp.x, 0.7, cp.z)) || [W / 2, H / 2];
      // the word card, as the game shows a new word: the word, its reading, its meaning
      const t1 = T - 44.25;
      const fly = clamp((T - 45.1) / 0.5);
      if (t1 > 0 && fly < 1) {
        const e = ease.land(clamp(t1 / 0.35));
        g.save();
        g.globalAlpha = 1 - fly;
        g.translate(W * 0.3, H * 0.34);
        g.scale(e, e);
        g.fillStyle = 'rgba(14,22,44,0.88)';
        g.beginPath();
        g.roundRect(-300, -150, 600, 300, 26);
        g.fill();
        g.strokeStyle = '#6fd0c6';
        g.lineWidth = 4;
        g.stroke();
        text(g, 'NEW WORD', -260, -100, { font: FONT.mid, size: 30, color: '#6fd0c6', tracking: 0.2 });
        text(g, 'うごいて', 0, 30, { font: FONT.jp, size: 130, align: 'center', color: '#ffffff' });
        text(g, 'ugoite', 0, 85, { font: FONT.mid, size: 40, align: 'center', color: '#a9c4d8', tracking: 0.1 });
        text(g, '“move!” · ask a machine', 0, 128, { font: FONT.mid, size: 30, align: 'center', color: '#dfe9f2' });
        g.restore();
      }
      // the kana fly from the card into the copier, glowing
      if (fly > 0) {
        [...'うごいて'].forEach((ch, i) => {
          const tt = clamp((T - 45.1 - i * 0.08) / 0.55);
          if (tt <= 0 || tt >= 1) return;
          const e = ease.in2(tt);
          const x = lerp(W * 0.3 - 150 + i * 100, target[0], e),
            y = lerp(H * 0.36, target[1], e) - Math.sin(e * Math.PI) * 120;
          const size = 110 * (1 - e * 0.6);
          g.save();
          g.filter = 'blur(10px)';
          text(g, ch, x, y, { font: FONT.jp, size, align: 'center', color: '#6fd0c6' });
          g.restore();
          text(g, ch, x, y, { font: FONT.jp, size, align: 'center', color: '#ffffff' });
        });
      }
      // the copier answers: rings from it, and pages flying out
      const hit = T - 45.6;
      ripples(g, target[0], target[1], hit, { n: 3, gap: 0.25, speed: 900 });
      if (hit > 0) {
        const r = rng(13);
        for (let i = 0; i < 9; i++) {
          const ph = hit - i * 0.12;
          const dx = (r() - 0.3) * 900,
            dy = -200 - r() * 300,
            spin = 3 + r() * 4;
          if (ph <= 0 || ph > 1.6) continue;
          g.save();
          g.translate(target[0] + dx * ph, target[1] + dy * ph + 600 * ph * ph);
          g.rotate(ph * spin);
          g.fillStyle = '#ffffff';
          g.fillRect(-36, -48, 72, 96);
          g.fillStyle = 'rgba(27,43,79,0.25)';
          for (let l = 0; l < 5; l++) g.fillRect(-26, -34 + l * 14, 52, 4);
          g.restore();
        }
      }
      // まほう: the word for magic, over it all
      const t2 = T - 46.35;
      if (t2 > 0) {
        const e = ease.land(clamp(t2 / 0.35));
        g.save();
        g.translate(W / 2, H * 0.3 - 70);
        g.scale(lerp(1.8, 1, e), lerp(1.8, 1, e));
        glowText(g, 'まほう', 0, 70, { font: FONT.jp, size: 210, align: 'center', color: '#ffffff', glow: '#6fd0c6' });
        g.restore();
        text(g, 'mahō · magic', W / 2, H * 0.3 + 80, { font: FONT.mid, size: 40, align: 'center', color: '#e6fffb', alpha: clamp((t2 - 0.2) / 0.3), tracking: 0.12 });
      }
    },
    fx: (lt, T) => ({ flash: 0.4 * Math.exp(-Math.max(0, T - 45.6) / 0.12) * (T > 45.6 ? 1 : 0), flashColor: '#bffff3' }),
    exposure: 1.2,
  },
  {
    // Mio: B2's programmer, unimpressed, then not quite
    id: 'mio',
    t: [B(120), B(125)],
    in: { type: 'blinds', d: 0.36, at: 0.5, param: [-0.4, 8] },
    draw(g, lt) {
      card(g, lt, 'mio', { pic: 'mio-neutral', swap: [1.1, 'mio-smile'], side: 'left', nameAt: 0.3 });
    },
  },
  {
    // 小さな「手伝って」で: B2's team, one panel per beat-pair, then the word across them
    id: 'team',
    t: [B(125), B(133)],
    in: { type: 'wipe', d: 0.3, at: 0.5, param: [0, 0.01, 0.04], band: '#ffffff' },
    draw(g, lt, T) {
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, W, H);
      const P = panels(3, 220, 4);
      const who = [
        ['kenji', 'kenji-grin', 0],
        ['mori', 'mori-smile', 0.8],
        ['emi', 'emi-neutral', 1.6],
      ];
      who.forEach(([id, pic, at], i) => {
        const t = lt - at;
        if (t > 0) panelCard(g, t, id, P[i], { pic, dir: i % 2 ? -1 : 1, nameSize: 84, h: 900 });
      });
      // 「てつだって」 lands across the panels
      const t3 = lt - 2.4;
      if (t3 > 0) {
        const e = ease.out5(clamp(t3 / 0.3));
        g.save();
        g.fillStyle = 'rgba(14,22,44,0.82)';
        g.fillRect(0, 430 - e * 70, W, e * 140 + 20);
        g.restore();
        typeIn(g, '「てつだって」', W / 2, 545, t3, { font: FONT.jp, size: 120, align: 'center', color: '#ffffff', stagger: 0.05, from: 1.5, shadow: { color: '#6fd0c6', dx: 6, dy: 6 } });
      }
    },
  },
  {
    // The island's people: Kuro at reception, Aoi the new hire, Rei from Sales; then Mr. Hamada, asleep, then not
    id: 'island',
    t: [B(133), B(137.5)],
    in: { type: 'dots', d: 0.4, at: 0.5, param: [0.5, 80] },
    draw(g, lt) {
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, W, H);
      const P = panels(3, -220, 4);
      const who = [
        ['kuro', 'kuro-neutral', 0],
        ['aoi', 'aoi-neutral', 0.6],
        ['rei', 'rei-neutral', 1.2],
      ];
      who.forEach(([id, pic, at], i) => {
        const t = lt - at;
        if (t > 0) panelCard(g, t, id, P[i], { pic, dir: i % 2 ? 1 : -1, nameSize: 84, h: 900, nameRight: i === 2 });
      });
    },
  },
  {
    // Mr. Hamada, asleep as always, wakes with a start on the beat
    id: 'hamada',
    t: [B(137.5), B(141)],
    in: { type: 'whip', d: 0.22, at: 0.5 },
    draw(g, lt) {
      card(g, lt, 'kuroda', { pic: 'kuroda-sleepy', swap: [0.8, 'kuroda-panicked'], side: 'right', nameAt: 0.15, enter: 0.3 });
      if (lt > 0.8) typeIn(g, '!?', 1560, 330, lt - 0.8, { font: FONT.jp, size: 170, color: '#ffffff', stroke: '#22356c', strokeW: 24, from: 2.2 });
    },
    fx: (lt) => (lt > 0.8 ? { shake: [Math.sin(lt * 90) * 0.004 * Math.exp(-(lt - 0.8) / 0.15), 0] } : null),
  },
  // 世界が少し 動き出す: the world starts to move. One beat each: the monorail on its beam, then the island's places
  // in their newest look (the forecourt garden, head office over the forecourt, the plaza fountain).
  ...[
    [
      'place-monorail',
      (S, lt) => {
        // low beside the middle car on the level stretch, the train sliding past above the camera
        const x = 260 + lt * 18;
        S.setTrain(x);
        return [[x + 11 - lt * 7, -3.4, 12.5], [x - 1, -1.4, 0], 38];
      },
    ],
    [
      'place-garden',
      (S, lt) => {
        const A = S.anchors;
        const at = A.inPlace('forecourt', 23, 4.5, 0.5);
        const yaw = 0.5 + lt * 0.35,
          el = 0.82,
          d = 19 - lt * 3;
        return [[at.x + Math.sin(yaw) * Math.cos(el) * d, at.y + Math.sin(el) * d, at.z + Math.cos(yaw) * Math.cos(el) * d], at.toArray(), 44];
      },
    ],
    [
      'place-hq',
      (S, lt) => {
        // across the forecourt at the head office's south front (its footprint's z = -4.25), rising a little
        const A = S.anchors;
        return [A.toWorld(8.3 - lt * 3, 18 - lt * 3, 7 + lt * 1.5).toArray(), A.toWorld(3.3, -4.25, 8).toArray(), 48];
      },
    ],
    [
      'place-fountain',
      (S, lt) => {
        const A = S.anchors;
        const p = lt / 0.4;
        return [A.toWorld(37.3 - 1.5 * p, 13.5, 8.5 - 0.4 * p).toArray(), A.toWorld(37.3, -2.75, 0.4).toArray(), 50];
      },
    ],
  ].map(([id, frame], i) => ({
    id,
    t: [B(141 + i), B(142 + i)],
    in: i === 0 ? { type: 'zoom', d: 0.3, at: 0.5 } : { type: 'cut' },
    scene3d(S, lt) {
      if (id !== 'place-monorail') S.setTrain(-5000);
      const [pos, at, fov] = frame(S, lt);
      S.look(pos, at, fov);
    },
    draw(g, lt) {
      speedLines(g, W / 2, H / 2, lt, { color: 'rgba(255,255,255,0.22)', count: 26, inner: 760, width: 10 });
    },
    fx: (lt) => ({ zoom: 1 + 0.05 * Math.exp(-lt / 0.1) }),
    exposure: 1.05,
  })),
  // the faces, one per beat
  ...[
    ['mio', 'mio-surprised', 1],
    ['kenji', 'kenji-sheepish', -1],
    ['mori', 'mori-flustered', 1],
    ['emi', 'emi-neutral', -1],
    ['guard', 'guard-amused', 1],
  ].map(([id, pic, dir], i) => ({
    id: `face-${id}`,
    t: [B(145 + i), B(146 + i)],
    in: i === 0 ? { type: 'whip', d: 0.24, at: 0.5 } : { type: 'cut' },
    draw(g, lt) {
      const p = CAST.get(id);
      g.fillStyle = i % 2 ? p.ac : p.bg;
      g.fillRect(0, 0, W, H);
      sunburst(g, W / 2, H * 0.55, 20, lt * 0.6 * dir, i % 2 ? shade(p.ac, -0.12) : shade(p.bg, 0.1), 0.5);
      const e = ease.out5(clamp(lt / 0.18));
      drawPortrait(g, pic, W / 2 + (1 - e) * 300 * dir, H + 260, 1500 * (p.scale || 1), { stroke: '#ffffff', strokeW: 12 });
    },
  })),
  {
    // a breath: the frame closes to black on the gap
    id: 'gap',
    t: [B(150), HIT.post],
    draw(g, lt) {
      g.fillStyle = '#0a1020';
      g.fillRect(0, 0, W, H);
      const e = ease.inOut3(clamp(lt / 0.42));
      g.fillStyle = '#6fd0c6';
      g.fillRect(W / 2 - (1 - e) * W * 0.5, H / 2 - 3, (1 - e) * W, 6);
    },
  },
  {
    // Everyone together on the held note, lit up one after another
    id: 'lineup',
    t: [HIT.post, HIT.logo],
    in: { type: 'flash', d: 0.16, at: 0.3 },
    draw(g, lt) {
      vgrad(g, [
        [0, '#2c67cf'],
        [0.55, '#8fbff0'],
        [0.85, '#ffd9b5'],
        [1, '#ffe9d2'],
      ]);
      sunburst(g, W / 2, H * 0.95, 32, lt * 0.12, 'rgba(255,255,255,0.14)', 0.5);
      const z = lerp(1.1, 1.0, ease.out3(clamp(lt / 3.0)));
      g.save();
      g.translate(W / 2, H);
      g.scale(z, z);
      g.translate(-W / 2, -H);
      // two rows, the back one raised so every face shows over the front heads: [pic, x, h, lift, when it lights (s)]
      const row = [
        ['guard-amused', 230, 540, 480, 0.15],
        ['mori-smile', 530, 560, 470, 0.33],
        ['kuro-neutral', 830, 560, 480, 0.51],
        ['aoi-neutral', 1110, 560, 470, 0.69],
        ['rei-neutral', 1400, 560, 470, 0.87],
        ['kuroda-neutral', 1700, 540, 480, 1.05],
        ['kenji-grin', 270, 740, 0, 1.3],
        ['emi-neutral', 1650, 740, 0, 1.5],
        ['carina-neutral', 620, 760, 0, 1.7],
        ['mio-smile', 1300, 760, 0, 1.9],
        ['eric-neutral', 960, 800, 0, 2.15],
      ];
      for (const [pic, x, h, lift, on] of row) {
        const p = CAST.byPortrait(pic);
        const lit = clamp((lt - on) / 0.15);
        const rise = ease.out5(clamp((lt - on + 0.6) / 0.5));
        const back = lift > 0;
        drawPortrait(g, pic, x, H + 40 - lift + (1 - rise) * 200, h * (p.scale || 1), { fill: '#1b2b4f', mix: 1 - lit, stroke: back ? null : '#ffffff', strokeW: 7, fade: back ? 0.55 : 0, alpha: clamp((lt - on + 0.6) / 0.2) });
      }
      g.restore();
    },
  },
  {
    // The title: the train crosses toward the island in the morning light; the interlude starts; the music fades.
    id: 'title',
    t: [HIT.logo, END + 0.01],
    in: { type: 'flash', d: 0.2, at: 0.5 },
    // It ends by pushing in on the monorail to the game's own title framing (js/ui/title-camera.js TITLE_POSE land:
    // looking at [-2.6, -0.9, 0.6] off the middle car, 16 away, 24 degrees up, 30 round, fov 30), so the black at
    // the end opens straight onto the title screen's view of the same train.
    scene3d(S, lt) {
      const x = 360 + lt * 18; // on the level stretch, high over the bay as on the title
      S.setTrain(x);
      const p = ease.inOut3(clamp((lt - 1.5) / 3.9));
      const el = (24 * Math.PI) / 180,
        yaw = (30 * Math.PI) / 180,
        d = 16;
      const t = [x - 2.6, -0.9, 0.6];
      const pose = [t[0] + Math.sin(yaw) * Math.cos(el) * d, t[1] + Math.sin(el) * d, t[2] + Math.cos(yaw) * Math.cos(el) * d];
      const wide = [x - 12, -10, 88],
        wideAt = [x + 78, 9, -40];
      S.look(wide.map((v, i) => lerp(v, pose[i], p)), wideAt.map((v, i) => lerp(v, t[i], p)), lerp(32, 30, p));
    },
    draw(g, lt) {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, 'rgba(10,20,50,0.35)');
      gr.addColorStop(0.5, 'rgba(10,20,50,0.0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
      drawLogo(g, lt, { size: 160, y: 380, shine: clamp((lt - 1.4) / 0.8), out: ease.in2(clamp((lt - 2.0) / 1.0)) });
      gulls(g, [0, 1, 2].map((i) => ({ x: 1300 + i * 60 - lt * 40, y: 560 + (i % 2) * 22, s: 12, ph: i * 2 })), lt, 'rgba(30,44,80,0.7)');
    },
    flare: (lt) => 0.85 * (1 - clamp((lt - 1.5) / 3)),
    fx: (lt) => ({ zoom: 1 + 0.03 * Math.exp(-lt / 0.3) }),
  },
];
