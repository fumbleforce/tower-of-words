// Focused runtime QA after the evening discovery place hooks have landed.
// BASE=.claude/worktrees/<name>/game3d node game3d/tools/evening-check.mjs 390 844
// Default: desktop. One viewport per job; both jobs may share browser-job's GPU slots.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { openGame } from '../test/support/open-game.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';

const width = Number(process.argv[2] || 1366), height = Number(process.argv[3] || 860);
assert.ok(Number.isInteger(width) && width > 0 && Number.isInteger(height) && height > 0, 'Expected width height');
const base = new URL((process.env.BASE || 'game3d').replace(/\/$/, '') + '/', `http://127.0.0.1:${process.env.PORT || 8771}/`).href;
const out = process.env.OUT || `game3d/shots/evening/${Date.now()}-${process.pid}-${width}x${height}`;
fs.mkdirSync(out, { recursive: true });
const cases = [
  { place: 'forecourt', goal: 'Head home: walk east along the lane to the dorms.', actions: [
    { id: 'garden_bench', flag: 'evening_bench_seen', repeat: 'quiet', checkpoint: true, seated: true, lines: 1 },
    { id: 'fallen_bicycle', flag: 'evening_bike_tipped', secondFlag: 'evening_bikes_upright', physical: true, lines: 0,
      propNames: ['evening:bike-first', 'evening:bike-second'] },
  ] },
  { place: 'plaza', goal: 'Keep going east along the lane to the dorms.', actions: [
    { id: 'canteen_table', flag: 'evening_canteen_helped', physical: true, checkpoint: true, lines: 2,
      propNames: ['evening:chair-first', 'evening:chair-second'] },
  ] },
  { place: 'dorm_court', goal: 'Go in through the dorm entrance. Your room is 203.', actions: [
    { id: 'bath', flag: 'evening_bath_heard', caption: /Someone else finishes the song/, lines: 1 },
    { id: 'mailboxes', repeat: 'same', checkpoint: true, caption: /エリック.*erikku.*Eric/, lines: 1,
      propNames: ['evening:mailbox-flap', 'evening:mailbox-flyer'] },
  ] },
];
const selectedPlaces = process.env.PLACES?.split(',');
const selectedCases = selectedPlaces ? cases.filter(test => selectedPlaces.includes(test.place)) : cases;
assert.ok(selectedCases.length, 'No requested place matches');
const report = { viewport: { width, height }, base, artifacts: out, pass: false, cases: [],
  limits: ['Fixtures seed going_home and dorm_room_known; hall arrival is not exercised.',
    'Voice is muted; audio quality, leave/re-enter travel and skipping all discoveries remain integration checks.',
    'Screenshots require visual inspection; transform checks do not judge staging quality.'] };

function seed(test) {
  return { v: 1, day: 1, place: test.place, period: 'evening',
    flags: { place: test.place, period: 'evening', going_home: true, dorm_room_known: true },
    known: ['gaijin', 'ohayo', 'yoroshiku', 'sumimasen', 'matte', 'akete'],
    seen: [], found: [], taught: {}, met: [], inv: [], yen: 1000, bonds: {},
    ui: { goal: test.goal, sideGoal: '' }, runner: { onceDone: [], execution: null }, pendingStart: null };
}

async function installDriver(page, propNames) {
  await page.evaluate(async propNames => {
    const g = globalThis.__game;
    const { ui, setMuted } = await import(new URL('js/ui.js', globalThis.location.href));
    const state = globalThis.__evening = { sequence: 0, nodes: [] };
    const say = ui.say;
    ui.say = function (...args) { state.sequence++; state.shownAt = performance.now(); return say.apply(this, args); };
    const onNode = g.onNode;
    g.onNode = (node, phase) => { onNode?.(node, phase); if (phase === 'start') state.nodes.push(node); };
    setMuted(true); ui.auto = false;
    // Use the game's existing hurry control; all story and place effects run unchanged.
    state.timer = setInterval(() => { if (!ui._advance) g.setHurry(true); }, 30);
    state.read = async () => {
      const { flags } = await import(new URL('js/narrative/state.js', globalThis.location.href));
      const { known } = await import(new URL('js/lang.js', globalThis.location.href));
      const actors = new Set([g.player.root, ...Object.values(g.place.people).map(p => p.root)]);
      const transforms = {}, props = {};
      function visit(object, key, output) {
        if (actors.has(object)) return;
        output[key] = [object.visible, ...object.position.toArray(), ...object.rotation.toArray().slice(0, 3),
          ...object.scale.toArray()].map(v => typeof v === 'number' ? +v.toFixed(4) : v);
        object.children.forEach((child, i) => visit(child, `${key}/${i}:${child.name || child.type}`, output));
      }
      visit(g.place.space, 'world', transforms);
      for (const name of propNames) {
        const matches = g.place.scene.getObjectsByProperty('name', name);
        if (matches.length !== 1) { props[name] = { error: `Expected one named prop ${name}; found ${matches.length}` }; continue; }
        const object = matches[0], subtree = {};
        object.updateWorldMatrix(true, false);
        visit(object, name, subtree);
        props[name] = { subtree, worldMatrix: object.matrixWorld.toArray().map(v => +v.toFixed(4)) };
      }
      return { place: g.place.name, flags: { ...flags }, known: [...known].sort(), goal: ui.goalText, sideGoal: ui.sideText,
        seated: !!g.player.seated, seatOut: g.player.seatOut, position: g.player.root.position.toArray(),
        markers: Object.fromEntries(g.markers.list.map(m => [m.id, !!m.enabled()])),
        world: g.place.snapshotState?.(), transforms, props, recovery: g.runner.recoveryError,
        nodes: [...state.nodes], saved: JSON.parse(globalThis.localStorage.getItem('amakawa-day1-save')) };
    };
  }, propNames);
}

async function continueSave(page) {
  await page.locator('#title .mcont').click();
  await page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
  await page.waitForFunction(() => !globalThis.document.body.classList.contains('at-title') &&
    !globalThis.document.body.classList.contains('title-leaving'), null, { timeout: 30000 });
}
const read = page => page.evaluate(() => globalThis.__evening.read());
const compact = state => { const result = { ...state }; delete result.transforms; return result; };
function unchanged(before, after) {
  assert.equal(after.place, before.place, 'Optional discovery changed place');
  assert.equal(after.goal, before.goal, 'Optional discovery changed the route goal');
  assert.equal(after.sideGoal, before.sideGoal, 'Optional discovery changed the side goal');
  assert.deepEqual(after.known, before.known, 'Optional discovery taught an extra word');
  assert.ok(!after.recovery, after.recovery);
}
function changes(before, after) {
  return Object.keys(after.transforms).filter(key => JSON.stringify(before.transforms[key]) !== JSON.stringify(after.transforms[key]))
    .map(key => ({ key, before: before.transforms[key], after: after.transforms[key] }));
}
function requireProps(state, names = []) {
  for (const name of names) assert.ok(state.props[name]?.subtree, state.props[name]?.error || `Missing named prop ${name}`);
}
function persistedProps(before, after, names = []) {
  requireProps(before, names); requireProps(after, names);
  for (const name of names) {
    const actual = structuredClone(after.props[name]), expected = before.props[name];
    // The shared crowd separation can shift a held chair by a few centimetres when a walk replays.
    // Keep visibility, rotation, scale and every mesh exact; allow only that normal floor displacement.
    for (const [key, values] of Object.entries(actual.subtree)) {
      const old = expected.subtree[key];
      if (!old) continue;
      const distance = Math.hypot(...values.slice(1, 4).map((v, i) => v - old[i + 1]));
      assert.ok(distance <= 0.08, `Continue displaced ${name}/${key} by ${distance}`);
      values.splice(1, 3, ...old.slice(1, 4));
    }
    const distance = Math.hypot(...actual.worldMatrix.slice(12, 15).map((v, i) => v - expected.worldMatrix[i + 12]));
    assert.ok(distance <= 0.08, `Continue displaced ${name} by ${distance}`);
    actual.worldMatrix.splice(12, 3, ...expected.worldMatrix.slice(12, 15));
    assert.deepEqual(actual, expected, `Continue lost prop ${name}`);
  }
}
async function shot(page, result, name, target) {
  // The mailbox hook frames the elevated flap itself; its held-line shots are the inspection proof.
  const reframe = target && target !== 'mailboxes';
  if (reframe) await page.evaluate(id => {
    const g = globalThis.__game, thing = g.place.things[id];
    const point = thing.spot?.() || g.place.spots[id];
    if (point) { g.place.cam.closeOn(point, 1.8); g.place.cam.snap(g.player.root.position); }
  }, target);
  await page.mouse.move(1, height - 1); // keep a leftover hover menu clear of the proof frame
  // Let the actual camera and renderer present the frame before taking it.
  await page.evaluate(() => new Promise(resolve => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve))));
  const file = path.join(out, `${result.place}-${name}.png`);
  await page.screenshot({ path: file }); result.shots.push(file);
  if (reframe) await page.evaluate(() => globalThis.__game.place.cam.release());
}

async function settleOrLine(page, consumed = -1) {
  await page.waitForFunction(consumed => {
    const g = globalThis.__game, q = globalThis.__evening;
    return g.runner.recoveryError || (g.ui._advance && q.sequence !== consumed) ||
      (g.saveEnabled && !g.busy && !g.saying && !g.walker.path && !g.runner.frames.length &&
        !globalThis.document.body.classList.contains('at-title') && !globalThis.document.body.classList.contains('title-leaving'));
  }, consumed, { timeout: 20000 });
  return page.evaluate(() => ({ waiting: !!globalThis.__game.ui._advance, sequence: globalThis.__evening.sequence,
    text: globalThis.document.querySelector('#talk .line')?.textContent, recovery: globalThis.__game.runner.recoveryError }));
}

async function reload(page, result) {
  const before = await read(page);
  await waitForGame(page, 45000, () => page.reload(), 'title');
  assert.deepEqual(await page.evaluate(() => JSON.parse(globalThis.localStorage.getItem('amakawa-day1-save'))), before.saved,
    'Title overwrote the actual save');
  await installDriver(page, result.requiredProps); await continueSave(page);
  await settleOrLine(page);
  const after = await read(page);
  unchanged(before, after);
  result.reloads.push({ before: compact(before), after: compact(after) });
  return { before, after };
}

async function runAction(page, result, action, suffix = 'first') {
  const before = await read(page), receipt = { id: action.id, visit: suffix, lines: [] };
  result.actions.push(receipt);
  requireProps(before, action.propNames);
  await page.evaluate(id => {
    const g = globalThis.__game, marker = g.markers.list.find(m => m.id === id);
    if (!marker?.enabled()) throw new Error(`Missing or disabled interaction: ${id}`);
    g.use(marker);
  }, action.id);
  let consumed = -1, checkpoint = action.checkpoint && suffix === 'first';
  for (let lines = 0; lines < 8; lines++) {
    const state = await settleOrLine(page, consumed);
    assert.ok(!state.recovery, state.recovery);
    if (!state.waiting) break;
    await page.waitForFunction(() => performance.now() - globalThis.__evening.shownAt >= 300);
    receipt.lines.push(state.text);
    await shot(page, result, `${action.id}-${suffix}-line-${lines}`);
    if (checkpoint) {
      const saved = await page.evaluate(() => JSON.parse(globalThis.localStorage.getItem('amakawa-day1-save')));
      assert.ok(saved.runner?.execution, 'Readable line has no resumable checkpoint');
      const resumed = await reload(page, result);
      assert.equal(resumed.after.seated, resumed.before.seated, 'Continue lost the seated pose');
      // Replaying a walk stops within the walker's normal arrival radius; a seat is exact.
      const moved = Math.hypot(...resumed.after.position.map((v, i) => v - resumed.before.position[i]));
      assert.ok(moved <= (action.seated ? 1e-8 : 0.08), `Continue moved Eric during inspection by ${moved}`);
      if (action.seated) assert.deepEqual(resumed.after.seatOut, resumed.before.seatOut, 'Continue lost the seat exit');
      // Verify the actual flap and flyer changed before comparing their restored transforms.
      for (const name of action.propNames || []) assert.notDeepEqual(resumed.before.props[name], before.props[name],
        `Inspection did not change prop ${name}`);
      persistedProps(resumed.before, resumed.after, action.propNames);
      await shot(page, result, `${action.id}-checkpoint-restored`);
      checkpoint = false;
    }
    // Dialogue ignores input during its first 250 ms, including a freshly restored line.
    await page.waitForFunction(() => performance.now() - globalThis.__evening.shownAt >= 300);
    consumed = await page.evaluate(() => globalThis.__evening.sequence);
    await page.keyboard.press('Enter');
    if (lines === 7) throw new Error('Unexpectedly long discovery or dialogue did not advance');
  }
  const after = await read(page);
  unchanged(before, after);
  assert.equal(receipt.lines.length, suffix === 'repeat' && action.repeat === 'quiet' ? 0 : action.lines,
    'Unexpected number of readable lines');
  if (action.flag) assert.equal(after.flags[action.flag], true, `Missing completion flag ${action.flag}`);
  if (action.caption) assert.ok(receipt.lines.some(line => action.caption.test(line)), `Missing held caption for ${action.id}`);
  if (action.seated) assert.equal(after.seated, true, 'Bench action did not seat Eric');
  requireProps(after, action.propNames);
  receipt.physicalChanges = (action.propNames || []).filter(name => JSON.stringify(before.props[name]) !== JSON.stringify(after.props[name]));
  receipt.worldChanges = changes(before, after); // Diagnostic only: water, foliage and lights can move independently.
  if (action.physical) assert.ok(receipt.physicalChanges.length, `${action.id} changed no prop transforms`);
  receipt.after = compact(after);
  await shot(page, result, `${action.id}-${suffix}-complete`, action.id);
  return receipt;
}

async function runCase(browser, test) {
  const result = { place: test.place, pass: false, actions: [], reloads: [], shots: [], pageErrors: [],
    requiredProps: [...new Set(test.actions.flatMap(action => action.propNames || []))] };
  report.cases.push(result);
  let opened, closing = false;
  try {
    opened = await openGame(browser, { mode: 'title', viewport: { width, height }, touch: width < 700,
      url: `${base}index.html?q=1`, beforeNavigate: async (page, context) => {
        await context.route('**/*', scopedRoute({ publicOnly: true, isClosing: () => closing,
          onFailure: error => result.pageErrors.push(error) }));
        page.on('console', message => {
          if (message.type() === 'warning' && /unknown hook/i.test(message.text())) result.pageErrors.push(message.text());
        });
        await page.addInitScript(saved => {
          if (globalThis.sessionStorage.getItem('evening-seeded')) return;
          globalThis.localStorage.setItem('amakawa-day1-save', JSON.stringify(saved));
          globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ textSpeed: 'instant', voiceOn: false, autoAdvance: false }));
          globalThis.sessionStorage.setItem('evening-seeded', '1');
        }, seed(test));
      } });
    const { page } = opened;
    await installDriver(page, result.requiredProps); await continueSave(page);
    assert.equal((await settleOrLine(page)).waiting, false, 'Fixture unexpectedly started dialogue');
    const initial = await read(page);
    assert.equal(initial.place, test.place);
    result.initial = compact(initial);
    requireProps(initial, result.requiredProps);
    // Check the real marker predicate without running any morning interactions or changing world state.
    result.morningEnabled = await page.evaluate(async ids => {
      const { flags } = await import(new URL('js/narrative/state.js', globalThis.location.href));
      const evening = flags.going_home;
      try {
        flags.going_home = false;
        return ids.filter(id => globalThis.__game.markers.list.find(m => m.id === id)?.enabled());
      } finally { flags.going_home = evening; }
    }, test.actions.map(a => a.id));
    assert.deepEqual(result.morningEnabled, [], 'Evening actions enabled without going_home');
    for (const action of test.actions) {
      if (action.id === 'mailboxes') {
        // Crossing the hall is ordinary route progress; settle that goal before inspecting the box.
        await page.evaluate(() => {
          const g = globalThis.__game;
          g.use(g.markers.list.find(m => m.id === 'dorm_entry'));
        });
        await settleOrLine(page);
      }
      const first = await runAction(page, result, action);
      if (action.repeat) {
        const again = await runAction(page, result, { ...action, caption: null }, 'repeat');
        assert.deepEqual(again.lines, action.repeat === 'quiet' ? [] : first.lines, 'Repeat replayed or lost discovery text');
      } else if (action.secondFlag) {
        await runAction(page, result, { ...action, flag: action.secondFlag }, 'second');
      }
      if (!action.repeat) assert.equal((await read(page)).markers[action.id], false, 'Completed action remains enabled');
      if (action.seated) {
        await page.keyboard.press('ArrowDown', { delay: 120 });
        await page.waitForFunction(() => !globalThis.__game.player.seated);
        const stood = await read(page);
        assert.equal(stood.position[1], 0, 'Ordinary movement left Eric above the ground');
        assert.ok(!stood.seatOut, 'Ordinary movement did not clear seat exit');
        result.seatExit = compact(stood);
      }
    }
    const final = await read(page);
    const persisted = await reload(page, result);
    assert.deepEqual(persisted.after.flags, final.flags, 'Continue lost discovery flags');
    assert.deepEqual(persisted.after.markers, final.markers, 'Continue changed available actions');
    persistedProps(final, persisted.after, result.requiredProps);
    result.final = compact(persisted.after);
    await shot(page, result, 'continued');
    assert.deepEqual([...opened.errors, ...result.pageErrors], [], 'Browser errors');
    result.pass = true;
  } catch (error) {
    result.error = error.stack || error.message;
    if (opened) {
      result.failure = await read(opened.page).then(compact).catch(() => null);
      await shot(opened.page, result, 'failure').catch(() => {});
    }
  } finally {
    if (opened) {
      result.pageErrors.push(...opened.errors);
      await opened.page.evaluate(() => clearInterval(globalThis.__evening?.timer)).catch(() => {});
      closing = true; await opened.close();
    }
    console.log(`${result.pass ? 'PASS' : 'FAIL'} ${test.place} ${width}x${height}${result.error ? ': ' + result.error.split('\n')[0] : ''}`);
  }
}

try {
  await withBrowserJob('evening-check', async browser => {
    for (const test of selectedCases) await runCase(browser, test);
  }, { timeoutMs: 285000 });
  report.pass = report.cases.length === selectedCases.length && report.cases.every(c => c.pass);
} catch (error) { report.error = error.stack || error.message; }
finally {
  const file = path.join(out, 'result.json');
  fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ pass: report.pass, result: file, artifacts: out, error: report.error }));
  process.exitCode = report.pass ? 0 : 1;
}
