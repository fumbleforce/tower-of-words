// Daylight pictures of the finds (finds/prints.js): the monorail at dawn, a cherry over a stone lantern, pigeons at a
// fountain. Each draws itself at any size w x h (4:3).
import { poly, circle, sky, rng } from './paint.js';

const TAU = Math.PI * 2;

export const DAY = {
  // the monorail on its beam over the sea, early light
  monorail(c, w, h) {
    sky(c, w, h, '#f2c9a0', '#f7e6cf', 0.62);
    circle(c, w * 0.72, h * 0.5, h * 0.09, '#fff4de');
    poly(
      c,
      [
        [0, h * 0.58],
        [w, h * 0.58],
        [w, h],
        [0, h],
      ],
      '#6f93a8',
    );
    for (let i = 0; i < 7; i++)
      poly(
        c,
        [
          [w * (0.1 + i * 0.13), h * (0.66 + (i % 3) * 0.08)],
          [w * (0.16 + i * 0.13), h * (0.66 + (i % 3) * 0.08)],
          [w * (0.15 + i * 0.13), h * (0.67 + (i % 3) * 0.08)],
          [w * (0.11 + i * 0.13), h * (0.67 + (i % 3) * 0.08)],
        ],
        '#9fbccb',
      );
    poly(
      c,
      [
        [w * 0.5, h * 0.6],
        [w * 0.8, h * 0.6],
        [w * 0.8, h * 0.61],
        [w * 0.5, h * 0.61],
      ],
      '#fbe3c0',
    );
    // the beam and its piers
    poly(
      c,
      [
        [0, h * 0.44],
        [w, h * 0.36],
        [w, h * 0.4],
        [0, h * 0.48],
      ],
      '#c7c9cc',
    );
    for (const x of [0.12, 0.42, 0.72]) {
      const y = 0.46 - x * 0.08;
      poly(
        c,
        [
          [w * x, h * y],
          [w * (x + 0.035), h * y],
          [w * (x + 0.03), h],
          [w * (x + 0.005), h],
        ],
        '#aeb2b8',
      );
    }
    // the car
    poly(
      c,
      [
        [w * 0.18, h * 0.32],
        [w * 0.62, h * 0.25],
        [w * 0.66, h * 0.28],
        [w * 0.66, h * 0.36],
        [w * 0.2, h * 0.43],
        [w * 0.16, h * 0.39],
      ],
      '#eef0f1',
    );
    poly(
      c,
      [
        [w * 0.2, h * 0.39],
        [w * 0.66, h * 0.33],
        [w * 0.66, h * 0.36],
        [w * 0.2, h * 0.43],
      ],
      '#3f7d8c',
    );
    for (let i = 0; i < 6; i++) {
      const x = 0.23 + i * 0.066;
      const y = 0.325 - i * 0.0094;
      poly(
        c,
        [
          [w * x, h * y],
          [w * (x + 0.045), h * (y - 0.006)],
          [w * (x + 0.045), h * (y + 0.035)],
          [w * x, h * (y + 0.041)],
        ],
        '#56697a',
      );
    }
  },
  // cherry blossom over a stone lantern in a garden
  cherry(c, w, h) {
    sky(c, w, h, '#bcd5e4', '#e9f0f2');
    poly(
      c,
      [
        [0, h * 0.7],
        [w, h * 0.66],
        [w, h],
        [0, h],
      ],
      '#8ea86f',
    );
    poly(
      c,
      [
        [0, h * 0.84],
        [w, h * 0.8],
        [w, h],
        [0, h],
      ],
      '#c9c2b4',
    );
    // trunk and branches
    poly(
      c,
      [
        [w * 0.2, h],
        [w * 0.27, h],
        [w * 0.29, h * 0.5],
        [w * 0.24, h * 0.5],
      ],
      '#5b4a47',
    );
    poly(
      c,
      [
        [w * 0.26, h * 0.55],
        [w * 0.62, h * 0.28],
        [w * 0.64, h * 0.31],
        [w * 0.28, h * 0.6],
      ],
      '#5b4a47',
    );
    const R = rng(11);
    for (let i = 0; i < 70; i++) {
      const x = w * (0.02 + R() * 0.8),
        y = h * (0.02 + R() * 0.45) + Math.abs(x - w * 0.3) * 0.05;
      circle(c, x, y, h * (0.05 + R() * 0.06), ['#f4c9d4', '#f7d8df', '#eab5c3', '#fbe6ea'][i % 4]);
    }
    for (let i = 0; i < 18; i++) circle(c, w * R(), h * (0.55 + R() * 0.4), h * 0.008, '#f4c9d4');
    // the lantern
    const lx = w * 0.72;
    poly(
      c,
      [
        [lx - w * 0.03, h * 0.82],
        [lx + w * 0.03, h * 0.82],
        [lx + w * 0.025, h * 0.64],
        [lx - w * 0.025, h * 0.64],
      ],
      '#9d9a93',
    );
    poly(
      c,
      [
        [lx - w * 0.06, h * 0.64],
        [lx + w * 0.06, h * 0.64],
        [lx + w * 0.05, h * 0.52],
        [lx - w * 0.05, h * 0.52],
      ],
      '#b1ada5',
    );
    poly(
      c,
      [
        [lx - w * 0.025, h * 0.62],
        [lx + w * 0.025, h * 0.62],
        [lx + w * 0.025, h * 0.55],
        [lx - w * 0.025, h * 0.55],
      ],
      '#6f6c66',
    );
    poly(
      c,
      [
        [lx - w * 0.1, h * 0.52],
        [lx + w * 0.1, h * 0.52],
        [lx, h * 0.43],
      ],
      '#8c8982',
    );
  },
  // pigeons round a fountain's rim
  pigeons(c, w, h) {
    sky(c, w, h, '#d8e2e8', '#eef1f2', 0.35);
    poly(
      c,
      [
        [0, h * 0.35],
        [w, h * 0.35],
        [w, h],
        [0, h],
      ],
      '#cbc4b8',
    );
    for (let i = 0; i < 6; i++)
      poly(
        c,
        [
          [0, h * (0.45 + i * 0.1)],
          [w, h * (0.43 + i * 0.1)],
          [w, h * (0.44 + i * 0.1)],
          [0, h * (0.46 + i * 0.1)],
        ],
        '#b9b2a6',
      );
    // the basin's rim and water
    c.fillStyle = '#9c8f84';
    c.beginPath();
    c.ellipse(w * 0.62, h * 0.36, w * 0.5, h * 0.2, 0, 0, TAU);
    c.fill();
    c.fillStyle = '#6d9cb1';
    c.beginPath();
    c.ellipse(w * 0.62, h * 0.33, w * 0.44, h * 0.14, 0, 0, TAU);
    c.fill();
    c.fillStyle = '#9dc3d2';
    for (let i = 0; i < 6; i++) c.fillRect(w * (0.3 + i * 0.1), h * (0.3 + (i % 2) * 0.05), w * 0.05, h * 0.008);
    const bird = (x, y, s, flip, down) => {
      c.save();
      c.translate(x, y);
      c.scale(flip ? -s : s, s);
      poly(
        c,
        [
          [-40, 0],
          [18, -14],
          [34, -6],
          [30, 10],
          [-10, 14],
          [-44, 6],
        ],
        '#8e939d',
      );
      poly(
        c,
        [
          [-12, -8],
          [22, -14],
          [26, 2],
          [-8, 6],
        ],
        '#7a808c',
      );
      poly(
        c,
        [
          [-44, 2],
          [-62, -2],
          [-60, 8],
          [-42, 8],
        ],
        '#5e6472',
      );
      const hy = down ? 14 : -20,
        hx = down ? 42 : 30;
      poly(
        c,
        [
          [20, -10],
          [hx - 4, hy - 4],
          [hx + 6, hy + 4],
          [28, 6],
        ],
        '#6d8f86',
      );
      circle(c, hx, hy, 10, '#5e6472');
      poly(
        c,
        [
          [hx + 8, hy - 2],
          [hx + 16, hy + 1],
          [hx + 8, hy + 3],
        ],
        '#3c3f47',
      );
      c.fillStyle = '#c97a6e';
      c.fillRect(-4, 14, 3, 12);
      c.fillRect(8, 13, 3, 12);
      c.restore();
    };
    bird(w * 0.2, h * 0.68, w / 520, false, false);
    bird(w * 0.46, h * 0.76, w / 460, true, true);
    bird(w * 0.72, h * 0.66, w / 560, false, true);
    bird(w * 0.86, h * 0.82, w / 420, true, false);
    bird(w * 0.33, h * 0.9, w / 400, false, true);
  },
};
