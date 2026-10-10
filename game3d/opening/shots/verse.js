// Verse 1 (12.8 to 37.85 s), following the lyric: the morning monorail and the view from its window, the town that
// shines across the water, Mio a window along, the ID card in his pocket, Honsha station, the gate, the guard's
// good morning, then a run of beat cuts into the stop before the chorus.
import * as THREE from 'three';
import { HIT, bar, beat, pulse, onTwos } from '../timeline.js';
import { k, ease, clamp, lerp, glint, streaks, speedLines, toFrame, flare, text, typeIn, drawPortrait, vgrad, soft, sunburst, halftone, rng, FONT, W, H, IMG } from '../paint.js';
import { SUN } from '../sky.js';
import { idCard, gateLane } from '../props2d.js';
import { EXIT_X } from '../../js/scenes/station-fittings.js';
import { card, cardBack, nameBlock } from '../cards.js';
import { CAST } from '../cast.js';
import { ISLAND_X, PITCH, beamY, BEAM_TOP } from '../stage.js';

const sunFar = SUN.clone().multiplyScalar(6000);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TRAIN_V = 26; // m/s along the line in the running shots
const WIN_MODE = new URLSearchParams(location.search).get('win') || 'model'; // Review opening-window-2: the 3D models
// the rush over the water toward the island before the stop, and the held frame of its end: [x, y, z] ranges of the
// camera and of where it looks (the reveal starts from the same frame; chorus.js REVEAL_FROM)
export const RUSH = [
  [
    [ISLAND_X - 360, ISLAND_X - 150],
    [-13.5, -12],
    [70, 120],
  ],
  [
    [ISLAND_X + 60, ISLAND_X + 90],
    [6, 4],
    [-20, -24],
  ],
];

// はじめまして as one word across the stop and the reveal: はじめ types in on the held frame where the whole word will
// stand, and on the slam まして finishes it in place (chorus.js reveal). held, rest: each part's typing time (<= 0: not yet)
const HAJIME = { font: FONT.jp, size: 190, color: '#1b2b4f', stroke: '#ffffff', strokeW: 16, stagger: 0.28, dur: 0.3, from: 1.4, shadow: { color: 'rgba(111,208,198,0.9)', dx: 10, dy: 10 } };
export function hajime(g, held, rest, { y = 520, alpha = 1 } = {}) {
  g.save();
  g.font = `${HAJIME.size}px ${HAJIME.font}`;
  const [a, b] = ['はじめ', 'まして'].map((str) => [...str].reduce((w, c) => w + g.measureText(c).width, 0));
  g.restore();
  const x = W / 2 - (a + b) / 2;
  typeIn(g, 'はじめ', x, y, held, { ...HAJIME, alpha });
  if (rest > 0) typeIn(g, 'まして', x + a, y, rest, { ...HAJIME, stagger: 0.07, from: 1.6, alpha });
}
// the held frame's pale wash and halftone (the stop, and lifting off at the start of the reveal)
export function heldWash(g, a = 1) {
  g.fillStyle = `rgba(246,250,255,${0.62 * a})`;
  g.fillRect(0, 0, W, H);
  halftone(g, `rgba(27,43,79,${0.12 * a})`, 22, -0.4, (x, y) => clamp(0.15 + (y / H) * 0.5), null);
}

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
  const x = 120 + T * 18; // still on the level stretch, before the line comes down to the island
  S.setTrain(x);
  const cxw = x + (car - 1) * PITCH + wx;
  const p = lt;
  S.look([cxw + 1.2 - p * 0.12 * drift, h + 0.1, 1.3 + dist], [cxw - 0.1 - p * 0.05, h, 0], 30, 0.02);
}

// the gate shot, after Ishibashi's card (Jørgen 2026-10-09: his card before the gate, not after the doors open):
// its span, when the card touches the reader (on a beat), and its length
const GATE = [beat(81.8), bar(22)];
const GATE_TAP = beat(83) - GATE[0];
const GATE_END = GATE[1] - GATE[0];
// the station exit's doors for the gate shot: two glass leaves in the lobby's exit frame (station-fittings.js
// exitFrame, 1.2 wide and 1.44 high at EXIT_X in the back wall) and the bright morning beyond. Added to the opening's
// own copy of the lobby, once; returns open(k), 0 shut to 1 slid behind the wall
function exitDoors(w) {
  if (w.openExit) return w.openExit;
  const z = -4.5; // the back wall (scenes/lobby.js Z)
  const frame = new THREE.MeshStandardMaterial({ color: '#5a606a', roughness: 0.5, metalness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: '#bcd3dc', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.45 });
  const leaves = [-1, 1].map((side) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, 0.04), frame));
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.26, 0.045), glass);
    g.add(pane);
    g.position.set(EXIT_X + side * 0.3, 0.7, z + 0.02);
    g.userData.side = side;
    w.root.add(g);
    return g;
  });
  const light = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.2), new THREE.MeshBasicMaterial({ color: '#fff4dc', toneMapped: false }));
  light.position.set(EXIT_X, 0.9, z - 1.4);
  w.root.add(light);
  w.openExit = (o) => leaves.forEach((g) => (g.position.x = EXIT_X + g.userData.side * (0.3 + 0.62 * o)));
  return w.openExit;
}

export const VERSE = [
  {
    // 朝のモノレール 窓の外: Eric at the window of the middle car, the morning on his face, looking ahead.
    id: 'eric-window',
    t: [HIT.verse - 0.2, beat(40)],
    in: { type: 'whip', d: 0.34, at: 0.5 },
    // Who sits at the windows (?win=): 'model', the game's 3D Eric and Mio on the far bench; 'small', the
    // window-seat pictures at a passenger's size on that bench; 'big', the pictures close to the glass (first cut).
    async setup(S) {
      const how = WIN_MODE;
      if (how === 'model') {
        const m = await S.seatModels([
          ['eric', 1, -1.25],
          ['mio', 2, -1.75],
        ]);
        if (m.eric && m.mio) return;
      }
      const far = { z: -(0.96), y: 0.12 };
      const big = how === 'big';
      S.seat('eric', IMG['win-eric'] || IMG['eric-neutral'], 1, big ? -0.86 : -1.25, big ? { h: 1.25, y: -0.04, z: 1.235 } : { h: 0.92, ...far });
      S.seat('mio', IMG['win-mio-phone'] || IMG['mio-phone'], 2, big ? -0.86 : -1.75, big ? { h: 1.15, y: 0.17, z: 1.235 } : { h: 0.86, ...far });
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
      const y = beamY(x) - BEAM_TOP + 1.3; // at a passenger's eye height as the line comes down
      S.look([x, y, 1.4], [x + Math.cos(yaw) * 100, y - 2.6, Math.sin(-yaw) * -100], 34);
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
      if (!m) {
        // the 3D Mio: looking down at her phone, then on the beat she lifts her head and looks out at us
        const mio = S.models.mio;
        if (mio) {
          if (!mio.userData) mio.userData = {};
          if (!mio.userData.head) mio.model.traverse((o) => o.isBone && /^Head$/i.test(o.name) && (mio.userData.head = o));
          const hb = mio.userData.head;
          if (hb) {
            hb.userData.base ??= hb.quaternion.clone();
            // bowed over the phone (+x tips the head forward on this rig), then up to look straight out at us
            const k2 = ease.out3(clamp((lt - (beat(58) - beat(56))) / 0.3));
            hb.quaternion.copy(hb.userData.base).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(lerp(0.42, -0.04, k2), 0.22 * k2, 0)));
          }
        }
        windowShot(S, T, lt, 2, -0.86, { dist: 2.8 });
        return;
      }
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
    // Honsha: under the game's own platform shed (scenes/station-shed.js, built on the island), the train runs in
    // along the platform and stops under the shed; the camera stands raised at the shed's south end.
    id: 'station',
    t: [bar(18) + 0.4, beat(77.8)],
    in: { type: 'whip', d: 0.3, at: 0.5 },
    scene3d(S, lt) {
      const A = S.anchors;
      const dur = 1.75;
      const u = clamp(lt / dur);
      const back = 44 * (1 - u) ** 2; // braking: distance still to run
      // the beam inside the shed runs north along island x -28.6, the shed's middle (island-layout.js, the monorail
      // line since the station's Blender rebuild); the train stops with its middle at z 1.5
      const at = A.toWorld(-28.6, 1.5 + back, 2.5);
      const ahead = A.toWorld(-28.6, 0.5 + back, 2.5).sub(at);
      S.setTrainPose(at, ahead);
      // raised at the shed's south end, east of the platform: the blue roof, the platform and the town beyond, and
      // the train running in past us up the beam
      const eye = A.toWorld(-21.5 - lt * 0.4, 31 - lt * 0.6, 10.5 - lt * 0.3); // toWorld(x, z, height); over the walkway roofs
      const look = A.toWorld(-27.8, 2, 3.2);
      S.look(eye.toArray(), look.toArray(), 44);
    },
    draw(g, lt) {
      streaks(g, lt, { color: 'rgba(255,255,255,0.3)', count: 14, y0: 380, y1: 820, alpha: 0.45 * (1 - k(lt, 0.5, 1.6)), speed: 2600 });
    },
    exposure: 1.05,
  },
  {
    // the guard at his desk, as every morning: おはようございます. Then his gate.
    id: 'guard',
    t: [beat(77.8), GATE[0]],
    in: { type: 'wipe', d: 0.3, at: 0.5, param: [0, 0.01, 0.03], band: '#ffd84a' },
    draw(g, lt) {
      card(g, lt, 'guard', { pic: 'guard-stern', swap: [0.8, 'guard-amused'], side: 'right', nameAt: 0.35 });
      // his good morning in a speech tag
      const t2 = lt - 0.85;
      if (t2 > 0) {
        const e = ease.land(clamp(t2 / 0.35));
        g.save();
        g.translate(640, 300); // left of his face, the tail pointing to him
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
    // 今日からここで: the game's own security gate (scenes/lobby.js). His card on the reader, the lights go green,
    // the glass flaps swing open and we go through.
    id: 'gate',
    t: GATE,
    in: { type: 'dots', d: 0.45, at: 0.5, param: [0.4, 70] },
    scene3d(S, lt) {
      const w = S.set('lobby');
      const tap = GATE_TAP;
      const open = k(lt, tap + 0.25, tap + 0.85, ease.inOut2);
      w.arch.userData.set?.(lt > tap ? 'ok' : 'idle');
      w.arch.userData.flaps?.(open);
      // low by the right-hand reader, then through the lane and on to the station exit, whose doors slide open
      // onto the morning outside (the light floods in and carries into the next shot)
      const push = k(lt, tap + 0.6, GATE_END, ease.inOut2);
      const turn = k(lt, tap + 0.3, tap + 1.3, ease.inOut2);
      exitDoors(w)(k(lt, GATE_END - 0.9, GATE_END - 0.2, ease.inOut2));
      S.look(
        [lerp(0.55, EXIT_X + 0.05, push), lerp(1.0, 0.95, push), lerp(1.55, -3.0, push)],
        [lerp(0.85, EXIT_X, turn), lerp(0.85, 0.9, turn), lerp(-2.6, -9, turn)],
        50,
      );
    },
    draw(g, lt, T, S) {
      const tap = GATE_TAP;
      // where the reader's top is on screen
      const rp = toFrame(S.camera, V(0.93, 0.98, -0.55)) || [W * 0.7, H * 0.6];
      const e = ease.out5(clamp(lt / tap));
      const bob = lt > tap ? Math.exp(-(lt - tap) / 0.12) * 14 : 0;
      const leave = k(lt, tap + 0.35, tap + 0.8, ease.in2);
      g.save();
      g.translate(lerp(rp[0] + 520, rp[0] - 10, e), lerp(rp[1] - 420, rp[1] - 30, e) - bob + leave * 700);
      g.rotate(lerp(0.5, -0.1, e));
      g.scale(0.36, 0.36);
      idCard(g, {});
      g.restore();
      if (lt > tap) {
        const t2 = lt - tap;
        glint(g, rp[0], rp[1] - 10, 120 * Math.exp(-t2 / 0.25), '#c9ffe6', 1);
        if (t2 < 0.8) typeIn(g, 'ピッ', rp[0] + 180, rp[1] - 210, t2, { font: FONT.jp, size: 120, color: '#ffffff', stroke: '#1b2b4f', strokeW: 20, stagger: 0.05, from: 2, alpha: 1 - k(t2, 0.5, 0.8) });
      }
    },
    fx: (lt) => {
      const tap = GATE_TAP;
      const beep = lt > tap ? 0.25 * Math.exp(-(lt - tap) / 0.08) : 0;
      const outside = 0.85 * k(lt, GATE_END - 0.45, GATE_END, ease.in2); // the doorway's light filling the frame
      return beep > outside ? { flash: beep, flashColor: '#c9fff0' } : { flash: outside, flashColor: '#fff6e4' };
    },
    exposure: 1.15,
  },
  {
    // Build: the tower climbs into the sun; Eric looks up; Mio looks up; white.
    id: 'tower',
    t: [bar(22), beat(89)],
    in: { type: 'flash', d: 0.14, at: 0.4 }, // out of the station exit's light (the gate shot); short, so the one-beat tower reads
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
    // the last bar before the stop: low and fast over the water toward the island, the sun behind head office
    id: 'rush',
    t: [beat(91), HIT.stop],
    in: { type: 'flash', d: 0.2, at: 0.5 },
    scene3d(S, lt) {
      S.setTrain(-5000);
      const p = ease.out3(clamp(lt / (HIT.stop - beat(91))));
      const [from, to] = RUSH;
      S.look(from.map((v, i) => lerp(v[0], v[1], p)), to.map((v, i) => lerp(v[0], v[1], p)), lerp(42, 36, p));
    },
    draw(g, lt) {
      speedLines(g, W / 2, H * 0.45, lt, { color: 'rgba(255,255,255,0.4)', count: 36, inner: 560, width: 12 });
    },
    flare: () => 0.6,
  },
  {
    // The band stops. The picture stops with it, washed pale like a held frame, and she sings alone: はじめ...
    id: 'stop',
    t: [HIT.stop, HIT.chorus],
    scene3d(S) {
      S.setTrain(-5000);
      const [from, to] = RUSH;
      S.look(from.map((v) => v[1]), to.map((v) => v[1]), 36);
    },
    draw(g, lt) {
      // the held frame: a pale wash and a halftone, like a still in a printed page
      heldWash(g);
      hajime(g, lt, 0);
    },
    fx: () => ({ grain: 0.02, vignette: 0.12 }),
    exposure: 1.1,
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
