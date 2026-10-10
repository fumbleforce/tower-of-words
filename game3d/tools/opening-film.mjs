// The film the game plays (game3d/opening/film.js): renders the opening without lyrics (opening-render.mjs video,
// which holds the GPU lock as opening-video-production) and writes the two copies the player picks from,
// game3d/assets/opening/film/opening-1080.mp4 and opening-720.mp4 (x264 tuned for animation, crf 25: about 28 and
// 13 MB). Run it after every change to the opening, or the game keeps playing the old cut; then
// `python3 tools/assets/sync.py push` and commit tools/assets/assets.lock.json.
//   node game3d/tools/opening-film.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const master = path.join(G, 'shots/opening-film/film-master');
const env = { ...process.env, Q: ['lyrics=0', process.env.Q].filter(Boolean).join('&') };
execFileSync('node', [path.join(G, 'tools/opening-render.mjs'), 'video', master], { stdio: 'inherit', env });
const src = path.join(master, 'opening-1920.mp4');
const out = path.join(G, 'assets/opening/film');
fs.mkdirSync(out, { recursive: true });
const enc = (height, crf, audio, file) =>
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, ...(height === 1080 ? [] : ['-vf', `scale=-2:${height}:flags=lanczos`]),
    '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', String(crf), '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', audio, '-movflags', '+faststart', path.join(out, file)], { stdio: 'inherit' });
enc(1080, 25, '160k', 'opening-1080.mp4');
enc(720, 25, '128k', 'opening-720.mp4');
for (const f of ['opening-1080.mp4', 'opening-720.mp4']) console.log(path.join(out, f), (fs.statSync(path.join(out, f)).size / 1e6).toFixed(1), 'MB');
console.log('next: python3 tools/assets/sync.py push, then commit tools/assets/assets.lock.json');
