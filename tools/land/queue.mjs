// The land queue (#389): one file under the shared git dir lists every land waiting, running or done. tools/land.sh
// joins it; whichever land holds the land lock runs the next batch for everyone (tools/land/runner.mjs), and the
// others wait for their entry's result. The order rules and the batching split are pure functions, tested in
// game3d/test/unit/land-queue.test.mjs.
import fs from 'node:fs';
import path from 'node:path';

export const MAX_BATCH = 6;
const sleeper = new Int32Array(new SharedArrayBuffer(4));
export const sleepSync = ms => Atomics.wait(sleeper, 0, 0, ms);
export const alive = pid => {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; }
};

export function queuePaths(commonDir) {
  const dir = path.join(commonDir, 'land-queue');
  return { dir, file: path.join(dir, 'queue.json'), lock: path.join(dir, 'queue.lock'), logs: path.join(dir, 'logs'),
    cache: path.join(dir, 'cache.json') };
}

// A short critical section around reading and writing queue.json: a mkdir lock whose owner pid is checked, like the
// land lock. Nothing slow happens while it is held.
export function withQueueLock(paths, fn) {
  fs.mkdirSync(paths.dir, { recursive: true });
  for (let tries = 0; ; tries++) {
    try { fs.mkdirSync(paths.lock); break; } catch (error) { if (error.code !== 'EEXIST') throw error; }
    let owner = null;
    try { owner = Number(fs.readFileSync(path.join(paths.lock, 'pid'), 'utf8').trim()) || null; } catch { /* being made */ }
    if ((owner && !alive(owner)) || tries > 400) { fs.rmSync(paths.lock, { recursive: true, force: true }); continue; }
    sleepSync(25);
  }
  fs.writeFileSync(path.join(paths.lock, 'pid'), String(process.pid));
  try {
    const queue = readQueue(paths);
    const result = fn(queue);
    writeJson(paths.file, queue);
    return result;
  } finally { fs.rmSync(paths.lock, { recursive: true, force: true }); }
}

export function readQueue(paths) {
  try { return JSON.parse(fs.readFileSync(paths.file, 'utf8')); } catch { return { seq: 0, entries: [] }; }
}
export function writeJson(file, value) {
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 1) + '\n');
  fs.renameSync(temporary, file);
}

// Waiting entries in landing order: --priority first, then the order they joined.
export const ordered = entries => entries.filter(e => e.state === 'waiting')
  .sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0) || a.seq - b.seq);

// The next batch: up to MAX_BATCH waiting entries, in landing order.
export const pickBatch = (entries, max = MAX_BATCH) => ordered(entries).slice(0, max);

// How many waiting entries land before this one, for the waiting message.
export const ahead = (entries, id) => {
  const list = ordered(entries), index = list.findIndex(e => e.id === id);
  return index < 0 ? 0 : index + entries.filter(e => e.state === 'running').length;
};

export const halves = list => [list.slice(0, Math.ceil(list.length / 2)), list.slice(Math.ceil(list.length / 2))];

// A batch is tried whole; if its checks fail, the first half is tried, then the second, down to single branches, so
// one bad branch is refused alone and the rest still land. attempt(group) lands the group and returns { ok: true }, or
// returns { ok: false, message } with main unchanged; { final: true } refuses the whole group without splitting
// (main kept moving). It may settle single entries itself (a rebase conflict): those have entry.done set.
export async function landInHalves(group, attempt, refuse) {
  const open = group.filter(e => !e.done);
  if (!open.length) return;
  const outcome = await attempt(open);
  if (outcome.ok) return;
  const left = open.filter(e => !e.done);
  if (outcome.final || left.length === 1) { for (const e of left) refuse(e, outcome.message); return; }
  for (const half of halves(left)) await landInHalves(half, attempt, refuse);
}

// Entries a dead runner left running go back to waiting; entries whose own land.sh is gone are dropped.
export function recover(queue, isAlive = alive) {
  const dropped = [];
  for (const e of queue.entries) {
    if (e.state === 'running' && !isAlive(e.runner)) { e.state = 'waiting'; delete e.runner; }
    if (e.state === 'waiting' && !isAlive(e.pid)) { e.state = 'done'; e.result = { code: 1, abandoned: true }; dropped.push(e); }
  }
  // Keep the file short: done entries go once their land.sh has read them, or after a day.
  const day = Date.now() - 86400000;
  const removed = queue.entries.filter(e => e.state === 'done' && !(isAlive(e.pid) && e.joined > day));
  queue.entries = queue.entries.filter(e => !removed.includes(e));
  return { dropped, removed };
}

export function join(paths, fields) {
  return withQueueLock(paths, queue => {
    const same = queue.entries.find(e => e.branch === fields.branch && e.state !== 'done');
    if (same && alive(same.pid)) return { busy: same };
    if (same) same.state = 'done';
    const entry = { id: `${Date.now().toString(36)}-${process.pid}`, seq: ++queue.seq, state: 'waiting',
      joined: Date.now(), pid: process.pid, ...fields };
    queue.entries.push(entry);
    return { entry };
  });
}

export function update(paths, id, change) {
  return withQueueLock(paths, queue => {
    const entry = queue.entries.find(e => e.id === id);
    if (entry) Object.assign(entry, change);
    return entry;
  });
}

// Each entry's output, line by line, so the land.sh that queued it can print it as it comes.
export function appendLog(paths, id, stream, text) {
  fs.mkdirSync(paths.logs, { recursive: true });
  fs.appendFileSync(path.join(paths.logs, `${id}.jsonl`), JSON.stringify({ s: stream, t: text }) + '\n');
}
export function readLog(paths, id, from = 0) {
  let text = '';
  try { text = fs.readFileSync(path.join(paths.logs, `${id}.jsonl`), 'utf8'); } catch { return { lines: [], next: from }; }
  const all = text.split('\n').filter(Boolean);
  return { lines: all.slice(from).map(line => JSON.parse(line)), next: all.length };
}

// Output written straight to the file descriptor: a land exits right after its last line, and process.exit drops
// what a pipe hasn't taken yet from process.stdout.
export function print(stream, text) {
  let buffer = Buffer.from(text + '\n');
  while (buffer.length) {
    try { buffer = buffer.subarray(fs.writeSync(stream === 'err' ? 2 : 1, buffer)); }
    catch (error) { if (error.code !== 'EAGAIN') throw error; sleepSync(5); }
  }
}
