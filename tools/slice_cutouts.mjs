// Cut character sprites out of their grey background locally (rembg ISNet anime, CPU, ~0.5 s/image)
// and export transparent webp for the game. Usage: node tools/slice_cutouts.mjs [srcDir=art/slice/ch]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const PY = fs.existsSync(process.env.HOME + '/ai/sd/venv/bin/python') ? process.env.HOME + '/ai/sd/venv/bin/python' : 'python3';
const SRC = process.argv[2] || 'art/slice/ch', CUT = 'art/slice/cut', OUT = 'game/img/ch';
fs.mkdirSync(CUT, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
const todo = fs.readdirSync(SRC).filter(f => f.endsWith('.png') && !fs.existsSync(path.join(OUT, f.replace('.png', '.webp'))));
if (todo.length) {
  execFileSync('python3', ['tools/rmbg_local.py', '--method', 'isnet-anime', ...todo.map(f => path.join(SRC, f)), '--out', CUT], { stdio: 'inherit' });
  for (const f of todo) {
    // Fill see-through holes inside the silhouette (hair, eyes, glasses); keeps the soft outer edge.
    execFileSync(PY, ['tools/alpha_holes.py', 'fill', path.join(CUT, f), path.join(CUT, f)]);
    execFileSync('magick', [path.join(CUT, f), '-resize', 'x1400', '-quality', '88', '-define', 'webp:alpha-quality=95', path.join(OUT, f.replace('.png', '.webp'))]);
    console.log('ok', f);
  }
}
console.log('done', todo.length);
