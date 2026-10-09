// The land queue (#389): landing order, --priority, batching and splitting a failed batch, recovering after a
// runner dies, which places a change can move, and three real lands through tools/land.sh in a fixture repository.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { isolatedGitEnvironment } from '../../../tools/lib/git-environment.mjs';
import { ahead, halves, landInHalves, ordered, pickBatch, recover } from '../../../tools/land/queue.mjs';
import { affectedBy, affectedPlaces, buildGraph, importsOf, lockDelta, planPlaces } from '../../../tools/land/impact.mjs';

const entry = (seq, fields = {}) => ({ id: `e${seq}`, seq, state: 'waiting', branch: `b${seq}`, ...fields });

test('lands in the order branches joined, --priority first', () => {
  const entries = [entry(1), entry(2), entry(3, { priority: true }), entry(4, { state: 'done' }), entry(5, { priority: true })];
  assert.deepEqual(ordered(entries).map(e => e.seq), [3, 5, 1, 2]);
  assert.deepEqual(pickBatch(entries, 2).map(e => e.seq), [3, 5]);
  assert.deepEqual(pickBatch(entries).map(e => e.seq), [3, 5, 1, 2]);
  assert.equal(ahead(entries, 'e2'), 3);
  assert.equal(ahead([entry(1, { state: 'running' }), entry(2)], 'e2'), 1);
});

test('a failed batch is split in halves until the bad branch is refused alone', async () => {
  const entries = [1, 2, 3, 4, 5].map(seq => entry(seq));
  const tried = [], landed = [], refused = [];
  const attempt = async group => {
    tried.push(group.map(e => e.seq));
    if (group.some(e => e.seq === 4)) return { ok: false, message: 'b4 breaks the checks' };
    landed.push(...group.map(e => e.seq));
    return { ok: true };
  };
  await landInHalves(entries, attempt, (e, message) => refused.push([e.seq, message]));
  assert.deepEqual(landed, [1, 2, 3, 5]);
  assert.deepEqual(refused, [[4, 'b4 breaks the checks']]);
  assert.deepEqual(tried, [[1, 2, 3, 4, 5], [1, 2, 3], [4, 5], [4], [5]]);
  assert.deepEqual(halves([1, 2, 3]), [[1, 2], [3]]);
});

test('a batch that passes is checked once; settled and final outcomes are not split', async () => {
  const entries = [1, 2, 3].map(seq => entry(seq));
  let attempts = 0;
  await landInHalves(entries, async () => { attempts++; return { ok: true }; }, () => assert.fail('nothing refused'));
  assert.equal(attempts, 1);
  // a branch that conflicts is refused by the attempt itself and drops out of the halves
  const second = [1, 2, 3].map(seq => entry(seq)), tried = [];
  await landInHalves(second, async group => {
    tried.push(group.map(e => e.seq));
    const conflict = group.find(e => e.seq === 1);
    if (conflict) conflict.done = true;
    return group.length > 1 ? { ok: false, message: 'checks' } : { ok: true };
  }, () => {});
  assert.deepEqual(tried, [[1, 2, 3], [2], [3]]);
  const refused = [];
  await landInHalves([1, 2].map(seq => entry(seq)), async () => ({ ok: false, final: true, message: 'main kept moving' }),
    e => refused.push(e.seq));
  assert.deepEqual(refused, [1, 2]);
});

test('a dead runner\'s entries wait again; a dead land.sh\'s entry is dropped', () => {
  const queue = { entries: [entry(1, { state: 'running', runner: 10, pid: 11 }), entry(2, { pid: 12 }),
    entry(3, { state: 'done', pid: 13, joined: Date.now() }), entry(4, { state: 'done', pid: 11, joined: Date.now() })] };
  const living = new Set([11, 13]);
  const { dropped, removed } = recover(queue, pid => living.has(pid));
  assert.equal(queue.entries.find(e => e.seq === 1).state, 'waiting');
  assert.deepEqual(dropped.map(e => e.seq), [2]);
  assert.deepEqual(removed.map(e => e.seq), [2]);
  assert.deepEqual(queue.entries.map(e => e.seq), [1, 3, 4]);
});

// A small game: main.js loads the shared engine and the two places; the plaza imports its own fountain.
function graph() {
  const sources = new Map(Object.entries({
    'game3d/js/main.js': "import { PLACES } from './places/factories.js';\nimport { engine } from './engine.js';",
    'game3d/js/engine.js': "import * as THREE from 'three';",
    'game3d/js/places/factories.js': "import { plaza } from './plaza.js';\nexport { gym } from './gym.js';",
    'game3d/js/places/plaza.js': "import {\n  fountain,\n} from '../kit/fountain.js';\nimport { engine } from '../engine.js';",
    'game3d/js/places/gym.js': "const model = 'assets/gym/mats.glb'; import('./gym-extra.js');",
    'game3d/js/places/gym-extra.js': '',
    'game3d/js/kit/fountain.js': "const water = 'assets/fountain/water.png';",
    'game3d/js/unused.js': '',
  }));
  return buildGraph(sources, { plaza: 'game3d/js/places/plaza.js', gym: 'game3d/js/places/gym.js' });
}

test('module imports are followed, dynamic and multi-line ones too', () => {
  assert.deepEqual(importsOf('game3d/js/places/plaza.js', "import {\n  a,\n} from '../kit/a.js?v=1';\nexport * from './b.js';\nimport('./c.js');\nimport 'three';"),
    ['game3d/js/kit/a.js', 'game3d/js/places/b.js', 'game3d/js/places/c.js', 'game3d/vendor/three/three.module.js']);
});

test('a change re-measures only the places it can move', () => {
  const g = graph();
  assert.deepEqual(affectedBy('game3d/js/kit/fountain.js', g), ['plaza']);
  assert.deepEqual(affectedBy('game3d/js/places/gym-extra.js', g), ['gym']);
  assert.deepEqual(affectedBy('game3d/assets/fountain/water.png', g), ['plaza']);
  assert.deepEqual(affectedBy('game3d/assets/gym/mats.glb', g), ['gym']);
  assert.equal(affectedBy('game3d/js/engine.js', g), 'all', 'the shared engine moves every place');
  assert.equal(affectedBy('game3d/js/unused.js', g), 'all', 'a module nothing names may be loaded by a computed name');
  assert.equal(affectedBy('game3d/assets/unnamed.glb', g), 'all');
  assert.equal(affectedBy('game3d/tools/perf/place-budgets.json', g), 'all', 'the budget tool and its budgets');
  assert.equal(affectedBy('package-lock.json', g), 'all');
  for (const file of ['notes/PERF.md', 'reviews/x/review.json', 'island/private/plugins/a.js', 'game3d/test/unit/a.test.mjs',
    'game3d/audio/mio-1.mp3', 'game3d/opening/op.js', 'docs/game/places.md', 'tools/check/lint.mjs'])
    assert.deepEqual(affectedBy(file, g), [], file);
  assert.deepEqual([...affectedPlaces(['notes/a.md', 'game3d/js/kit/fountain.js'], [g])], ['plaza']);
  assert.equal(affectedPlaces(['game3d/js/kit/fountain.js', 'game3d/js/engine.js'], [g]), 'all');
  assert.deepEqual(lockDelta({ files: { a: { sha256: '1' }, b: { sha256: '2' } } }, { files: { a: { sha256: '1' }, b: { sha256: '3' }, c: { sha256: '4' } } }), ['b', 'c']);
});

test('places nothing can move reuse their last pass', () => {
  const impact = (from) => ({ old: 'all', recent: new Set(['plaza']) })[from];
  const plan = planPlaces(['plaza', 'gym', 'pool', 'train'], { plaza: 'recent', gym: 'recent', pool: 'old', train: 'tip' }, 'tip', impact);
  assert.deepEqual(plan.measure, ['plaza', 'pool']);
  assert.deepEqual(plan.reused, { gym: 'recent', train: 'tip' });
  assert.deepEqual(planPlaces(['plaza'], {}, 'tip', impact).measure, ['plaza'], 'never measured: measured now');
});

// ---------------------------------------------------------------- three real lands through tools/land.sh
function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'land-queue-fixture-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const main = path.join(base, 'main');
  fs.mkdirSync(main);
  const env = { ...isolatedGitEnvironment(), LAND_LOCK: path.join(base, 'land.lock'), LAND_WAIT: '60' };
  const git = (cwd, ...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const write = (root, file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  git(main, 'init', '--quiet', '-b', 'main');
  git(main, 'config', 'user.name', 'Fixture');
  git(main, 'config', 'user.email', 'fixture@example.invalid');
  git(main, 'config', 'core.hooksPath', '/dev/null');
  for (const file of ['land.sh', 'land/land.mjs', 'land/runner.mjs', 'land/queue.mjs', 'land/impact.mjs', 'check/landed-assets.mjs'])
    write(main, `tools/${file}`, fs.readFileSync(new URL(`../../../tools/${file}`, import.meta.url), 'utf8'));
  // The commit check: counts its runs, takes a moment (so the other lands queue up behind the first), and fails a
  // tree with a bad file in it.
  const runs = path.join(base, 'cpu-runs');
  write(main, 'tools/check/commit-cpu.mjs', `
    import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
    fs.appendFileSync(${JSON.stringify(runs)}, process.argv[2] + '\\n');
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500);
    const files = execFileSync('git', ['ls-tree', '-r', '--name-only', process.argv[2]], { encoding: 'utf8' });
    if (files.includes('bad.txt')) { console.error('commit CPU: FAIL; bad.txt'); process.exit(1); }
    console.log('commit CPU: PASS; fixture');
  `);
  write(main, '.gitignore', '.claude/\n');
  git(main, 'add', '.');
  git(main, 'commit', '--quiet', '-m', 'fixture');
  const branch = (name, file) => {
    const wt = path.join(main, '.claude/worktrees', name);
    git(main, 'worktree', 'add', '--quiet', '-b', name, wt, 'main');
    write(wt, file, `${name}\n`);
    git(wt, 'add', file);
    git(wt, 'commit', '--quiet', '-m', name);
    return wt;
  };
  const land = (name, ...flags) => new Promise(resolve => {
    const child = spawn('bash', [path.join(main, 'tools/land.sh'), name, ...flags], { cwd: main, env });
    let out = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { out += d; });
    child.on('close', code => resolve({ code, out }));
  });
  const queued = () => {
    try { return JSON.parse(fs.readFileSync(path.join(main, '.git/land-queue/queue.json'), 'utf8')).entries.map(e => e.branch); }
    catch { return []; }
  };
  const cpuRuns = () => fs.existsSync(runs) ? fs.readFileSync(runs, 'utf8').trim().split('\n').length : 0;
  const waitFor = async check => { for (let i = 0; i < 200 && !check(); i++) await new Promise(r => setTimeout(r, 50)); };
  return { main, git, branch, land, cpuRuns, waitFor, queued };
}

test('lands that queue up behind a running one land together, and a bad one is refused alone', { timeout: 60000 }, async t => {
  const { main, git, branch, land, cpuRuns, waitFor, queued } = fixture(t);
  for (const name of ['one', 'two', 'three', 'four']) branch(name, `notes/${name}.md`);
  branch('bad', 'bad.txt');
  const first = land('one');
  await waitFor(() => cpuRuns() === 1);  // one is being checked: the others join the queue behind it
  const rest = [];
  for (const args of [['two'], ['bad'], ['three'], ['four', '--priority']]) {  // one after another, so the order is known
    rest.push(land(...args));
    await waitFor(() => queued().includes(args[0]));
  }
  const results = await Promise.all([first, ...rest]);
  const [one, two, bad, three, four] = results;
  for (const [name, result] of Object.entries({ one, two, three, four })) assert.equal(result.code, 0, `${name}:\n${result.out}`);
  assert.equal(bad.code, 1, bad.out);
  assert.match(bad.out, /REFUSED: .*commit CPU: FAIL; bad\.txt/s);
  // one alone; then [four (priority), two, bad, three] together, which fails; [four, two] lands, then [bad, three]
  // fails and splits: bad refused, three lands. Six check runs; with no bad branch it would be two.
  assert.equal(cpuRuns(), 6);
  const log = git(main, 'log', '--format=%s', 'main').split('\n');
  assert.deepEqual(log.slice(0, 4), ['three', 'two', 'four', 'one']);
  assert.match(four.out, /landing 4 queued branches as one batch: four, two, bad, three/);
  for (const name of ['one', 'two', 'three', 'four']) assert(!fs.existsSync(path.join(main, '.claude/worktrees', name)), `${name} removed`);
  assert(fs.existsSync(path.join(main, '.claude/worktrees/bad')), 'the refused branch keeps its worktree');
  assert.equal(git(main, 'log', '--format=%s', '-1', 'bad'), 'bad', 'the refused branch is as its agent left it');
});
