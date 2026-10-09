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
      // from low over the water up to the island seen whole from the south-west, as on the island map
      const p = ease.inOut3(clamp(lt / 3.2));
      S.setTrain(ISLAND_X - 240 + lt * 30);
      const m = S.anchors.mid;
      const from = [ISLAND_X - 140, -12, 150],
        to = [m.x - 260, 230, m.z + 470];
      S.look(from.map((v, i) => lerp(v, to[i], p)), [lerp(S.anchors.hq.x, m.x, p), lerp(14, -10, p), lerp(S.anchors.hq.z, m.z, p)], lerp(34, 38, p));
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
    // 言葉が僕の 魔法になる: words become his magic. Kana rise around him; ことば, then まほう, ripple out.
    id: 'kotodama',
    t: [B(109), B(120)],
    in: { type: 'iris', d: 0.4, at: 0.5, param: [0.5, 0.45, 0.03], band: '#6fd0c6' },
    draw(g, lt, T) {
      vgrad(g, [
        [0, '#0a1630'],
        [0.6, '#0d2c44'],
        [1, '#11475a'],
      ]);
      kanaRain(g, lt, { count: 46 });
      // the word lights his face from below
      const glowA = 0.5 + 0.5 * k(lt, 0.2, 1.2);
      soft(g, W * 0.5, H * 0.95, 900, 'rgba(111,208,198,0.5)', glowA);
      drawPortrait(g, 'eric-neutral', W * 0.5, H + 240, 980, { fill: '#0d2238', mix: 0.55, stroke: '#6fd0c6', strokeW: 6 });
      // ことば at 44.4, then まほう at 46.4, each with rings
      const t1 = T - 44.3,
        t2 = T - 46.35;
      ripples(g, W * 0.5, H * 0.24, t1, { n: 3, gap: 0.3, speed: 1000 });
      ripples(g, W * 0.5, H * 0.24, t2, { n: 5, gap: 0.22, speed: 1300, color: '255,255,255' });
      if (t1 > 0 && t2 < 0.1) {
        g.save();
        g.globalAlpha = 1 - clamp(t2 / 0.1);
        typeIn(g, 'ことば', W / 2, H * 0.3, t1, { font: FONT.jp, size: 200, align: 'center', color: '#e9fffb', stagger: 0.16, from: 1.6 });
        g.restore();
      }
      if (t2 > 0) {
        const e = ease.land(clamp(t2 / 0.35));
        g.save();
        g.translate(W / 2, H * 0.3 - 70);
        g.scale(lerp(1.8, 1, e), lerp(1.8, 1, e));
        glowText(g, 'まほう', 0, 70, { font: FONT.jp, size: 230, align: 'center', color: '#ffffff', glow: '#6fd0c6' });
        g.restore();
        // a burst of glints
        const r = rng(9);
        for (let i = 0; i < 12; i++) {
          const a = r() * Math.PI * 2,
            d = 200 + t2 * (300 + r() * 500);
          glint(g, W / 2 + Math.cos(a) * d, H * 0.26 + Math.sin(a) * d * 0.6, 40 * Math.max(0, 1 - t2 / 1.4), '#ffffff', 1, a);
        }
      }
    },
    fx: (lt, T) => ({ flash: 0.5 * Math.exp(-Math.max(0, T - 46.35) / 0.1) * (T > 46.35 ? 1 : 0), flashColor: '#bffff3' }),
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
    t: [B(133), B(139)],
    in: { type: 'dots', d: 0.4, at: 0.5, param: [0.5, 80] },
    draw(g, lt) {
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, W, H);
      const P = panels(3, -220, 4);
      const who = [
        ['kuro', 'kuro-neutral', 0],
        ['aoi', 'aoi-neutral', 0.8],
        ['rei', 'rei-neutral', 1.6],
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
    t: [B(139), B(141)],
    in: { type: 'whip', d: 0.22, at: 0.5 },
    draw(g, lt) {
      card(g, lt, 'kuroda', { pic: 'kuroda-sleepy', swap: [0.4, 'kuroda-panicked'], side: 'right', nameAt: 0.1, enter: 0.22 });
      if (lt > 0.4) typeIn(g, '!?', 1560, 330, lt - 0.4, { font: FONT.jp, size: 170, color: '#ffffff', stroke: '#22356c', strokeW: 24, from: 2.2 });
    },
    fx: (lt) => (lt > 0.4 ? { shake: [Math.sin(lt * 90) * 0.004 * Math.exp(-(lt - 0.4) / 0.15), 0] } : null),
  },
  {
    // 世界が少し 動き出す: the world starts to move. A big swing round the island as the train comes in.
    id: 'world',
    t: [B(141), B(145)],
    in: { type: 'zoom', d: 0.3, at: 0.5 },
    // 世界が少し 動き出す: the camera swings round the running train, the island bright behind it
    scene3d(S, lt) {
      const p = ease.inOut2(lt / 1.6);
      const x = ISLAND_X - 160 + lt * 30;
      S.setTrain(x);
      const ang = lerp(-2.2, -0.55, p),
        r = lerp(16, 13, p);
      S.look([x + Math.cos(ang) * r, lerp(2.5, 5.5, p), -Math.sin(ang) * r], [x + 3, 1.0, 0], 44, lerp(-0.08, 0.04, p));
    },
    draw(g, lt) {
      speedLines(g, W / 2, H / 2, lt, { color: 'rgba(255,255,255,0.35)', count: 30, inner: 700, width: 12 });
    },
    flare: () => 0.8,
  },
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
    scene3d(S, lt) {
      const x = 680 + lt * 18;
      S.setTrain(x);
      const cx = 668 + lt * 6;
      S.look([cx, -10, 88], [cx + 90, 9, -40], 32);
    },
    draw(g, lt) {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, 'rgba(10,20,50,0.35)');
      gr.addColorStop(0.5, 'rgba(10,20,50,0.0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
      drawLogo(g, lt, { size: 160, y: 380, shine: clamp((lt - 1.4) / 0.8) });
      gulls(g, [0, 1, 2].map((i) => ({ x: 1300 + i * 60 - lt * 40, y: 560 + (i % 2) * 22, s: 12, ph: i * 2 })), lt, 'rgba(30,44,80,0.7)');
    },
    flare: () => 0.85,
    fx: (lt) => ({ zoom: 1 + 0.03 * Math.exp(-lt / 0.3) }),
  },
];
