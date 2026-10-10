// Benchmark the content pack against plain files on the real game3d/ files (numbers go in desktop/pak/FORMAT.md).
//   node desktop/pak/bench.mjs [--work desktop/.bench] [--rounds 5]
// Packs game3d/ (without shots/) twice, with and without zstd for text, into --work (on disk, not /tmp, which is
// RAM here, or the cold runs would mean nothing). Cold runs drop the page cache of the files involved with
// posix_fadvise(DONTNEED), which needs no root. Uses a throwaway key, never desktop/.key.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ensureBuild } from '../../tools/lib/build-stamp.mjs';
import { pack } from './pack.mjs';
import { openDir, openPak } from './source.mjs';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : fallback; };
const work = path.resolve(arg('--work', path.join(repo, 'desktop/.bench')));
const rounds = Number(arg('--rounds', 5));
fs.mkdirSync(work, { recursive: true });

const walk = dir => fs.readdirSync(path.join(repo, dir), { withFileTypes: true }).flatMap(e => {
  const rel = `${dir}/${e.name}`;
  if (rel === 'game3d/shots' || e.name === 'node_modules') return [];
  const st = fs.statSync(path.join(repo, rel), { throwIfNoEntry: false });
  return !st ? [] : st.isDirectory() ? walk(rel) : st.isFile() ? [rel] : [];
});
const all = walk('game3d').sort();
const files = all.map(dest => ({ src: fs.realpathSync(path.join(repo, dest)), dest }));
const startup = ensureBuild().files.map(f => `game3d/${f}`);
const largest = all.reduce((a, b) => (fs.statSync(path.join(repo, b)).size > fs.statSync(path.join(repo, a)).size ? b : a));
const key = crypto.randomBytes(32);
const mb = n => (n / 1048576).toFixed(1);
const median = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const p95 = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length * 0.95)];
const time = async fn => { const t = performance.now(); await fn(); return performance.now() - t; };

function dropCache(paths) {
  const list = path.join(work, 'drop.json');
  fs.writeFileSync(list, JSON.stringify(paths));
  execFileSync('python3', ['-c', `import json,os,sys
for p in json.load(open(sys.argv[1])):
    fd=os.open(p,os.O_RDONLY); os.fsync(fd); os.posix_fadvise(fd,0,0,os.POSIX_FADV_DONTNEED); os.close(fd)`, list]);
}

const packs = {};
for (const compress of [true, false]) {
  const out = path.join(work, compress ? 'zstd.pak' : 'raw.pak');
  const t = performance.now();
  const r = pack({ files, out, key, compress });
  packs[compress ? 'pak zstd' : 'pak raw'] = out;
  console.log(`pack ${compress ? 'zstd' : 'raw '}: ${r.files} files, ${mb(r.bytesIn)} MB -> ${mb(r.bytesOut)} MB in ${((performance.now() - t) / 1000).toFixed(2)} s`);
}
const opened = { plain: openDir(repo) };
for (const [name, file] of Object.entries(packs)) {
  const ms = await time(() => { opened[name] = openPak(file, key); });
  console.log(`open ${name}: ${ms.toFixed(1)} ms (header, trailer, index)`);
}
const backing = name => (name === 'plain' ? startup.map(p => fs.realpathSync(path.join(repo, p))) : [packs[name]]);
const startupBytes = startup.reduce((n, p) => n + opened.plain.stat(p).size, 0);
console.log(`\nstartup set: ${startup.length} files, ${mb(startupBytes)} MB (game3d/build.json), all requested at once`);
for (const how of ['read', 'stream']) {
  for (const [name, source] of Object.entries(opened)) {
    const load = () => Promise.all(startup.map(p => (how === 'read' ? source.read(p) : Array.fromAsync(source.stream(p)))));
    await load();
    const warm = [], cold = [];
    for (let i = 0; i < rounds; i++) warm.push(await time(load));
    for (let i = 0; i < rounds; i++) { dropCache(backing(name)); cold.push(await time(load)); }
    console.log(`  ${how.padEnd(6)} ${name.padEnd(8)} warm ${median(warm).toFixed(1)} ms, cold ${median(cold).toFixed(1)} ms (median of ${rounds})`);
  }
}

const size = opened.plain.stat(largest).size;
console.log(`\nlarge file: ${largest}, ${mb(size)} MB`);
const ranges = Array.from({ length: 200 }, (_, i) => crypto.createHash('sha256').update(String(i)).digest().readUInt32BE(0) % (size - 1048576));
for (const [name, source] of Object.entries(opened)) {
  const lat = async () => { const out = []; for (const s of ranges) out.push(await time(() => Array.fromAsync(source.stream(largest, { start: s, end: s + 1048575 })))); return out; };
  const warm = await lat();
  dropCache(name === 'plain' ? [fs.realpathSync(path.join(repo, largest))] : [packs[name]]);
  const cold = await lat();
  console.log(`  1 MB range ${name.padEnd(8)} warm mean ${(warm.reduce((a, b) => a + b) / warm.length).toFixed(2)} ms p95 ${p95(warm).toFixed(2)} ms; cold-start mean ${(cold.reduce((a, b) => a + b) / cold.length).toFixed(2)} ms p95 ${p95(cold).toFixed(2)} ms`);
}
for (const [name, source] of Object.entries(opened)) {
  const throughput = async () => {
    let peak = 0;
    const base = process.memoryUsage().arrayBuffers;
    const ms = await time(async () => {
      for await (const part of source.stream(largest)) { peak = Math.max(peak, process.memoryUsage().arrayBuffers - base); void part; }
    });
    return { mbs: size / 1048576 / (ms / 1000), peak };
  };
  await throughput();
  const warm = await throughput();
  dropCache(name === 'plain' ? [fs.realpathSync(path.join(repo, largest))] : [packs[name]]);
  const cold = await throughput();
  console.log(`  stream ${name.padEnd(8)} warm ${warm.mbs.toFixed(0)} MB/s, cold ${cold.mbs.toFixed(0)} MB/s; peak buffer memory above baseline ${mb(Math.max(warm.peak, cold.peak))} MB`);
}
for (const [name, source] of Object.entries(opened)) if (source.close) source.close();
