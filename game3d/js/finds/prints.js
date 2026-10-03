// The pictures of the finds (js/finds/spots.js), drawn on a canvas in the game's flat-shaded look: flat shapes in
// the world's palette, no outlines. Stand-ins until a subject gets a picture of its own; each draws itself at any
// size (w x h, 4:3), so the same drawing makes the print on the ground and the close look.
//   drawPrint(kind, w, h)  a canvas with the picture only
//   printTexture(kind)     a small canvas: the picture in a white border, for the print lying in the world
import { JP_FONT } from '../props.js';
import { poly } from './paint.js';
import { DAY } from './pictures-day.js';
import { NIGHT } from './pictures-night.js';

const TAU = Math.PI * 2;

const DRAW = { ...DAY, ...NIGHT };

// the bakery flyer's head, as the one in mailbox 203 shows it (dorm-court): パン on the bakery's colour
export function drawFlyerHead(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  c.fillStyle = '#efe4c8';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#c98a4a';
  c.beginPath();
  c.ellipse(w * 0.26, h * 0.5, w * 0.17, h * 0.3, 0, 0, TAU);
  c.fill();
  c.fillStyle = '#8a5a2e';
  for (const k of [-1, 0, 1]) c.fillRect(w * (0.24 + k * 0.07), h * 0.32, w * 0.02, h * 0.36);
  c.fillStyle = '#5a3a22';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const [ja, en] = ['パン', 'BAKERY']; // the sign's word and its English under it
  c.font = `700 ${Math.round(h * 0.42)}px ${JP_FONT}`;
  c.fillText(ja, w * 0.68, h * 0.4);
  c.font = `700 ${Math.round(h * 0.18)}px system-ui, sans-serif`;
  c.fillText(en, w * 0.68, h * 0.76);
  return cv;
}

export function drawPrint(kind, w = 640, h = 480) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  (DRAW[kind] || DRAW.pigeons)(c, w, h);
  return cv;
}

// the print lying on the ground: the picture in a white border, a little worn at one corner
export function printTexture(kind) {
  const W = 256,
    H = 208,
    b = 12;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = '#f3f1ec';
  c.fillRect(0, 0, W, H);
  c.drawImage(drawPrint(kind, 320, 240), b, b, W - 2 * b, H - 2 * b - 10);
  poly(
    c,
    [
      [W - 26, H],
      [W, H - 22],
      [W, H],
    ],
    '#d9d5cc',
  );
  return cv;
}
export const PRINT_KINDS = Object.keys(DRAW);
