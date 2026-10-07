// Shared existing drinks-machine display; bottles and controls are painted world detail.
import { textTexture } from '../../props.js';

export function drinksFace(accent, seed) {
  return textTexture(
    (ctx, w, h) => {
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, w, h);
      // the window: a pale lit back with the samples on three shelves
      ctx.fillStyle = '#f4f6f2';
      ctx.fillRect(18, 22, w - 36, h * 0.5);
      const drinks = ['#c8423a', '#e8e3d4', '#3d6fb0', '#d8a23a', '#4f8a4a', '#2a2f38', '#e07a3a', '#9fc4d8'];
      for (let r = 0; r < 3; r++) {
        const y0 = 34 + r * ((h * 0.5 - 20) / 3);
        for (let i = 0; i < 7; i++) {
          const x = 30 + i * ((w - 60) / 7);
          const col = drinks[(i * 3 + r * 5 + seed) % drinks.length];
          const tall = (i + r + seed) % 3 === 0;
          ctx.fillStyle = col;
          ctx.fillRect(x + 4, y0 + (tall ? 4 : 18), (w - 60) / 7 - 10, tall ? 66 : 52);
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillRect(x + 6, y0 + (tall ? 8 : 22), 5, tall ? 50 : 38);
          // the price and the button under each
          ctx.fillStyle = '#2a2f38';
          ctx.fillRect(x + 6, y0 + 74, (w - 60) / 7 - 14, 8);
          ctx.fillStyle = (i + r) % 4 === 0 ? '#7fd07a' : '#d9e0e4';
          ctx.fillRect(x + 10, y0 + 86, (w - 60) / 7 - 22, 8);
        }
      }
      // the coin panel and the pick-up slot
      ctx.fillStyle = '#3a3f47';
      ctx.fillRect(w * 0.62, h * 0.58, w * 0.26, h * 0.16);
      ctx.fillStyle = '#9aa0a8';
      ctx.fillRect(w * 0.68, h * 0.61, w * 0.05, h * 0.05);
      ctx.fillStyle = '#e8ecef';
      ctx.fillRect(w * 0.1, h * 0.6, w * 0.44, h * 0.12);
      ctx.fillStyle = '#23272d';
      ctx.fillRect(w * 0.12, h * 0.8, w * 0.76, h * 0.12);
    },
    256,
    512,
  );
}
