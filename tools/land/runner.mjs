// The land queue's runner (#389): lands a batch of queued branches in one go. The branches are rebased one after
// another onto main in the land candidate worktree (.claude/worktrees/land-candidate; the branches themselves aren't
// touched until they land), the checks run once on the batch's last commit, and main fast-forwards through all of
// them. A failing batch is split in halves (queue.mjs, landInHalves) until the bad branch is refused alone. The
// checks are the ones tools/land.sh always ran, each from the candidate's own tree: the commit checks
// (tools/check/commit-cpu.mjs, on exactly that commit), the place budgets when game3d/ changed (only the places the
// batch can move; the others reuse their last pass, impact.mjs; a place over its ceiling is refused only when it is
// worse than on main, baseline.mjs), then, once main has moved, the asset handoff
// (tools/check/landed-assets.mjs, per branch) and the boot check (tools/check/head-boot.mjs).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { appendLog, landInHalves, print, update, writeJson } from './queue.mjs';
import { gitImpact, planPlaces } from './impact.mjs';
import { heldWarning, judgeOverages, worseLine } from './baseline.mjs';
import { pathToFileURL } from 'node:url';

const MOVES = 5;  // rounds when main moves during the checks (a commit straight to main)

const run = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 64 << 20 });
  return { code: r.status ?? 1, out: (r.stdout || '').trimEnd(), err: (r.stderr || '').trim() };
};

// The worktree that has the branch checked out, if any.
export function worktreeOf(main, branch) {
  let at = '';
  for (const line of run('git', ['worktree', 'list', '--porcelain'], main).out.split('\n')) {
    if (line.startsWith('worktree ')) at = line.slice(9);
    else if (line === `branch refs/heads/${branch}`) return at;
  }
  return '';
}

// Uncommitted or untracked files, except __pycache__ folders (any Python run makes them) and tools/worktree.sh's
// links to locked files git doesn't ignore: into its read-only store in main, or (setups before #148) to main's copy.
export const dirtyFiles = (main, wt) => run('git', ['status', '--porcelain', '--untracked-files=all'], wt).out.split('\n')
  .filter(Boolean).filter(line => !/^\?\? (.*\/)?__pycache__\//.test(line)).filter(line => {
    if (!line.startsWith('?? ')) return true;
    const rel = line.slice(3), file = path.join(wt, rel);
    if (!fs.lstatSync(file, { throwIfNoEntry: false })?.isSymbolicLink()) return true;
    const link = fs.readlinkSync(file);
    return !(link === path.join(main, rel) || link.startsWith(path.join(main, '.claude/worktrees/.assets') + '/'));
  });

export function createRunner({ main, mainWt, paths, logBase }) {
  const git = (...args) => run('git', args, main);
  const rev = ref => git('rev-parse', '--verify', '--quiet', ref).out;
  const short = sha => sha.slice(0, 8);
  const cand = path.join(main, '.claude/worktrees/land-candidate');
  const cg = (...args) => run('git', ['-c', 'core.hooksPath=/dev/null', ...args], cand);
  const tool = (rel, fallback) => fs.existsSync(path.join(cand, rel)) ? path.join(cand, rel) : fallback;
  let child = null;

  // ------------------------------------------------------------ output: every line goes to the entries it is about
  let batch = [];
  const emit = (entries, stream, text) => {
    for (const line of String(text).split('\n')) {
      const tag = batch.length > 1 && entries.length === 1 ? `${entries[0].branch}: ` : '';
      print(stream, `${line.startsWith('land: ') ? line : 'land: ' + tag + line}`);
      for (const e of entries) appendLog(paths, e.id, stream, line.startsWith('land: ') ? line : 'land: ' + line);
    }
  };
  const say = (entries, text) => emit(entries, 'out', text);
  const finish = (e, code, lines = []) => {
    if (e.done) return;
    for (const line of lines) emit([e], code ? 'err' : 'out', line);
    e.done = true;
    update(paths, e.id, { state: 'done', result: { code } });
  };
  const refuse = (e, message) => {
    emit([e], 'err', `REFUSED: ${message}`);
    finish(e, 1);
  };

  const longRun = (cmd, args, cwd, log) => new Promise(resolve => {
    const fd = fs.openSync(log, 'w');
    child = spawn(cmd, args, { cwd, stdio: ['ignore', fd, fd], detached: true });
    child.once('error', () => resolve(1));
    child.once('exit', (code, signal) => { child = null; fs.closeSync(fd); resolve(signal ? 1 : code); });
  });
  const stop = () => {
    if (child?.pid) try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ }
    if (fs.existsSync(cand)) { cg('rebase', '--abort'); }
  };
  const cache = () => { try { return JSON.parse(fs.readFileSync(paths.cache, 'utf8')); } catch { return {}; } };
  const saveCache = change => { const c = { ...cache(), ...change }; writeJson(paths.cache, c); };

  // ------------------------------------------------------------ the entries' worktrees
  const prepare = e => {
    if (!rev(`refs/heads/${e.branch}`)) return refuse(e, `no branch called ${e.branch} any more`);
    e.wt = worktreeOf(main, e.branch);
    if (!e.wt) {
      e.temp = path.join(main, '.claude/worktrees', `land-${e.branch.replaceAll('/', '-')}`);
      const r = git('worktree', 'add', '--quiet', e.temp, e.branch);
      if (r.code) { delete e.temp; return refuse(e, `could not check out ${e.branch} in a temporary worktree: ${r.err}`); }
      e.wt = e.temp;
    }
    const dirty = dirtyFiles(main, e.wt);
    if (dirty.length) return refuse(e, `${e.wt} has uncommitted or untracked changes; commit them (your own files only) or remove them:\n${dirty.join('\n')}`);
    const gitPath = p => run('git', ['rev-parse', '--git-path', p], e.wt).out;
    if (['rebase-merge', 'rebase-apply'].some(p => fs.existsSync(path.resolve(e.wt, gitPath(p)))))
      return refuse(e, `${e.wt} is in the middle of a rebase`);
    e.orig = rev(`refs/heads/${e.branch}`);
  };

  // ------------------------------------------------------------ the candidate: the batch rebased onto main
  const copiesFile = path.join(paths.dir, 'candidate-copies.json');
  const dropCopies = () => {
    let copies = [];
    try { copies = JSON.parse(fs.readFileSync(copiesFile, 'utf8')); } catch { /* none */ }
    for (const rel of copies) fs.rmSync(path.join(cand, rel), { force: true });
    fs.rmSync(copiesFile, { force: true });
  };
  // A detached worktree land.sh keeps, clean and at the given commit: the candidate, and main's own tree for the
  // place budgets (baseTree).
  const ensureTree = (dir, commit, what, tidyFirst = () => {}) => {
    const tg = (...args) => run('git', ['-c', 'core.hooksPath=/dev/null', ...args], dir);
    if (!worktreeListed(dir)) {
      git('worktree', 'prune');
      if (fs.existsSync(dir)) throw new Error(`${dir} exists but is not a worktree; move it away`);
      const r = git('worktree', 'add', '--quiet', '--detach', dir, commit);
      if (r.code) throw new Error(`could not make the ${what} worktree: ${r.err}`);
    }
    tidyFirst();
    tg('rebase', '--abort');
    tg('reset', '--quiet', '--hard');
    tg('clean', '-fdq');  // untracked, not ignored: links to locked files git tracks in some commits
    if (tg('checkout', '--quiet', '--detach', commit).code) {
      tg('clean', '-fdxq');
      const r = tg('checkout', '--quiet', '--detach', commit);
      if (r.code) throw new Error(`could not check out ${short(commit)} in the ${what} worktree: ${r.err}`);
    }
  };
  const ensureCandidate = base => ensureTree(cand, base, 'land candidate', dropCopies);
  const worktreeListed = wt => git('worktree', 'list', '--porcelain').out.split('\n').includes(`worktree ${wt}`);
  const build = (group, base) => {
    ensureCandidate(base);
    let tip = base;
    const chain = [], ahead = [];
    for (const e of group) {
      const r = cg('rebase', '--quiet', '--onto', tip, base, e.orig);
      if (r.code) {
        const conflicts = cg('diff', '--name-only', '--diff-filter=U').out;
        cg('rebase', '--abort');
        cg('checkout', '--quiet', '--detach', tip);
        refuse(e, `${e.branch} does not rebase cleanly on main${ahead.length ? ` with ${ahead.join(', ')} (landing first)` : ''}; conflicts in:\n${conflicts || r.err}\nRebase it yourself in ${e.wt} (resolve only your own files), then land again.`);
        continue;
      }
      e.parent = tip; e.commit = run('git', ['rev-parse', 'HEAD'], cand).out; tip = e.commit;
      chain.push(e); ahead.push(e.branch);
    }
    return { chain, tip };
  };
  // The candidate's locked assets: tools/worktree.sh setup links main's, then the files only the batch's own
  // worktrees hold (new or changed assets, not yet in main) are copied from there, checked against the lock (a copy,
  // not a link: a worktree may sit outside the main checkout, and the commit checks only read files inside it).
  const prepareAssets = chain => {
    const setup = tool('tools/worktree.sh', '');
    if (setup) run(setup, ['setup', cand], cand);
    let lock;
    try { lock = JSON.parse(fs.readFileSync(path.join(cand, 'tools/assets/assets.lock.json'), 'utf8')).files; } catch { return; }
    // A real file here (not one of setup's links, which it keeps current) is a copy left by an earlier batch:
    // if its bytes no longer match the lock it is replaced, an unchanged one is left alone.
    let earlier = [];
    try { earlier = JSON.parse(fs.readFileSync(copiesFile, 'utf8')); } catch { /* none */ }
    const copies = [];
    for (const [rel, entry] of Object.entries(lock)) {
      const target = path.join(cand, rel);
      if (fs.existsSync(target) && !(!fs.lstatSync(target).isSymbolicLink() && sha256(target) !== entry.sha256)) continue;
      if (rel.split('/').some(p => ['..', 'private', '.git'].includes(p))) continue;
      for (const e of chain) {
        let real;
        try { real = fs.realpathSync(path.join(e.wt, rel)); } catch { continue; }
        if (!fs.statSync(real).isFile() || sha256(real) !== entry.sha256) continue;
        fs.rmSync(target, { force: true });
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(real, target, fs.constants.COPYFILE_FICLONE);
        copies.push(rel);
        if (sha256(target) !== entry.sha256) fs.rmSync(target);  // changed while copied: the checks will say it's missing
        break;
      }
    }
    if (copies.length) writeJson(copiesFile, [...new Set([...earlier, ...copies])]);
  };

  // ------------------------------------------------------------ the checks
  const checkCpu = async (chain, base, tip) => {
    const tree = rev(`${tip}^{tree}`), passed = cache().cpu || [];
    if (passed.includes(tree)) { say(chain, `commit CPU: reused the pass of this exact tree ${short(tree)}`); return { ok: true }; }
    const started = Date.now(), log = `${logBase}.cpu-${short(tip)}`;
    const code = await longRun('node', [tool('tools/check/commit-cpu.mjs', path.join(main, 'tools/check/commit-cpu.mjs')), tip, '--since', base], cand, log);
    const text = fs.readFileSync(log, 'utf8');
    for (const line of text.split('\n').filter(l => /^(commit messages|commit CPU):/.test(l))) say(chain, line);
    if (code) return { ok: false, message: `${text.trimEnd().split('\n').slice(-40).join('\n')}\nthe commit checks failed on ${short(tip)} (full log: ${log}); main is unchanged` };
    say(chain, `commit checks passed in ${Math.round((Date.now() - started) / 1000)} s`);
    saveCache({ cpu: [tree, ...passed].slice(0, 40) });
    return { ok: true };
  };
  const checkBudget = async (chain, base, tip) => {
    const budgeter = path.join(cand, 'game3d/tools/perf/place-budget.mjs');
    if (!fs.existsSync(budgeter) || !git('diff', '--quiet', base, tip, '--', 'game3d/').code) return { ok: true };
    // Only the places this land can move: the others draw exactly what main draws, so it can't take them over.
    const impact = gitImpact(main), places = impact.placesAt(tip), moved = impact.impact(base, tip);
    const movable = moved === 'all' ? places : places.filter(place => moved.has(place));
    if (!movable.length) { say(chain, 'place budgets: nothing in this land can move a place (impact.mjs); not measured'); return { ok: true }; }
    const { measure, reused } = planPlaces(movable, cache().budget || {}, tip, impact.impact);
    if (movable.length < places.length) say(chain, `place budgets: ${places.length - movable.length} of ${places.length} places can't move in this land; not measured`);
    if (Object.keys(reused).length) say(chain, `place budgets: ${Object.keys(reused).join(', ')} reuse an earlier pass (nothing since then can move them)`);
    if (!measure.length) return { ok: true };
    say(chain, `measuring ${measure.length === places.length ? 'every place' : measure.join(', ')} against its budget (game3d/tools/perf/place-budget.mjs)`);
    const started = Date.now(), log = `${logBase}.budget-${short(tip)}`, json = `${log}.json`;
    fs.rmSync(json, { force: true });
    const code = await longRun('node', [budgeter, ...(measure.length === places.length ? [] : ['--places', measure.join(',')]), '--json', json], cand, log);
    for (const line of fs.readFileSync(log, 'utf8').split('\n').filter(l => /^(PASS|FAIL|DEFERRED|warning|note)|^ {2}/.test(l))) say(chain, line);
    if (code === 75) { say(chain, `WARNING: the place budgets were deferred (machine or GPU busy), so ${short(tip)} is unmeasured; run: node game3d/tools/perf/place-budget.mjs`); return { ok: true }; }
    let passed = measure;
    if (code) {
      // Over on the tip: refused only if the batch makes a place worse than main (baseline.mjs).
      const refused = `a place is over its budget on ${short(tip)} (above; the full table: ${log}); main is unchanged`;
      let over, lib;
      try {
        lib = await import(pathToFileURL(path.join(cand, 'game3d/tools/perf/place-budget-lib.mjs')).href + `?${tip}`);  // the tip's own rules, not a cached copy
        over = lib.overBudget(JSON.parse(fs.readFileSync(path.join(cand, 'game3d/tools/perf/place-budgets.json'), 'utf8')), JSON.parse(fs.readFileSync(json, 'utf8')).results);
      } catch { return { ok: false, message: refused }; }
      if (!over.length || over.some(o => o.error)) return { ok: false, message: refused };
      const overPlaces = [...new Set(over.map(o => o.place))];
      say(chain, `place budgets: ${overPlaces.join(', ')} over on ${short(tip)}; comparing with main ${short(base)}`);
      const baseline = await baselineFor(chain, overPlaces, base, impact);
      if (baseline.error) return { ok: false, message: `${refused}\ncould not measure main to compare with: ${baseline.error}` };
      const { worse, held } = judgeOverages(over, baseline.results);
      if (worse.length) return { ok: false, message: `this land makes a place worse than main, over its budget:\n${worse.map(o => '  ' + worseLine(o, lib.METRICS)).join('\n')}\n(the full table: ${log}); main is unchanged` };
      say(chain, '============================================================');
      for (const o of held) say(chain, heldWarning(o, lib.METRICS));
      say(chain, '============================================================');
      passed = measure.filter(p => !overPlaces.includes(p));  // over places are measured again next time, so the warning stays
    }
    say(chain, `place budgets passed in ${Math.round((Date.now() - started) / 1000)} s`);
    saveCache({ budget: { ...(cache().budget || {}), ...Object.fromEntries(passed.map(p => [p, tip])) } });
    return { ok: true };
  };
  // main's numbers for places over budget on the tip: { results: { tier: { place: result } } } or { error }. A place
  // reuses main's last measurement (cache.baseline: { place: { commit, results } }) while nothing since can move it.
  const baseTree = path.join(main, '.claude/worktrees/land-base');
  const baselineFor = async (chain, places, base, impact) => {
    const stored = cache().baseline || {};
    const onBase = new Set(impact.placesAt(base)), wanted = places.filter(p => onBase.has(p));
    const { measure, reused } = planPlaces(wanted, Object.fromEntries(Object.entries(stored).map(([p, b]) => [p, b.commit])), base, impact.impact);
    const results = {};
    const add = (place, byTier) => { for (const [tier, r] of Object.entries(byTier)) (results[tier] ||= {})[place] = r; };
    for (const place of Object.keys(reused)) add(place, stored[place].results);
    if (Object.keys(reused).length) say(chain, `place budgets: main's ${Object.keys(reused).join(', ')} reuse the measurement at ${Object.values(reused).map(short).join(', ')} (nothing since can move them)`);
    if (!measure.length) return { results };
    try { ensureTree(baseTree, base, 'land base'); } catch (error) { return { error: error.message }; }
    const setup = path.join(baseTree, 'tools/worktree.sh');
    if (fs.existsSync(setup)) run(setup, ['setup', baseTree], baseTree);
    const budgeter = path.join(baseTree, 'game3d/tools/perf/place-budget.mjs');
    if (!fs.existsSync(budgeter)) return { error: `main ${short(base)} has no place budget tool` };
    say(chain, `measuring ${measure.join(', ')} on main ${short(base)} to compare`);
    const log = `${logBase}.budget-base-${short(base)}`, json = `${log}.json`;
    fs.rmSync(json, { force: true });
    const code = await longRun('node', [budgeter, '--places', measure.join(','), '--json', json], baseTree, log);
    if (code === 75) return { error: `deferred (machine or GPU busy); log: ${log}` };
    let measured;
    try { measured = JSON.parse(fs.readFileSync(json, 'utf8')).results; } catch { return { error: `no numbers came out (log: ${log})` }; }
    const fresh = {};
    for (const place of measure) {
      const byTier = Object.fromEntries(Object.entries(measured).filter(([, r]) => r[place]).map(([tier, r]) => [tier, r[place]]));
      add(place, byTier);
      if (Object.values(byTier).length && Object.values(byTier).every(r => !r.error)) fresh[place] = { commit: base, results: byTier };
    }
    saveCache({ baseline: { ...(cache().baseline || {}), ...fresh } });
    return { results };
  };

  // ------------------------------------------------------------ main moves
  // 'landed', 'moved' (go round again) or a refusal message. A commit in the main checkout holds its index.lock
  // for its whole pre-commit (~15 s), so that is waited out.
  const fastForward = async (base, tip) => {
    for (let tries = 0; tries < 18; tries++) {
      if (rev('main') !== base) return 'moved';
      if (!mainWt) return git('update-ref', 'refs/heads/main', tip, base).code ? 'moved' : 'landed';
      const r = run('git', ['merge', '--ff-only', '--quiet', tip], mainWt);
      if (!r.code) return 'landed';
      if (/index\.lock/.test(r.err + r.out)) { await new Promise(done => setTimeout(done, 5000)); continue; }
      if (rev('main') !== base) return 'moved';
      return `main could not fast-forward in ${mainWt} (another agent's unsaved edits in the files this land changes?):\n${r.err || r.out}`;
    }
    return "the main checkout's index stayed locked for 90 s (a git command running there?); try again";
  };

  const afterLanding = async (chain, base, tip) => {
    for (const e of chain) {
      const count = Number(git('rev-list', '--count', `${e.parent}..${e.commit}`).out);
      say([e], count ? `main is now ${short(tip)} (${count} commit(s) from ${e.branch}${chain.length > 1 ? `, landed with ${chain.length - 1} other branch(es)` : ''})`
        : `${e.branch} has nothing that main doesn't have`);
    }
    // Main must be able to supply its next staged CPU snapshot without these worktrees: the landed locks' bytes
    // go into main, branch by branch, checked; conflicting main assets are never overwritten.
    const helper = tool('tools/check/landed-assets.mjs', path.join(main, 'tools/check/landed-assets.mjs'));
    for (const e of chain) {
      const r = run('node', [helper, mainWt || main, e.wt, e.parent, e.commit], main);
      if (r.out) say([e], r.out);
      if (r.code) {
        e.keepWt = true;
        finish(e, 1, [r.err, `REFUSED: main already holds ${short(e.commit)}, but its locked assets are not ready (details above).`,
          `Kept ${e.wt} and branch ${e.branch}. Conflicting main assets were not overwritten.`,
          'Resolve the listed missing or conflicting bytes, then verify with:',
          `node "${helper}" "${mainWt || main}" "${e.wt}" "${e.parent}" "${e.commit}"`, 'Land again only after that passes.']);
      }
    }
    if (git('diff', '--quiet', base, tip, '--', 'game3d/').code) {
      say(chain, 'game3d/ changed: the day test at both sizes should already have passed in the worktree (fast-qa skill)');
      const log = `${logBase}.boot-${short(tip)}`;
      const code = await longRun('node', [tool('tools/check/head-boot.mjs', path.join(main, 'tools/check/head-boot.mjs')), tip, '--record'], cand, log);
      say(chain, fs.readFileSync(log, 'utf8').trimEnd());
      if (code === 75) say(chain, `WARNING: the boot check was deferred (machine or GPU busy), so main ${short(tip)} is unchecked; run: node tools/check/head-boot.mjs ${short(tip)}`);
      else if (code) {
        const touched = chain.filter(e => git('diff', '--quiet', e.parent, e.commit, '--', 'game3d/').code);
        for (const e of touched) {
          e.keepWt = true;
          finish(e, 1, ['============================================================',
            `MAIN DOES NOT BOOT. ${touched.map(t => t.branch).join(', ')} landed as ${short(tip)} and the title screen fails (above).`,
            `main holds the whole land; fix it now in ${e.wt} (kept, with its branch) and land the fix.`,
            '============================================================']);
        }
      }
    }
    for (const e of chain) tidy(e);
  };

  // The worktree goes and the branch is deleted (--keep leaves both), unless it holds new asset files (git-ignored,
  // so not in the commit) or new commits made while it waited. A kept branch is moved to what landed.
  const tidy = e => {
    const moved = rev(`refs/heads/${e.branch}`) !== e.orig;
    const keepBranch = () => { if (!moved) run('git', ['reset', '--quiet', '--keep', e.commit], e.wt); };
    if (e.keepWt) { if (e.temp) e.temp = ''; keepBranch(); return; }
    if (moved) return finish(e, 0, [`kept ${e.wt} and ${e.branch}: it has commits made after it joined the land queue; land them next`]);
    if (e.keep && !e.temp) { keepBranch(); return finish(e, 0, [`kept ${e.wt} and ${e.branch} (--keep)`]); }
    let roots = [];
    try { roots = JSON.parse(fs.readFileSync(path.join(e.wt, 'tools/assets/sync.json'), 'utf8')).roots; } catch { /* none */ }
    // A copy of a file the landed lock holds at those bytes (tools/worktree.sh fetches some from R2) is in main now:
    // the asset handoff checked every locked file there.
    let locked = {};
    try { locked = JSON.parse(git('show', `${e.commit}:tools/assets/assets.lock.json`).out).files; } catch { /* no lock */ }
    const fresh = roots.length ? run('git', ['ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--', ...roots], e.wt).out
      .split('\0').filter(rel => rel && !rel.includes('__pycache__') && !fs.lstatSync(path.join(e.wt, rel)).isSymbolicLink())
      .filter(rel => locked[rel]?.sha256 !== sha256(path.join(e.wt, rel))) : [];
    if (fresh.length && !e.temp) {
      keepBranch();
      return finish(e, 0, [`kept ${e.wt}: it has git-ignored asset files that aren't links to the main checkout's, so removing it would lose them:`,
        ...fresh.map(rel => `  ${rel}`), `move or sync them, then: git worktree remove --force ${e.wt} && git branch -d ${e.branch}`]);
    }
    if (git('worktree', 'remove', '--force', e.wt).code) return finish(e, 1, [`REFUSED: landed, but could not remove ${e.wt}`]);
    e.temp = '';
    git('branch', '-D', e.branch);
    finish(e, 0, [`removed ${e.wt} and branch ${e.branch}`]);
  };

  // ------------------------------------------------------------ one group: build, check, fast-forward
  const attempt = async group => {
    for (let round = 1; round <= MOVES; round++) {
      const base = rev('main');
      const { chain, tip } = build(group.filter(e => !e.done), base);
      if (!chain.length) return { ok: true };
      if (tip === base) { await afterLanding(chain, base, tip); return { ok: true }; }
      say(chain, chain.length > 1 ? `checking ${chain.length} branches together on main ${short(base)}: ${chain.map(e => e.branch).join(', ')}`
        : `checking ${git('rev-list', '--count', `${base}..${tip}`).out} commit(s) on main ${short(base)}: ${git('log', '--format=%s', '-1', tip).out}`);
      prepareAssets(chain);
      for (const check of [checkCpu, checkBudget]) {
        const outcome = await check(chain, base, tip);
        if (!outcome.ok) {
          if (chain.length > 1) say(chain, `the ${chain.length} branches failed together; trying them in halves`);
          return outcome;
        }
      }
      const ff = await fastForward(base, tip);
      if (ff === 'landed') { await afterLanding(chain, base, tip); return { ok: true }; }
      if (ff !== 'moved') return { ok: false, message: ff };
      if (round < MOVES) say(chain, 'main moved during the checks; rebasing and checking again');
    }
    return { ok: false, final: true, message: `main moved during the checks ${MOVES} times; try again` };
  };

  const landBatch = async entries => {
    batch = entries;
    if (entries.length > 1) say(entries, `landing ${entries.length} queued branches as one batch: ${entries.map(e => e.branch).join(', ')}`);
    for (const e of entries) prepare(e);
    try { await landInHalves(entries, attempt, refuse); }
    finally {
      for (const e of entries) if (e.temp && !e.keepWt) git('worktree', 'remove', '--force', e.temp);
      batch = [];
    }
  };
  return { landBatch, stop };
}

function sha256(file) {
  const hash = crypto.createHash('sha256'), buffer = Buffer.alloc(1 << 20), fd = fs.openSync(file, 'r');
  try { for (let n; (n = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0;) hash.update(buffer.subarray(0, n)); }
  finally { fs.closeSync(fd); }
  return hash.digest('hex');
}
