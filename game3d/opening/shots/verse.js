// Verse 1 (12.8 to 37.85 s), following the lyric: the morning monorail and the view from its window, the town that
// shines across the water, Mio a window along, the ID card in his pocket, Honsha station, the gate, the guard's
// good morning, then a run of beat cuts into the stop before the chorus.
import * as THREE from 'three';
import { HIT, bar, beat, pulse, onTwos } from '../timeline.js';
import { k, ease, clamp, lerp, glint, streaks, speedLines, toFrame, flare, text, typeIn, drawPortrait, vgrad, soft, sunburst, halftone, rng, FONT, W, H, IMG } from '../paint.js';
import { SUN } from '../sky.js';
import { idCard, gateLane } from '../props2d.js';
import { card, cardBack, nameBlock } from '../cards.js';
import { CAST } from '../cast.js';
import { ISLAND_X, STATION_X, PITCH } from '../stage.js';

const sunFar = SUN.clone().multiplyScalar(6000);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TRAIN_V = 26; // m/s along the line in the running shots

// soft pillar shadows passing over the frame, one per pillar the train passes
function pillarShadows(g, T, alpha = 0.22) {
  const period = 19 / TRAIN_V;
  const ph = (T / period) % 1;
  g.save();
  g.fillStyle = `rgba(20,30,60,${alpha})`;
  for (let i = -1; i < 2; i++) {
    const x = W * 1.3 - (ph + i) * W * 1.9;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + 140, 0);
    g.lineTo(x - 120, H);
    g.lineTo(x - 260, H);
    g.fill();
  }
  g.restore();
}
// a broad soft reflection sweeping across the glass
function glassSweep(g, lt, speed = 0.45, alpha = 0.18) {
  const x = ((lt * speed) % 1.6) * W * 1.4 - W * 0.4;
  const gr = g.createLinearGradient(x - 300, 0, x + 300, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)');
  gr.addColorStop(0.5, `rgba(255,250,240,${alpha})`);
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.save();
  g.fillStyle = gr;
  g.transform(1, 0, -0.4, 1, 0, 0);
  g.fillRect(x - 400, 0, 800 + H * 0.4, H);
  g.restore();
}

// the camera running outside a window of car `car` at x (car-local), looking back in at it
function windowShot(S, T, lt, car, wx, { dist = 3.2, drift = 0.6, h = 0.86 } = {}) {
  const x = 200 + T * TRAIN_V;
  S.setTrain(x);
  const cxw = x + (car - 1) * PITCH + wx;
  const p = lt;
  S.look([cxw + 1.2 - p * 0.12 * drift, h + 0.1, 1.3 + dist], [cxw - 0.1 - p * 0.05, h, 0], 30, 0.02);
}

export const VERSE = [
  {
    // 朝のモノレール 窓の外: Eric at the window of the middle car, the morning on his face, looking ahead.
    id: 'eric-window',
    t: [HIT.verse - 0.2, beat(40)],
    in: { type: 'whip', d: 0.34, at: 0.5 },
    setup(S) {
      // the window-seat pictures when they're there (just inside the glass, in front of the bench back), else the
      // base portraits
      S.seat('eric', IMG['win-eric'] || IMG['eric-neutral'], 1, -0.86, IMG['win-eric'] ? { h: 1.25, y: -0.04, z: 1.235 } : { h: 1.42, y: -0.02 });
      S.seat('mio', IMG['win-mio-phone'] || IMG['mio-phone'], 2, -0.86, IMG['win-mio-phone'] ? { h: 1.15, y: 0.17, z: 1.235 } : { h: 1.36, y: 0.0 });
    },
    scene3d(S, lt, T) {
      windowShot(S, T, lt, 1, -0.86, { dist: 3.0 });
    },
    draw(g, lt, T) {
      pillarShadows(g, T, 0.16);
      glassSweep(g, lt);
    },
  },
  {
    // ...and what he sees: the island across the water, sparkling, the pillars of the other line flicking past.
    id: 'view',
    t: [beat(40), beat(45.6)],
    in: { type: 'fade', d: 0.35, at: 0.5 },
    scene3d(S, lt, T) {
      const x = 660 + lt * TRAIN_V;
      S.setTrain(x - 400); // out of this view
      const yaw = 0.38 - lt * 0.02;
      S.look([x, 1.3, 1.4], [x + Math.cos(yaw) * 100, 1.3 - 2.6, Math.sin(-yaw) * -100], 34);
    },
    draw(g, lt, T, S) {
      // the window frame we look through
      g.save();
      g.fillStyle = '#26324a';
      g.beginPath();
      g.rect(-20, -20, W + 40, H + 40);
      g.roundRect(70, 60, W - 140, H - 120, 46);
      g.fill('evenodd');
      g.strokeStyle = 'rgba(200,214,230,0.5)';
      g.lineWidth = 6;
      g.beginPath();
      g.roundRect(70, 60, W - 140, H - 120, 46);
      g.stroke();
      g.restore();
      glassSweep(g, lt, 0.3, 0.12);
    },
  },
  {
    // 知らない街が 光ってる: low over the water toward the island; the train overtakes us on the beam.
    id: 'city',
    t: [beat(45.6), beat(56)],
    in: { type: 'iris', d: 0.5, at: 0.5, param: [0.62, 0.45, 0.02] },
    scene3d(S, lt, T) {
      // low over the water toward head office, the sun just behind its tower; the train runs past us
      const p = lt / 4.2;
      const hq = S.anchors.hq;
      const cx = 640 + lt * 24;
      S.setTrain(cx - 60 + lt * 40);
      S.look([cx, lerp(-12, -7, p), 34], [hq.x, lerp(hq.y + 26, hq.y + 34, ease.inOut2(p)), hq.z], lerp(30, 26, p));
    },
    draw() {
    },
    flare: () => 0.5,
    exposure: 0.72,
  },
  {
    // Mio, a window along, on her phone; she looks up on the beat.
    id: 'mio-window',
    t: [beat(56), beat(60.8)],
    in: { type: 'wipe', d: 0.32, at: 0.5, param: [Math.PI, 0.01, 0.025], band: '#34e0b0' },
    scene3d(S, lt, T) {
      const look = lt >= beat(58) - beat(56);
      const m = S.riders.mio;
      const phone = IMG['win-mio-phone'] || IMG['mio-phone'];
      const want = look ? IMG['win-mio-look'] || (IMG['win-mio-phone'] ? phone : IMG['mio-deadpan']) : phone;
      if (m.material.map.image !== want) {
        m.material.map = S.riderTex(want);
      }
      windowShot(S, T, lt, 2, -0.86, { dist: 2.8 });
    },
    draw(g, lt, T) {
      pillarShadows(g, T, 0.14);
      glassSweep(g, lt + 1.3);
    },
  },
  {
    // ポケットに IDカード: the new card, his photo on it, turned to the light.
    id: 'idcard',
    t: [beat(60.8), bar(18) + 0.4],
    in: { type: 'blinds', d: 0.42, at: 0.5, param: [0.35, 9] },
    draw(g, lt, T) {
      vgrad(g, [
        [0, '#bfe3f7'],
        [0.6, '#f6e3ee'],
        [1, '#ffe8cf'],
      ]);
      // bokeh of the morning outside
      const r = rng(21);
      for (let i = 0; i < 26; i++) {
        const x = r() * W + Math.sin(lt * 0.4 + i) * 20 - lt * 25,
          y = r() * H,
          rr = 40 + r() * 120;
        soft(g, ((x % (W + 300)) + W + 300) % (W + 300) - 150, y, rr, `rgba(255,255,255,${0.25 + r() * 0.35})`);
      }
      sunburst(g, W * 0.5, H * 0.5, 24, lt * 0.08, 'rgba(255,255,255,0.18)', 0.5);
      // the card flies up, turning, and lands; a shine on the beat; it tips toward us at the end
      const land = ease.land(clamp(lt / 0.55));
      const spin = (1 - ease.out3(clamp(lt / 0.6))) * Math.PI * 1.5;
      const sc = Math.cos(spin);
      const y = lerp(H + 420, H * 0.5, land) + Math.sin(lt * 1.6) * 8;
      const tip = k(lt, 3.6, 4.4, ease.inOut2);
      g.save();
      g.translate(W * 0.5, y);
      g.rotate(lerp(-0.12, 0, land) + Math.sin(lt * 1.1) * 0.015 - tip * 0.08);
      g.scale(Math.abs(sc) * (1 + tip * 0.35), 1 + tip * 0.35);
      if (sc < 0) {
        // the back of the card: navy with the rail
        g.fillStyle = '#1b2b4f';
        g.beginPath();
        g.roundRect(-380, -240, 760, 480, 30);
        g.fill();
        g.fillStyle = '#6fd0c6';
        g.fillRect(-380, -10, 760, 8);
      } else {
        const sh1 = clamp((T - beat(62)) / 0.6),
          sh2 = clamp((T - beat(66)) / 0.6);
        idCard(g, { shine: sh2 > 0 ? sh2 : sh1 > 0 && sh1 < 1 ? sh1 : -1 });
      }
      g.restore();
    },
  },
  {
    // Honsha: the train pulls in under the canopy, the station sign in front.
    id: 'station',
    t: [bar(18) + 0.4, beat(77.8)],
    in: { type: 'whip', d: 0.3, at: 0.5 },
    scene3d(S, lt, T) {
      // the train brakes to a stop by the sign
      const stopX = STATION_X - 22;
      const dur = 1.7;
      const u = clamp(lt / dur);
      const v0 = 30;
      const x = stopX - (v0 * dur) / 2 * (1 - u) ** 2;
      S.setTrain(x);
      S.station.visible = true;
      const sx = S.station.userData.signX;
      S.look([sx + 9 - lt * 0.6, 2.0, 4.6], [sx - 12, 1.6, 0.6], 38);
    },
    draw(g, lt) {
      // a little bump of motion lines while it brakes
      streaks(g, lt, { color: 'rgba(255,255,255,0.35)', count: 16, y0: 420, y1: 760, alpha: 0.5 * (1 - k(lt, 0.6, 1.5)), speed: 2600 });
    },
  },
  {
    // 今日からここで: the card on the gate reader, a teal ring, the flaps swing open.
    id: 'gate',
    t: [beat(77.8), bar(21) - 0.02],
    in: { type: 'dots', d: 0.45, at: 0.5, param: [0.4, 70] },
    draw(g, lt, T) {
      const tap = beat(79) - beat(77.8);
      const open = k(lt, tap + 0.4, tap + 0.95, ease.inOut2);
      const push = k(lt, tap + 0.7, 2.2, ease.in2);
      const lane = gateLane(g, { open, push, ring: clamp((lt - tap) / 0.7), lit: lt > tap ? 1 : 0 });
      // the card swoops in and taps the reader
      const e = ease.out5(clamp(lt / tap));
      const bob = lt > tap ? Math.exp(-(lt - tap) / 0.12) * 14 : 0;
      const [rx, ry] = lane.reader;
      g.save();
      // the card rides the same push down the lane as the gate
      const z = 1 + push * 0.9;
      g.translate(W * 0.52, H * 0.42);
      g.scale(z, z);
      g.translate(-W * 0.52, -H * 0.42);
      g.translate(lerp(rx + 800, rx + 20, e), lerp(ry - 520, ry - 70, e) - bob);
      g.rotate(lerp(0.5, -0.1, e));
      g.scale(0.4, 0.4);
      idCard(g, {});
      g.restore();
      if (lt > tap) typeIn(g, 'ピッ', rx + 250, ry - 260, lt - tap, { font: FONT.jp, size: 130, color: '#ffffff', stroke: '#1b2b4f', strokeW: 22, stagger: 0.05, from: 2 });
    },
    fx: (lt) => ({ flash: 0.3 * Math.exp(-Math.max(0, lt - (beat(79) - beat(77.8))) / 0.08) * (lt > beat(79) - beat(77.8) ? 1 : 0), flashColor: '#c9fff6' }),
  },
  {
    // 働くよ: the guard at his desk, as every morning: おはようございます.
    id: 'guard',
    t: [bar(21) - 0.02, bar(22)],
    in: { type: 'wipe', d: 0.3, at: 0.5, param: [0, 0.01, 0.03], band: '#ffd84a' },
    draw(g, lt) {
      card(g, lt, 'guard', { pic: 'guard-stern', swap: [0.8, 'guard-amused'], side: 'right', nameAt: 0.35 });
      // his good morning in a speech tag
      const t2 = lt - 0.85;
      if (t2 > 0) {
        const e = ease.land(clamp(t2 / 0.35));
        g.save();
        g.translate(1010, 300);
        g.scale(e, e);
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.roundRect(-330, -70, 660, 130, 65);
        g.fill();
        g.beginPath();
        g.moveTo(230, 50);
        g.lineTo(300, 110);
        g.lineTo(170, 55);
        g.fill();
        text(g, 'おはようございます', 0, 20, { font: FONT.jp, size: 62, align: 'center', color: '#22356c' });
        g.restore();
      }
    },
  },
  {
    // Build: the tower climbs into the sun; Eric looks up; Mio looks up; white.
    id: 'tower',
    t: [bar(22), beat(89)],
    in: { type: 'zoom', d: 0.3, at: 0.5 },
    scene3d(S, lt) {
      S.setTrain(-500);
      const hq = S.anchors.hq;
      const top = hq.y + hq.userData.height;
      const p = lt / 0.8;
      S.look([hq.x - 30, hq.y + 3, hq.z + 26], [hq.x, lerp(top * 0.75, top + 6, p), hq.z], 62, lerp(0.12, 0.05, p));
    },
    draw(g, lt, T, S) {
      speedLines(g, W / 2, H * 0.1, lt, { color: 'rgba(255,255,255,0.4)', count: 50, inner: 500, width: 5 });
    },
    flare: () => 1,
  },
  {
    id: 'eyes-eric',
    t: [beat(89), beat(90)],
    draw(g, lt) {
      eyes(g, lt, 'eric', 'eric-neutral', 1);
    },
  },
  {
    id: 'eyes-mio',
    t: [beat(90), beat(91)],
    draw(g, lt) {
      eyes(g, lt, 'mio', 'mio-smile', -1);
    },
  },
  {
    // the last beats before the stop: Eric rises out of white
    id: 'rise',
    t: [beat(91), HIT.stop],
    in: { type: 'flash', d: 0.2, at: 0.5 },
    draw(g, lt) {
      vgrad(g, [
        [0, '#ffffff'],
        [1, '#e3f4ff'],
      ]);
      sunburst(g, W / 2, H * 0.9, 30, lt * 0.3, 'rgba(111,208,198,0.18)', 0.5);
      const e = ease.out5(clamp(lt / 0.5));
      drawPortrait(g, 'eric-neutral', W / 2, H + 60 + (1 - e) * 300, 1000, { fill: '#1b2b4f', stroke: '#6fd0c6', strokeW: 8 });
    },
  },
  {
    // The band stops. White, still, the singer alone: はじめ...
    id: 'stop',
    t: [HIT.stop, HIT.chorus],
    draw(g, lt) {
      vgrad(g, [
        [0, '#fdfefe'],
        [1, '#eaf6ff'],
      ]);
      halftone(g, 'rgba(111,208,198,0.18)', 30, -0.4, (x, y) => clamp(1 - y / H + 0.1), null);
      drawPortrait(g, 'eric-neutral', W * 0.68, H + 40, 1000 + lt * 30, { stroke: '#ffffff', strokeW: 10, shadow: { dx: 24, dy: 0, color: '#6fd0c6' } });
      typeIn(g, 'はじめ', 200, 560, lt - 0.0, { font: FONT.jp, size: 190, color: '#1b2b4f', stagger: 0.28, dur: 0.3, from: 1.4 });
    },
    fx: () => ({ grain: 0.02, vignette: 0.15 }),
  },
];

const EYES = {
  'eric-neutral': [0.36, 0.32, 0.44],
  'mio-smile': [0.46, 0.36, 0.42],
  'kenji-grin': [0.5, 0.27, 0.44],
  'emi-neutral': [0.53, 0.3, 0.42],
  'aoi-neutral': [0.5, 0.31, 0.42],
  'carina-neutral': [0.55, 0.36, 0.44],
};
// An eye-line close-up: the top of the portrait, tilted, across the frame, over the person's colour with speed lines
function eyes(g, lt, id, pic, dir) {
  const p = CAST.get(id);
  g.fillStyle = p.bg;
  g.fillRect(0, 0, W, H);
  speedLines(g, W / 2, H / 2, lt, { color: 'rgba(255,255,255,0.35)', count: 80, inner: 560, width: 8 });
  const im = IMG[pic];
  if (!im) return;
  g.save();
  g.translate(W / 2 + dir * lt * 40, H / 2);
  g.rotate(-0.06 * dir);
  // the band across the eyes (centre and width as fractions of the picture, measured per portrait)
  const [ex, ey, ew] = EYES[pic];
  const sw = im.width * ew,
    sh = sw / ((W + 80) / 560);
  g.drawImage(im, im.width * ex - sw / 2, im.height * ey - sh / 2, sw, sh, -W / 2 - 40, -280, W + 80, 560);
  g.restore();
  g.fillStyle = '#fff';
  g.fillRect(0, H / 2 - 300, W, 14);
  g.fillRect(0, H / 2 + 286, W, 14);
}
