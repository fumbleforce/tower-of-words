// Things drawn in code for the inserts: Eric's company ID card and the security gate's card reader and flaps.
// No generated pictures, so every letter on them is ours and readable.
import { IMG, FONT, text, rrect, ease, lerp, glint, W, H } from './paint.js';

const NAVY = '#1b2b4f',
  TEAL = '#6fd0c6';

// The card, centred on (0, 0) in the current transform, 760 x 480. shine: 0..1 sweep of the holo patch and a
// glint across the face. photo: the portrait name used for the photo.
export function idCard(g, { shine = -1, photo = 'eric-neutral', name = 'ERIC', kana = 'エリック' } = {}) {
  const w = 760,
    h = 480,
    x = -w / 2,
    y = -h / 2;
  g.save();
  // drop shadow
  g.fillStyle = 'rgba(10,18,40,0.28)';
  rrect(g, x + 14, y + 22, w, h, 30);
  g.fill();
  // body
  g.fillStyle = '#fbfcfd';
  rrect(g, x, y, w, h, 30);
  g.fill();
  g.save();
  rrect(g, x, y, w, h, 30);
  g.clip();
  // top band in navy with the teal rail, as on the title
  g.fillStyle = NAVY;
  g.fillRect(x, y, w, 96);
  g.fillStyle = TEAL;
  g.fillRect(x, y + 96, w, 8);
  text(g, 'AMAKAWA', x + 40, y + 64, { font: '"Zen Kaku Gothic New", sans-serif', weight: 700, size: 40, tracking: 0.3, color: '#f4f6f9' });
  text(g, '天川', x + w - 40, y + 66, { font: FONT.jp, size: 44, align: 'right', color: TEAL });
  // photo
  const px = x + 40,
    py = y + 136,
    pw = 230,
    ph = 290;
  g.fillStyle = '#dcebf5';
  rrect(g, px, py, pw, ph, 16);
  g.fill();
  const im = IMG[photo];
  if (im) {
    g.save();
    rrect(g, px, py, pw, ph, 16);
    g.clip();
    // head and shoulders, framed on the face (Eric's sits left of the picture's middle, his ponytail to its right)
    const sh = im.height * 0.7,
      sw = sh * (pw / ph);
    const cx = im.width * (photo.startsWith('eric') ? 0.47 : 0.5);
    g.drawImage(im, Math.max(0, Math.min(im.width - sw, cx - sw / 2)), im.height * 0.01, sw, sh, px, py, pw, ph);
    g.restore();
  }
  // words
  const tx = px + pw + 44;
  text(g, name, tx, y + 230, { font: FONT.big, size: 104, color: NAVY, tracking: 0.04 });
  text(g, kana, tx + 4, y + 282, { font: FONT.jp, size: 34, color: '#5a6a88' });
  g.fillStyle = TEAL;
  g.fillRect(tx, y + 312, 300, 5);
  text(g, 'IT SUPPORT', tx, y + 360, { font: FONT.mid, size: 40, color: NAVY, tracking: 0.08 });
  text(g, 'B2 · HEAD OFFICE', tx, y + 404, { font: FONT.mid, size: 30, color: '#6b7a96', tracking: 0.1 });
  // barcode
  let bx = tx;
  const seedBars = [3, 1, 2, 1, 1, 3, 2, 1, 3, 1, 1, 2, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2];
  g.fillStyle = NAVY;
  for (let i = 0; i < seedBars.length; i++) {
    if (i % 2 === 0) g.fillRect(bx, y + 424, seedBars[i] * 3, 30);
    bx += seedBars[i] * 3 + 2;
  }
  // holo patch: a rainbow disc whose colours turn with the shine
  const hx = x + w - 92,
    hy = y + h - 92;
  const turn = (shine < 0 ? 0 : shine) * Math.PI * 2;
  const cg = g.createConicGradient(turn, hx, hy);
  ['#9ff3ff', '#c3a8ff', '#ffb3e1', '#fff2a8', '#a8ffcf', '#9ff3ff'].forEach((c, i, a) => cg.addColorStop(i / (a.length - 1), c));
  g.fillStyle = cg;
  g.beginPath();
  g.arc(hx, hy, 46, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.8)';
  g.lineWidth = 3;
  g.stroke();
  // the shine across the face
  if (shine > 0 && shine < 1) {
    const sx = lerp(x - 300, x + w + 300, shine);
    const gr = g.createLinearGradient(sx - 160, 0, sx + 160, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.75)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.save();
    g.transform(1, 0, -0.35, 1, 0, 0);
    g.fillRect(sx - 200, y - 50, 400, h + 100);
    g.restore();
  }
  g.restore();
  // edge
  g.strokeStyle = 'rgba(27,43,79,0.12)';
  g.lineWidth = 2;
  rrect(g, x, y, w, h, 30);
  g.stroke();
  if (shine > 0 && shine < 1) glint(g, lerp(x - 40, x + w + 40, shine), y + 30, 70 * Math.sin(shine * Math.PI), '#ffffff', 1);
  g.restore();
}

// The gate seen at hand height: the stainless cabinet with its reader on top, the two flaps between cabinets.
// open: 0..1 the flaps swing away; ring: 0..1 the teal ring blooming from the reader; lit: the reader's light
export function gate(g, { open = 0, ring = 0, lit = 0 } = {}) {
  // floor and lobby behind, soft and warm
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#dfe9f2');
  bg.addColorStop(0.55, '#c3d3e2');
  bg.addColorStop(0.56, '#9fb0c4');
  bg.addColorStop(1, '#7f91a8');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // windows of the lobby, blurred bright shapes
  g.save();
  g.filter = 'blur(18px)';
  g.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 6; i++) g.fillRect(80 + i * 320, 120, 220, 420);
  g.restore();
  // left cabinet (with the reader) and right cabinet, in a slight perspective
  const cab = (x0, x1, top) => {
    const gr = g.createLinearGradient(x0, 0, x1, 0);
    gr.addColorStop(0, '#8f9bab');
    gr.addColorStop(0.5, '#e6ebf1');
    gr.addColorStop(1, '#a3afbf');
    g.fillStyle = gr;
    rrect(g, x0, top, x1 - x0, H - top + 40, 18);
    g.fill();
    g.fillStyle = '#2b3a58';
    g.fillRect(x0, top, x1 - x0, 34);
  };
  cab(-60, 760, 600);
  cab(1340, 2000, 640);
  // flaps: translucent teal-grey panels that fold back into the cabinets
  const fl = (x, dir) => {
    const wv = lerp(300, 30, ease.inOut2(open));
    g.save();
    g.fillStyle = 'rgba(160,190,214,0.72)';
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 4;
    rrect(g, dir > 0 ? x : x - wv, 690, wv, 220, 40);
    g.fill();
    g.stroke();
    g.restore();
  };
  fl(760, 1);
  fl(1340, -1);
  // the reader: a dark glass plate with a teal ring icon
  g.save();
  g.fillStyle = '#1d2740';
  rrect(g, 230, 470, 420, 150, 26);
  g.fill();
  const glow = 0.35 + lit * 0.65;
  g.strokeStyle = `rgba(111,208,198,${glow})`;
  g.lineWidth = 10;
  g.beginPath();
  g.arc(440, 545, 44, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = `rgba(111,208,198,${0.25 + lit * 0.75})`;
  g.beginPath();
  g.arc(440, 545, 16, 0, Math.PI * 2);
  g.fill();
  g.restore();
  if (ring > 0 && ring < 1) {
    g.save();
    g.strokeStyle = `rgba(111,208,198,${1 - ring})`;
    g.lineWidth = 18 * (1 - ring) + 2;
    g.beginPath();
    g.arc(440, 545, 50 + ring * 520, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }
}

// The gate lane seen low from its entrance: the two stainless cabinets running away in perspective, their
// dark glass tops, the glass flaps across the lane and the bright morning beyond. open: 0..1 the flaps swing back;
// push: 0..1 the camera moving down the lane; ring: 0..1 the teal ring off the reader; lit: the reader's light.
export function gateLane(g, { open = 0, push = 0, ring = 0, lit = 0 } = {}) {
  const vx = W * 0.52,
    vy = H * 0.42; // vanishing point
  const z = 1 + push * 0.9; // zoom toward the vanishing point
  g.save();
  g.translate(vx, vy);
  g.scale(z, z);
  g.translate(-vx, -vy);
  // the far end: the forecourt in morning light
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#cfe6fb');
  sky.addColorStop(0.42, '#fff4e6');
  sky.addColorStop(0.43, '#e8eef4');
  sky.addColorStop(1, '#b8c6d6');
  g.fillStyle = sky;
  g.fillRect(-200, -200, W + 400, H + 400);
  // the lobby's ceiling, light, with its lamp strips running to the far end
  g.fillStyle = '#e4ebf3';
  g.beginPath();
  g.moveTo(-200, -200);
  g.lineTo(W + 200, -200);
  g.lineTo(vx + 260, vy - 170);
  g.lineTo(vx - 260, vy - 170);
  g.closePath();
  g.fill();
  for (const k of [-0.5, 0.5]) {
    g.strokeStyle = 'rgba(255,255,255,0.95)';
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(vx + k * 1400, -200);
    g.lineTo(vx + k * 160, vy - 172);
    g.stroke();
  }
  // floor tiles in perspective
  g.fillStyle = '#c9d3df';
  g.beginPath();
  g.moveTo(vx - 260, vy + 40);
  g.lineTo(vx + 260, vy + 40);
  g.lineTo(W + 400, H + 200);
  g.lineTo(-400, H + 200);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(140,155,175,0.5)';
  g.lineWidth = 2;
  for (let i = -6; i <= 6; i++) {
    g.beginPath();
    g.moveTo(vx + i * 43, vy + 40);
    g.lineTo(vx + i * 420, H + 200);
    g.stroke();
  }
  for (let j = 1; j < 9; j++) {
    const y = vy + 40 + (H + 160 - vy) * (j / 9) ** 2;
    g.beginPath();
    g.moveTo(-400, y);
    g.lineTo(W + 400, y);
    g.stroke();
  }
  // a cabinet: its inner side face and glass top, from near (x0 at the frame's bottom) to far (toward the vanishing point)
  const cabinet = (side) => {
    const nearX = vx + side * 300,
      nearOut = vx + side * 780,
      farX = vx + side * 70,
      farOut = vx + side * 130;
    const topNear = H * 0.66,
      topFar = vy + 14,
      botNear = H + 120,
      botFar = vy + 40;
    // inner side (facing the lane): brushed steel
    const sg = g.createLinearGradient(nearX, 0, farX, 0);
    sg.addColorStop(0, '#9aa7b8');
    sg.addColorStop(0.5, '#e7edf3');
    sg.addColorStop(1, '#b8c3d0');
    g.fillStyle = sg;
    g.beginPath();
    g.moveTo(nearX, topNear);
    g.lineTo(farX, topFar);
    g.lineTo(farX, botFar);
    g.lineTo(nearX, botNear);
    g.closePath();
    g.fill();
    // the dark glass top, seen from above: its near edge lower in the frame than its far edge
    const tg = g.createLinearGradient(0, topNear + 60, 0, topFar);
    tg.addColorStop(0, '#24314e');
    tg.addColorStop(1, '#3c4c6c');
    g.fillStyle = tg;
    g.beginPath();
    g.moveTo(nearOut, topNear + 70);
    g.lineTo(nearX, topNear);
    g.lineTo(farX, topFar);
    g.lineTo(farOut, topFar + 3);
    g.closePath();
    g.fill();
    // the outer side, in shade
    g.fillStyle = '#8d99aa';
    g.beginPath();
    g.moveTo(nearOut, topNear + 70);
    g.lineTo(farOut, topFar + 3);
    g.lineTo(farOut, botFar + 4);
    g.lineTo(nearOut, botNear + 80);
    g.closePath();
    g.fill();
    // a teal light line along the lane edge
    g.strokeStyle = `rgba(111,208,198,${0.45 + 0.55 * lit})`;
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(nearX, topNear);
    g.lineTo(farX, topFar);
    g.stroke();
    return { nearX, nearOut, topNear };
  };
  const L = cabinet(-1);
  cabinet(1);
  // the flaps: glass panels across the lane, a third of the way down; they fold back into the cabinets
  const fy0 = vy + 40 + (H + 160 - vy) * 0.18,
    fy1 = fy0 - 150;
  const half = 175 * (1 - ease.inOut2(open));
  for (const side of [-1, 1]) {
    const x0 = vx + side * 200;
    g.fillStyle = 'rgba(170,205,230,0.55)';
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = 4;
    g.beginPath();
    g.roundRect(side < 0 ? x0 : x0 - half, fy1, half, fy0 - fy1, 30);
    g.fill();
    if (half > 4) g.stroke();
  }
  // the reader on the near left cabinet top
  const rx = (L.nearX + L.nearOut) / 2 + 30,
    ry = L.topNear + 10;
  g.save();
  g.translate(rx, ry);
  g.scale(1, 0.42);
  g.fillStyle = '#0d1528';
  g.beginPath();
  g.arc(0, 0, 110, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = `rgba(111,208,198,${0.4 + 0.6 * lit})`;
  g.lineWidth = 12;
  g.beginPath();
  g.arc(0, 0, 80, 0, Math.PI * 2);
  g.stroke();
  if (ring > 0 && ring < 1) {
    g.strokeStyle = `rgba(150,255,240,${1 - ring})`;
    g.lineWidth = 20 * (1 - ring) + 2;
    g.beginPath();
    g.arc(0, 0, 90 + ring * 700, 0, Math.PI * 2);
    g.stroke();
  }
  g.restore();
  // light spilling from the far end once the flaps open
  if (open > 0) {
    const sp = g.createRadialGradient(vx, vy, 10, vx, vy, 900);
    sp.addColorStop(0, `rgba(255,250,235,${0.85 * open})`);
    sp.addColorStop(1, 'rgba(255,250,235,0)');
    g.fillStyle = sp;
    g.fillRect(-200, -200, W + 400, H + 400);
  }
  g.restore();
  return { reader: [rx, ry] };
}
