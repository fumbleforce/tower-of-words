// The title, drawn the way the game's title screen sets it (css/style.css #title .wordmark): AMAKAWA in the game's
// bold face, widely spaced, over a thin rail with a teal runner, here with 天川 stamped above in teal.
// drawLogo(g, t, o): t is seconds since the logo started landing; o: { x, y, size, shine (0..1 sweep), out (0..1) }
import { FONT, text, clamp, ease, lerp, glint, W, H } from './paint.js';

const WORD = 'AMAKAWA';
const TEAL = '#6fd0c6';

// drawn on its own canvas first, so the shine can stay on the letters (source-atop)
let off = null;
export function drawLogo(dst, t, o = {}) {
  if (!off) {
    off = document.createElement('canvas');
    off.width = W;
    off.height = H;
  }
  const g = off.getContext('2d');
  g.clearRect(0, 0, W, H);
  const r = paintLogo(g, t, o);
  dst.drawImage(off, 0, 0, W, H);
  return r;
}
function paintLogo(g, t, o) {
  const size = o.size || 150;
  const cx = o.x ?? 960,
    cy = o.y ?? 540;
  const out = o.out || 0;
  const track = 0.3 * size;
  g.save();
  g.font = `700 ${size}px "Zen Kaku Gothic New", sans-serif`;
  const widths = [...WORD].map((c) => g.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (WORD.length - 1);
  g.restore();
  let x = cx - total / 2;
  const shade = { color: 'rgba(14,18,28,0.35)', dx: 0, dy: size * 0.05 };
  // the letters land one after another, each from a little above and larger
  [...WORD].forEach((c, i) => {
    const lt = t - i * 0.045;
    const p = clamp(lt / 0.32);
    if (p > 0) {
      const e = ease.land(p);
      const s = lerp(1.6, 1, e) * (1 - out * 0.15);
      const y = cy - lerp(size * 0.5, 0, e) - out * size * 0.2;
      g.save();
      g.translate(x + widths[i] / 2, y - size * 0.36);
      g.scale(s, s);
      text(g, c, 0, size * 0.36, { font: '"Zen Kaku Gothic New", sans-serif', weight: 700, size, align: 'center', color: '#f6f8fb', alpha: clamp(lt / 0.06) * (1 - out), shadow: shade });
      g.restore();
    }
    x += widths[i] + track;
  });
  // the rail, drawn left to right under the word, the runner sliding along it
  const railY = cy + size * 0.32;
  const rp = ease.out3(clamp((t - 0.15) / 0.7));
  const rw = total;
  const rx = cx - total / 2;
  g.save();
  g.globalAlpha = 1 - out;
  g.fillStyle = 'rgba(238,240,244,0.45)';
  g.fillRect(rx, railY, rw * rp, Math.max(2, size * 0.022));
  const run = ((t * 0.32) % 1.15) - 0.1;
  if (rp > 0.3) {
    g.fillStyle = TEAL;
    g.fillRect(rx + rw * clamp(run, 0, 1) - size * 0.2, railY - 1, size * 0.4, Math.max(3, size * 0.03));
  }
  g.restore();
  // 天川, stamped above the word's start in teal
  const kt = t - 0.42;
  if (kt > 0) {
    const e = ease.land(clamp(kt / 0.3));
    const ks = size * 0.42;
    g.save();
    g.translate(cx - total / 2 + ks * 0.95, cy - size * 1.08);
    g.scale(lerp(2.2, 1, e), lerp(2.2, 1, e));
    text(g, '天川', 0, ks * 0.36, { font: FONT.jp, size: ks, align: 'center', color: TEAL, alpha: clamp(kt / 0.05) * (1 - out), tracking: 0.08 });
    g.restore();
  }
  // a shine across the letters
  if (o.shine > 0 && o.shine < 1) {
    const sx = lerp(cx - total / 2 - 200, cx + total / 2 + 200, o.shine);
    g.save();
    g.globalCompositeOperation = 'source-atop';
    const gr = g.createLinearGradient(sx - 120, 0, sx + 120, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.95)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.transform(1, 0, -0.3, 1, 0.3 * cy, 0); // skewed about the word's line
    g.fillRect(sx - 160, cy - size, 320, size * 1.4);
    g.restore();
    glint(g, sx, cy - size * 0.75, size * 0.35 * Math.sin(o.shine * Math.PI), '#ffffff', 0.9);
  }
  return { w: total, railY };
}
