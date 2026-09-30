// Indoor and night pictures of the finds (finds/prints.js): a cat asleep on a keyboard, fireworks over the sea.
import { poly, circle, sky, rng } from './paint.js';

const TAU = Math.PI * 2;

export const NIGHT = {
  // a cat asleep on a keyboard
  cat(c, w, h) {
    sky(c, w, h, '#3b4452', '#4b5563');
    poly(
      c,
      [
        [0, h * 0.55],
        [w, h * 0.5],
        [w, h],
        [0, h],
      ],
      '#8b8177',
    );
    // a monitor's glow behind
    poly(
      c,
      [
        [w * 0.55, h * 0.05],
        [w * 0.98, h * 0.05],
        [w * 0.98, h * 0.42],
        [w * 0.55, h * 0.42],
      ],
      '#23303b',
    );
    poly(
      c,
      [
        [w * 0.57, h * 0.07],
        [w * 0.96, h * 0.07],
        [w * 0.96, h * 0.4],
        [w * 0.57, h * 0.4],
      ],
      '#7fb6c4',
    );
    for (let i = 0; i < 5; i++)
      ((c.fillStyle = '#b7dde6'),
        c.fillRect(w * 0.6, h * (0.11 + i * 0.055), w * (0.12 + ((i * 7) % 5) * 0.04), h * 0.02));
    // the keyboard
    poly(
      c,
      [
        [w * 0.08, h * 0.72],
        [w * 0.86, h * 0.64],
        [w * 0.9, h * 0.8],
        [w * 0.1, h * 0.9],
      ],
      '#d9d8d4',
    );
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 12; k++) {
        const x = 0.13 + k * 0.062,
          y = 0.735 + r * 0.04 - k * 0.0062;
        poly(
          c,
          [
            [w * x, h * y],
            [w * (x + 0.05), h * (y - 0.005)],
            [w * (x + 0.05), h * (y + 0.03)],
            [w * x, h * (y + 0.035)],
          ],
          '#efeeea',
        );
      }
    // the cat, curled up
    c.fillStyle = '#d98d4c';
    c.beginPath();
    c.ellipse(w * 0.47, h * 0.66, w * 0.24, h * 0.14, -0.1, 0, TAU);
    c.fill();
    c.fillStyle = '#f3e3cf';
    c.beginPath();
    c.ellipse(w * 0.36, h * 0.72, w * 0.08, h * 0.05, -0.1, 0, TAU);
    c.fill();
    c.fillStyle = '#b86c33';
    for (let i = 0; i < 4; i++) c.fillRect(w * (0.45 + i * 0.05), h * 0.54, w * 0.02, h * 0.08);
    circle(c, w * 0.3, h * 0.62, h * 0.1, '#d98d4c');
    poly(
      c,
      [
        [w * 0.24, h * 0.56],
        [w * 0.25, h * 0.45],
        [w * 0.29, h * 0.53],
      ],
      '#d98d4c',
    );
    poly(
      c,
      [
        [w * 0.31, h * 0.53],
        [w * 0.35, h * 0.45],
        [w * 0.36, h * 0.56],
      ],
      '#d98d4c',
    );
    c.strokeStyle = '#6a4630';
    c.lineWidth = Math.max(1, w / 200);
    for (const x of [0.27, 0.33]) {
      c.beginPath();
      c.arc(w * x, h * 0.62, w * 0.012, 0.2, Math.PI - 0.2);
      c.stroke();
    }
    c.fillStyle = '#d98d4c';
    c.beginPath();
    c.ellipse(w * 0.63, h * 0.78, w * 0.12, h * 0.03, 0.2, 0, TAU);
    c.fill();
  },
  // fireworks over the sea at night
  fireworks(c, w, h) {
    sky(c, w, h, '#161c2e', '#2c3150', 0.7);
    poly(
      c,
      [
        [0, h * 0.7],
        [w, h * 0.7],
        [w, h],
        [0, h],
      ],
      '#1d2a3d',
    );
    const R = rng(5);
    const burst = (x, y, r, col, n) => {
      c.strokeStyle = col;
      c.lineWidth = Math.max(1, w / 260);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + R() * 0.1;
        c.beginPath();
        c.moveTo(x + Math.cos(a) * r * 0.35, y + Math.sin(a) * r * 0.35);
        c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        c.stroke();
        circle(c, x + Math.cos(a) * r, y + Math.sin(a) * r, w / 220, col);
      }
      // its reflection
      c.globalAlpha = 0.35;
      poly(
        c,
        [
          [x - r * 0.3, h * 0.72 + (h * 0.7 - y) * 0.4],
          [x + r * 0.3, h * 0.72 + (h * 0.7 - y) * 0.4],
          [x + r * 0.2, h * 0.73 + (h * 0.7 - y) * 0.4],
          [x - r * 0.2, h * 0.73 + (h * 0.7 - y) * 0.4],
        ],
        col,
      );
      c.globalAlpha = 1;
    };
    burst(w * 0.3, h * 0.3, w * 0.16, '#f6c177', 28);
    burst(w * 0.66, h * 0.22, w * 0.12, '#9ccfd8', 24);
    burst(w * 0.82, h * 0.42, w * 0.08, '#eb9fb4', 18);
    // rooftops in front
    poly(
      c,
      [
        [0, h * 0.82],
        [w * 0.3, h * 0.82],
        [w * 0.3, h * 0.74],
        [w * 0.45, h * 0.74],
        [w * 0.45, h * 0.86],
        [w, h * 0.86],
        [w, h],
        [0, h],
      ],
      '#0f131c',
    );
    for (const x of [0.05, 0.12, 0.34, 0.39, 0.55, 0.7])
      ((c.fillStyle = '#e8c27a'), c.fillRect(w * x, h * 0.88, w * 0.025, h * 0.03));
  },
};
