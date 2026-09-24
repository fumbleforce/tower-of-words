// Cut character sprites out of their grey background (851-labs remover) and export transparent webp for the game.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { run, spent } from './rep.mjs';
const SRC = 'art/slice/ch', CUT = 'art/slice/cut', OUT = 'game/img/ch';
fs.mkdirSync(CUT, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
const files = fs.readdirSync(SRC).filter(f => f.endsWith('.png'));
await Promise.all(files.map(async f => {
  const out = path.join(OUT, f.replace('.png', '.webp'));
  if (fs.existsSync(out)) return;
  try {
    const cut = await run('851-labs/background-remover', { image: path.join(SRC, f) }, path.join(CUT, f));
    execFileSync('magick', [Array.isArray(cut) ? cut[0] : cut, '-resize', 'x1400', '-quality', '88', '-define', 'webp:alpha-quality=95', out]);
    console.log('ok', f);
  } catch (e) { console.log('FAIL', f, e.message.slice(0, 120)); }
}));
console.log('spent', spent());
