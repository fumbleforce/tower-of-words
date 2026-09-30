// Flat pictures the train passengers hold up (train/discoveries.js shows them through ui/held-view.js, and puts a
// small copy on the prop in the world): Hamada's lock screen with his reminder, and the reader's two pages, a page of
// his Excel book (today's big coloured ribbon) and the printout from work (a grey old window, "Windows 95" printed big
// over it), so the mismatch reads at a glance. Drawn once, on canvases.
const FONT = '"Zen Kaku Gothic New", "Noto Sans JP", system-ui, sans-serif';
const OLD = 'Tahoma, "MS Sans Serif", "DejaVu Sans", Arial, sans-serif';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}
function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

// Hamada's phone: the reminder on his lock screen (the same 12F 9:00 as the note on his briefcase; no clock, so it
// never contradicts the time of day). dismissed: the card gone, the screen dimming.
export function reminderScreen(dismissed = false) {
  const [c, g] = canvas(392, 696);
  const bg = g.createLinearGradient(0, 0, 0, 696);
  bg.addColorStop(0, '#27405f');
  bg.addColorStop(1, '#10192a');
  g.fillStyle = bg;
  g.fillRect(0, 0, 392, 696);
  // a soft wallpaper: two hills and a moon, flat
  g.fillStyle = '#e9eef7';
  g.globalAlpha = 0.18;
  g.beginPath();
  g.arc(290, 150, 46, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;
  g.fillStyle = '#1c2f48';
  g.beginPath();
  g.ellipse(90, 700, 260, 170, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#16263b';
  g.beginPath();
  g.ellipse(360, 720, 240, 150, 0, 0, Math.PI * 2);
  g.fill();
  if (!dismissed) {
    // the reminder card
    g.fillStyle = 'rgba(245, 247, 251, .94)';
    rr(g, 26, 250, 340, 190, 26);
    g.fill();
    // bell
    g.save();
    g.translate(78, 318);
    g.fillStyle = '#e2574c';
    rr(g, -26, -26, 52, 52, 14);
    g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(-12, 8);
    g.quadraticCurveTo(-12, -14, 0, -14);
    g.quadraticCurveTo(12, -14, 12, 8);
    g.lineTo(15, 12);
    g.lineTo(-15, 12);
    g.closePath();
    g.fill();
    g.beginPath();
    g.arc(0, 15, 4, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.fillStyle = '#1b2230';
    g.font = `700 64px ${FONT}`;
    g.textBaseline = 'middle';
    g.fillText('12F', 122, 322);
    g.fillText('9:00', 122, 392);
    g.fillStyle = '#e2574c';
    g.fillText('!!', 272, 392);
  } else {
    g.fillStyle = 'rgba(0, 0, 0, .45)';
    g.fillRect(0, 0, 392, 696);
  }
  // the bar at the bottom of the lock screen
  g.fillStyle = 'rgba(255, 255, 255, .6)';
  rr(g, 146, 664, 100, 6, 3);
  g.fill();
  return c;
}

// ---------- the reader's pages ----------
function page(title) {
  const [c, g] = canvas(600, 440);
  g.fillStyle = '#fbfaf6';
  g.fillRect(0, 0, 600, 440);
  g.fillStyle = '#1d2230';
  g.font = `700 50px ${title.font}`;
  g.textBaseline = 'alphabetic';
  g.fillText(title.text, 34, 74);
  g.fillStyle = title.rule;
  g.fillRect(34, 90, 532, 5);
  return [c, g];
}
function grid(g, x, y, w, h, { cols = 6, rows = 6, head = '#e9ecef', line = '#c9ced4', font = FONT, size = 16 } = {}) {
  g.fillStyle = '#fff';
  g.fillRect(x, y, w, h);
  const cw = w / cols,
    rh = h / rows;
  g.fillStyle = head;
  g.fillRect(x, y, w, rh);
  g.fillRect(x, y, cw * 0.55, h);
  g.strokeStyle = line;
  g.lineWidth = 1;
  for (let i = 0; i <= cols; i++) {
    const cx = i === 0 ? x : x + cw * 0.55 + (i - 1) * ((w - cw * 0.55) / (cols - 1));
    g.beginPath();
    g.moveTo(cx + 0.5, y);
    g.lineTo(cx + 0.5, y + h);
    g.stroke();
  }
  for (let j = 0; j <= rows; j++) {
    g.beginPath();
    g.moveTo(x, y + j * rh + 0.5);
    g.lineTo(x + w, y + j * rh + 0.5);
    g.stroke();
  }
  g.fillStyle = '#5a6270';
  g.font = `600 ${size}px ${font}`;
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  const colW = (w - cw * 0.55) / (cols - 1);
  for (let i = 1; i < cols; i++) g.fillText('ABCDE'[i - 1], x + cw * 0.55 + (i - 0.5) * colW, y + rh / 2);
  for (let j = 1; j < rows; j++) g.fillText(String(j), x + cw * 0.275, y + (j + 0.5) * rh);
  g.textAlign = 'left';
}

// the book: today's spreadsheet window, green title bar and a ribbon of big coloured buttons
export function bookPage() {
  const [c, g] = page({ text: 'Excel', font: FONT, rule: '#2f8f5b' });
  const x = 34,
    y = 118,
    w = 532;
  g.fillStyle = '#217346';
  g.fillRect(x, y, w, 30);
  g.fillStyle = '#fff';
  g.font = `600 16px ${FONT}`;
  g.textBaseline = 'middle';
  g.fillText('Book1 - Excel', x + 14, y + 15);
  g.fillStyle = '#f3f3f3';
  g.fillRect(x, y + 30, w, 92);
  g.fillStyle = '#217346';
  g.fillRect(x + 12, y + 50, 48, 4);
  // ribbon buttons: big rounded, colourful icons in groups
  const cols = ['#2f8f5b', '#3b7dd8', '#e0a030', '#d9534f', '#7a5cc8', '#2aa6a0', '#e07a5f', '#3b7dd8'];
  cols.forEach((col, i) => {
    const bx = x + 14 + i * 64,
      by = y + 62;
    g.fillStyle = '#ffffff';
    rr(g, bx, by, 54, 52, 8);
    g.fill();
    g.fillStyle = col;
    rr(g, bx + 13, by + 9, 28, 24, 5);
    g.fill();
    g.fillStyle = '#9aa1ab';
    g.fillRect(bx + 10, by + 40, 34, 4);
  });
  grid(g, x, y + 130, w, 166);
  g.fillStyle = '#8a909a';
  g.font = `500 15px ${FONT}`;
  g.fillText('34', 540, 420);
  return c;
}

// the printout: an old grey window, bevelled everything, tiny toolbar buttons; "Windows 95" printed big over it
function bevel(g, x, y, w, h, up = true) {
  g.fillStyle = '#c0c0c0';
  g.fillRect(x, y, w, h);
  g.fillStyle = up ? '#ffffff' : '#808080';
  g.fillRect(x, y, w, 2);
  g.fillRect(x, y, 2, h);
  g.fillStyle = up ? '#808080' : '#ffffff';
  g.fillRect(x, y + h - 2, w, 2);
  g.fillRect(x + w - 2, y, 2, h);
}
export function printoutSheet() {
  const [c, g] = page({ text: 'Windows 95', font: OLD, rule: '#1d2230' });
  const x = 34,
    y = 118,
    w = 532,
    h = 290;
  bevel(g, x, y, w, h);
  const tb = g.createLinearGradient(x, 0, x + w, 0);
  tb.addColorStop(0, '#000080');
  tb.addColorStop(1, '#1084d0');
  g.fillStyle = tb;
  g.fillRect(x + 4, y + 4, w - 8, 26);
  g.fillStyle = '#fff';
  g.font = `700 16px ${OLD}`;
  g.textBaseline = 'middle';
  g.fillText('Microsoft Excel - Book1', x + 12, y + 17);
  for (let i = 0; i < 3; i++) bevel(g, x + w - 76 + i * 24, y + 8, 20, 18);
  g.fillStyle = '#000';
  g.font = `500 15px ${OLD}`;
  let mx = x + 10;
  for (const m of ['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Data']) {
    g.fillText(m, mx, y + 44);
    mx += g.measureText(m).width + 16;
  }
  // a row of small grey buttons with tiny marks
  for (let i = 0; i < 17; i++) {
    const bx = x + 8 + i * 30 + (i > 5 ? 8 : 0) + (i > 11 ? 8 : 0);
    bevel(g, bx, y + 58, 26, 24);
    g.fillStyle = ['#000', '#000080', '#808000', '#800000'][i % 4];
    g.fillRect(bx + 8, y + 66, 10, 8);
  }
  grid(g, x + 6, y + 92, w - 12, h - 100, { head: '#c0c0c0', line: '#808080', font: OLD, size: 14 });
  g.fillStyle = '#8a909a';
  g.font = `500 15px ${OLD}`;
  g.fillText('3', 556, 424);
  return c;
}
