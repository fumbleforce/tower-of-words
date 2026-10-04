// The pictures of the finds (js/finds/spots.js): the photos picked in Review photos-1, in
// game3d/assets/photos/<print>.webp (1024x768, the close look) and <print>-thumb.webp (320x240, the album and the
// print on the ground). The bakery flyer's head is drawn here.
//   photoImg(print, thumb)          an <img> of the picture, 4:3
//   printTexture(print, onReady)    a small canvas: the picture in a white border, for the print lying in the world;
//                                   onReady() runs once the picture is drawn into it
import { JP_FONT } from '../props.js';

const TAU = Math.PI * 2;

const photoUrl = (print, thumb) =>
  new URL(
    `../../assets/photos/${print}${thumb ? '-thumb' : ''}.webp?v=${encodeURIComponent(window.BUILD || '')}`,
    import.meta.url,
  ).href;

export function photoImg(print, thumb = false) {
  const img = new Image(4, 3); // the 4:3 box holds its place in the layout while it loads
  img.decoding = 'async';
  img.alt = '';
  img.src = photoUrl(print, thumb);
  return img;
}

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

// the print lying on the ground: the picture in a white border, a little worn at one corner
export function printTexture(print, onReady) {
  const W = 256,
    H = 208,
    b = 12;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = '#f3f1ec';
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#c9c4ba'; // a plain grey print until the picture has loaded
  c.fillRect(b, b, W - 2 * b, H - 2 * b - 10);
  const corner = () => {
    c.fillStyle = '#d9d5cc';
    c.beginPath();
    c.moveTo(W - 26, H);
    c.lineTo(W, H - 22);
    c.lineTo(W, H);
    c.closePath();
    c.fill();
  };
  corner();
  const img = photoImg(print, true);
  img.onload = () => {
    c.drawImage(img, b, b, W - 2 * b, H - 2 * b - 10);
    corner();
    onReady?.();
  };
  return cv;
}
