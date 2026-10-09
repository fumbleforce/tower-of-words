// Intro (0 to 12.8 s): the morning over the bay, then the train. The arpeggio intro holds still and wide; the full
// band at 6.0 s throws the camera under the train, alongside it, above it, and the title lands on the bar at 10.03.
import * as THREE from 'three';
import { HIT, bar, beat, pulse } from '../timeline.js';
import { k, ease, clamp, lerp, gulls, flare, toFrame, glint, streaks, speedLines, rng, W, H } from '../paint.js';
import { SUN } from '../sky.js';
import { drawLogo } from '../logo.js';
import { ISLAND_X } from '../stage.js';

const sunFar = SUN.clone().multiplyScalar(6000);
const yawSun = Math.atan2(SUN.z, SUN.x);
// a point `d` ahead of `from` at a yaw and pitch (radians)
const ahead = (from, yaw, pitch, d = 100) => [
  from[0] + Math.cos(yaw) * Math.cos(pitch) * d,
  from[1] + Math.sin(pitch) * d,
  from[2] + Math.sin(yaw) * Math.cos(pitch) * d,
];

// the sun's place in the frame (for flares), from the stage camera
function sunOnFrame(S) {
  return toFrame(S.camera, S.camera.position.clone().add(sunFar));
}

// a loose flock drifting right to left across the upper sky
function flock(seed, n, t, { x0 = 1500, y0 = 330, vx = -110, vy = -8, scale = 1 } = {}) {
  const r = rng(seed);
  const birds = [];
  for (let i = 0; i < n; i++) {
    birds.push({
      x: x0 + (r() - 0.5) * 380 + t * vx * (0.85 + r() * 0.3),
      y: y0 + (r() - 0.5) * 140 + t * vy + Math.sin(t * 1.3 + i) * 6,
      s: (10 + r() * 12) * scale,
      ph: r() * 6,
    });
  }
  return birds;
}

export const INTRO = [
  {
    // Morning: the camera hangs high over the bay, looking up into the sky, and tilts down to the horizon where the
    // sun has just come up behind the island.
    id: 'sky',
    t: [0, 3.62],
    scene3d(S, lt) {
      S.setTrain(-400);
      const p = ease.inOut3(clamp((lt - 0.2) / 3.5));
      const pos = [ISLAND_X - 420, 24, 140];
      const pitch = lerp(0.62, 0.05, p);
      S.look(pos, ahead(pos, yawSun + lerp(-0.35, -0.08, p), pitch), 46);
    },
    draw(g, lt, T, S) {
      gulls(g, flock(3, 7, lt, { x0: 1700, y0: 380 + lt * 50, vx: -150 }), lt, 'rgba(36,48,86,0.8)');
    },
    flare: (lt) => k(lt, 1.6, 3.2),
  },
  {
    // Wide: the train crosses the bay toward the island, backlit, small under the big sky.
    id: 'wide',
    t: [3.62, HIT.intro],
    in: { type: 'fade', d: 0.6, at: 0.5 },
    scene3d(S, lt) {
      const x = 600 + lt * 22;
      S.setTrain(x);
      const cx = 590 + lt * 9;
      S.look([cx, -9, 95], [cx + 95, 6, -40], 32);
    },
    draw(g, lt, T, S) {
      gulls(g, flock(8, 5, lt, { x0: 820, y0: 300, vx: -60, scale: 0.8 }), lt, 'rgba(40,50,90,0.7)');
    },
    flare: () => 0.8,
  },
  {
    // The band comes in: under the beam, the train rushes at us and over us.
    id: 'swoop',
    t: [HIT.intro, bar(4.5) + 0.01],
    in: { type: 'flash', d: 0.24, at: 0.5 },
    scene3d(S, lt) {
      const x = -55 + lt * 46;
      S.setTrain(x);
      const p = ease.out3(clamp(lt / 1.6));
      S.look([6, -2.4 + p * 0.6, 4.2], [lerp(-30, -6, p), lerp(1.5, 3.2, p), lerp(-1, 0.5, p)], 58, -0.12);
    },
    draw(g, lt) {
      speedLines(g, W * 0.4, H * 0.45, lt, { color: 'rgba(255,255,255,0.7)', count: 34, inner: 640, width: 16, alpha: k(lt, 0.4, 1.0) });
    },
    fx: (lt) => ({ shake: [Math.sin(lt * 70) * 0.003 * k(lt, 0.5, 0.9), Math.cos(lt * 63) * 0.003 * k(lt, 0.5, 0.9)], chroma: 0.006 * pulse(lt + HIT.intro, 0.12) }),
  },
  {
    // Alongside: the camera runs with the car at window height, pillars whipping past behind.
    id: 'track',
    t: [bar(4.5) + 0.01, bar(5.5)],
    in: { type: 'whip', d: 0.3, at: 0.5 },
    scene3d(S, lt, T) {
      const x = 300 + T * 26;
      S.setTrain(x);
      const p = lt / 1.6;
      S.look([x + lerp(-9, -3, p), 1.0, 7.2], [x + lerp(-2, 3, p), 0.6, 0], 42, 0.05);
    },
    draw(g, lt, T, S) {
      streaks(g, lt, { color: 'rgba(255,255,255,0.35)', count: 22, y0: 820, y1: 1080, alpha: 0.5 });
    },
  },
  {
    // Above: the game's own view, looking down at the train on its beam over the glittering water. The title lands.
    id: 'aerial',
    t: [bar(5.5), HIT.verse - 0.2],
    in: { type: 'zoom', d: 0.32, at: 0.5 },
    scene3d(S, lt, T) {
      const x = 300 + T * 26;
      S.setTrain(x);
      const p = lt / 3.3;
      S.look([x + lerp(-14, -4, p), lerp(14, 17, p), 24], [x + lerp(2, 8, p), 4.5, -6], 38);
    },
    draw(g, lt, T) {
      const t = T - bar(6); // the logo lands on the bar at 10.03 s
      if (t > -0.1) {
        // darken behind the word so it reads over the bright water
        const a = k(t, -0.1, 0.4);
        const gr = g.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 900);
        gr.addColorStop(0, `rgba(10,20,44,${0.55 * a})`);
        gr.addColorStop(1, `rgba(10,20,44,${0.15 * a})`);
        g.fillStyle = gr;
        g.fillRect(0, 0, W, H);
        drawLogo(g, t, { size: 150, y: 400, shine: clamp((T - bar(7)) / 0.7) });
      }
    },
    fx: (lt, T) => ({ flash: 0.55 * Math.exp(-Math.max(0, T - bar(6)) / 0.12) * (T >= bar(6) ? 1 : 0) }),
  },
];
