// tools/land.sh <branch | worktree path> [--keep] [--priority]: queue a finished branch to land on main (#389).
// The land joins the queue (queue.mjs). Whichever land holds the land lock runs the next batch for everyone waiting
// (runner.mjs); the others print their own entry's output as it comes and exit with its result. --priority puts the
// branch at the front of the queue (for work Jørgen is waiting on). How a land flows: .claude/skills/land/SKILL.md.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ahead, alive, join, pickBatch, print, queuePaths, readLog, readQueue, recover, update, withQueueLock } from './queue.mjs';
import { createRunner, dirtyFiles, worktreeOf } from './runner.mjs';

const LOCK = process.env.LAND_LOCK || '/tmp/claude-1000/land.lock';
const WAIT_SECONDS = Number(process.env.LAND_WAIT ?? 3600);
const say = text => print('out', `land: ${text}`);
const refuse = text => { print('err', `land: REFUSED: ${text}`); process.exit(1); };
const sleep = ms => new Promise(done => setTimeout(done, ms));
const run = (args, cwd) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : '';
};

const args = process.argv.slice(2);
const target = args.find(a => !a.startsWith('--'));
const flags = args.filter(a => a.startsWith('--'));
if (!target || flags.some(f => !['--keep', '--priority'].includes(f)) || args.filter(a => !a.startsWith('--')).length > 1)
  refuse('usage: tools/land.sh <branch | worktree path> [--keep] [--priority]');

const here = path.dirname(fileURLToPath(import.meta.url));
const common = run(['rev-parse', '--path-format=absolute', '--git-common-dir'], here);
const main = path.dirname(common);
let branch, wt = '';
if (fs.statSync(target, { throwIfNoEntry: false })?.isDirectory()) {
  wt = run(['rev-parse', '--show-toplevel'], target) || refuse(`${target} is not a git worktree`);
  branch = run(['symbolic-ref', '--quiet', '--short', 'HEAD'], wt) || refuse(`${wt} has no branch checked out (detached HEAD)`);
} else {
  branch = target.replace(/^refs\/heads\//, '');
  if (!run(['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`], main)) refuse(`no branch or worktree called ${target}`);
}
if (branch === 'main') refuse('that is main itself');

const paths = queuePaths(common);
fs.mkdirSync('/tmp/claude-1000', { recursive: true });
const logDir = fs.mkdtempSync('/tmp/claude-1000/land-');
const runner = createRunner({ main, mainWt: worktreeOf(main, 'main'), paths, logBase: path.join(logDir, 'land') });
wt ||= worktreeOf(main, branch);
if (wt) {
  const dirty = dirtyFiles(main, wt);
  if (dirty.length) refuse(`${wt} has uncommitted or untracked changes; commit them (your own files only) or remove them:\n${dirty.join('\n')}`);
}

// ---------------------------------------------------------------- the land lock (shared with lands already running)
const me = `land.sh pid=${process.pid} branch=${branch} started=${new Date().toTimeString().slice(0, 8)} (land queue)`;
const owner = () => { try { return fs.readFileSync(path.join(LOCK, 'owner'), 'utf8').trim(); } catch { return ''; } };
function takeLock() {
  for (;;) {
    try { fs.mkdirSync(LOCK); fs.writeFileSync(path.join(LOCK, 'owner'), me + '\n'); return true; }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    const held = owner(), pid = Number(/pid=(\d+)/.exec(held)?.[1]);
    if (pid && !alive(pid)) { say(`taking over a stale lock (${held})`); fs.rmSync(LOCK, { recursive: true, force: true }); continue; }
    return false;
  }
}
const dropLock = () => { if (owner() === me) fs.rmSync(LOCK, { recursive: true, force: true }); };

// ---------------------------------------------------------------- join, then run batches or wait for ours
// An agent's worktree (.claude/worktrees/agent-*) stays after landing: the agent's shell lives in it, and removing it
// leaves that shell dead before the agent can report. The coordinator removes it when the agent hands back.
const inside = /[\/]\.claude[\/]worktrees[\/]agent-/.test(wt || '');
if (inside && !flags.includes('--keep')) say(`${wt} is an agent's worktree, so it stays after landing (as with --keep)`);
const joined = join(paths, { branch, wt, keep: flags.includes('--keep') || inside, priority: flags.includes('--priority') });
if (joined.busy) refuse(`${branch} is already in the land queue (land.sh pid ${joined.busy.pid}); wait for that one`);
const id = joined.entry.id;
let printed = 0;
const quit = code => {
  runner.stop();
  withQueueLock(paths, queue => {
    const entry = queue.entries.find(e => e.id === id);
    if (entry?.state === 'waiting') Object.assign(entry, { state: 'done', result: { code, abandoned: true } });
  });
  dropLock();
  process.exit(code);
};
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => quit(130));

const printNew = () => {  // this entry's lines another runner wrote since the last look
  const { lines, next } = readLog(paths, id, printed);
  for (const line of lines) print(line.s, line.t);
  printed = next;
};
const started = Date.now();
let lastOwner = null;
for (;;) {
  printNew();
  const entry = readQueue(paths).entries.find(e => e.id === id);
  if (!entry || entry.state === 'done') {
    printNew();  // the last lines are written just before the entry is marked done
    // the check logs stay (a refusal, this land's or another's in the batch, points at them)
    if (!fs.readdirSync(logDir).length) fs.rmSync(logDir, { recursive: true, force: true });
    process.exit(entry?.result?.code ?? 1);
  }
  if (takeLock()) {
    let ran = false;
    try {
      const picked = withQueueLock(paths, queue => {
        const { removed } = recover(queue);
        for (const e of removed) fs.rmSync(path.join(paths.logs, `${e.id}.jsonl`), { force: true });
        const next = pickBatch(queue.entries);
        for (const e of next) Object.assign(e, { state: 'running', runner: process.pid });
        return next.map(e => ({ ...e }));
      });
      if (picked.length) {
        ran = true;
        await runner.landBatch(picked);
        printed = readLog(paths, id).next;  // the runner printed every line as it ran
      }
    } catch (error) {
      print('err', `land: the land queue runner failed: ${error.stack || error.message}`);
      update(paths, id, { state: 'done', result: { code: 1 } });
    } finally { dropLock(); }
    if (!ran) await sleep(2000);  // nothing waiting: ours is still running under a runner that let go of the lock
    continue;
  }
  if (entry.state === 'waiting' && (Date.now() - started) / 1000 >= WAIT_SECONDS) {
    print('err', `land: REFUSED: still waiting in the land queue after ${WAIT_SECONDS} s (the land lock: ${owner()}); try again`);
    quit(1);
  }
  const held = owner();
  if (held !== lastOwner && entry.state === 'waiting') {  // once it runs, the batch's own lines say what happens
    say(`waiting for the land lock (${held || 'free'}); ${ahead(readQueue(paths).entries, id)} land(s) ahead of this one in the queue`);
    lastOwner = held;
  }
  await sleep(2000);
}
