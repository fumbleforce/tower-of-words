// The sung lyrics as karaoke subtitles: the Japanese line with readings over its kanji, filled in teal syllable by
// syllable exactly as she sings it (timings in lyrics.js), and the English under it. Drawn on the compositor's
// overlay, over every shot and transition. Lyrics on/off: the player's Lyrics button, or ?lyrics=0.
import { LYRICS } from './lyrics.js';
import { clamp, ease, W, H } from './paint.js';

const FILL = '#7ff0e0',
  INK = '#ffffff',
  EDGE = '#0f1d3a';
const JP = 56,
  RUBY = 22,
  EN = 34;
const LEAD = 0.45, // the line shows this long before its first syllable
  TAIL = 0.5; // and stays this long after its last

// progress 0..1 through a piece: by its moras' start times if it has them, else evenly from t0 to t1
function pieceK(p, t) {
  if (t <= p.t0) return 0;
  if (t >= p.t1) return 1;
  const m = p.moras && p.moras.length > 1 ? p.moras : [p.t0];
  const n = m.length;
  for (let i = n - 1; i >= 0; i--)
    if (t >= m[i]) {
      const end = i + 1 < n ? m[i + 1] : p.t1;
      return (i + clamp((t - m[i]) / Math.max(0.05, end - m[i]))) / n;
    }
  return 0;
}

// lay a line out once: each piece's width and x
const layouts = new Map();
function layout(g, line) {
  if (layouts.has(line)) return layouts.get(line);
  g.save();
  g.font = `900 ${JP}px "OP Sub", sans-serif`;
  const pieces = line.segs.map((s) => ({ ...s, w: s.text === ' ' ? JP * 0.45 : g.measureText(s.text).width }));
  g.restore();
  const total = pieces.reduce((a, p) => a + p.w, 0);
  let x = (W - total) / 2;
  for (const p of pieces) {
    p.x = x;
    x += p.w;
  }
  const r = { pieces, total };
  layouts.set(line, r);
  return r;
}

function drawText(g, str, x, y, size, weight, fillStyle, edgeW) {
  g.font = `${weight} ${size}px "OP Sub", sans-serif`;
  g.lineJoin = 'round';
  g.lineWidth = edgeW;
  g.strokeStyle = EDGE;
  g.strokeText(str, x, y);
  g.fillStyle = fillStyle;
  g.fillText(str, x, y);
}

// draw the lyric live at T; returns false when nothing is on screen (the overlay can stay empty)
export function drawLyrics(g, T) {
  const live = LYRICS.filter((l) => {
    const a = l.segs.find((s) => s.t0 !== undefined).t0 - LEAD;
    const b = [...l.segs].reverse().find((s) => s.t1 !== undefined).t1 + TAIL;
    return T >= a && T <= b;
  });
  if (!live.length) return false;
  const line = live[live.length - 1];
  const first = line.segs.find((s) => s.t0 !== undefined).t0,
    last = [...line.segs].reverse().find((s) => s.t1 !== undefined).t1;
  const inK = ease.out3(clamp((T - (first - LEAD)) / 0.3)),
    outK = clamp((T - last) / TAIL);
  const alpha = inK * (1 - ease.in2(outK));
  if (alpha <= 0.001) return false;
  const { pieces } = layout(g, line);
  const y = 968 + (1 - inK) * 14;
  g.save();
  g.globalAlpha = alpha;
  // a soft shade under the words so they read on any picture
  const sh = g.createLinearGradient(0, H - 230, 0, H);
  sh.addColorStop(0, 'rgba(8,14,32,0)');
  sh.addColorStop(1, 'rgba(8,14,32,0.5)');
  g.fillStyle = sh;
  g.fillRect(0, H - 230, W, 230);
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  for (const p of pieces) {
    if (p.text === ' ') continue;
    const kk = p.t0 === undefined ? (T >= first ? 1 : 0) : pieceK(p, T);
    // the unsung text, then the sung part over it, clipped at the sweep
    drawText(g, p.text, p.x, y, JP, 900, INK, 9);
    if (p.kana && p.kana !== p.text) {
      g.save();
      g.font = `700 ${RUBY}px "OP Sub", sans-serif`;
      const rw = g.measureText(p.kana).width;
      g.restore();
      drawText(g, p.kana, p.x + (p.w - rw) / 2, y - JP - 4, RUBY, 700, INK, 5);
      if (kk > 0) {
        g.save();
        g.beginPath();
        g.rect(p.x + (p.w - rw) / 2 - 4, y - JP - RUBY - 10, (rw + 8) * kk, RUBY + 20);
        g.clip();
        drawText(g, p.kana, p.x + (p.w - rw) / 2, y - JP - 4, RUBY, 700, FILL, 5);
        g.restore();
      }
    }
    if (kk > 0) {
      g.save();
      g.beginPath();
      g.rect(p.x - 6, y - JP - 6, (p.w + 12) * kk, JP + 24);
      g.clip();
      drawText(g, p.text, p.x, y, JP, 900, FILL, 9);
      g.restore();
    }
  }
  // the English, whole, under it
  g.font = `600 ${EN}px "OP Barlow SB", "Barlow Condensed", sans-serif`;
  g.letterSpacing = '1px';
  const ew = g.measureText(line.en).width;
  g.lineWidth = 6;
  g.lineJoin = 'round';
  g.strokeStyle = EDGE;
  g.strokeText(line.en, (W - ew) / 2, y + 52);
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.fillText(line.en, (W - ew) / 2, y + 52);
  g.restore();
  return true;
}
