// Focused check of the train passengers' discovery hooks (train/discoveries.js) and English subtitles for spoken
// Japanese (runner `en`), before and after the story uses them. Each encounter runs as a small test scene through the
// real marker tap (Eric walks up), with the steps the draft stages (reviews/train-discoveries-1/draft-notes.md), and
// takes a still at every line: the held view (video, reminder, pages) must be up where it belongs, subtitled
// lines must show their English with the "in Japanese" tag, and the props must end where they should (bag shut,
// phones away, headphone back on). STORY=1 also checks first-seat routes, quiet repeats, and a real saved Continue at a held view.
//   node game3d/tools/train-finds-check.mjs [outdir]      SIZES=1366x860,390x844  BASE=<worktree>/game3d  MUTE=1
// PERF_ONLY=1 only counts the draw calls (also against a build without the hooks, for comparison).
// ONLY=bun,reader runs some. STORY=1 uses the story's own talk triggers instead of the test scenes (after
// integration). Each viewport has its own 290-second browser deadline.
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || `game3d/shots/train-finds/${Date.now()}`;
fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'game3d';
const sizes = (process.env.SIZES || '1366x860,390x844').split(',').map((s) => s.split('x').map(Number));
const only = process.env.ONLY?.split(',');
const fails = [],
  errors = [],
  notes = [];

const cam = (who) => ({ do: 'cam', on: who, zoom: 1.7 });
const SCENES = {
  bun: [
    cam('bun'),
    { do: 'shopBag', state: 'ask' },
    { do: 'shopBag', state: 'close' },
    { say: 'bun', text: 'ありがとう。', en: 'Thank you.' },
    { do: 'cam', back: true },
  ],
  music: [
    cam('music'),
    { do: 'headphones', who: 'music', state: 'lift' },
    { say: 'music', text: 'あ、ごめん。音、漏れてた？', en: 'Oh, sorry. Could you hear that?' },
    { do: 'gesture', who: 'eric', kind: 'nod' },
    { do: 'phone', who: 'music', state: 'show' },
    { say: 'music', text: '自分で録ったの。まだ下手だけど。', en: "I recorded it myself. I’m still pretty bad, though." },
    { do: 'phone', who: 'music', state: 'away' },
    { do: 'headphones', who: 'music', state: 'on' },
    { do: 'cam', back: true },
  ],
  reader: [
    cam('reader'),
    '> The book is called "Excel for People Who Hate Excel".',
    { do: 'printout', state: 'show' },
    { say: 'reader', text: '会社のは古くて、同じボタンがないんだよ。', en: "The version at work is old. It doesn’t have the same buttons." },
    'eric: Windows 95?',
    { do: 'gesture', who: 'reader', kind: 'nod', to: 'eric' },
    { do: 'printout', state: 'away' },
    { do: 'cam', back: true },
  ],
  kuroda: [
    cam('kuroda'),
    { do: 'phone', who: 'kuroda', state: 'buzz' },
    { say: 'kuroda', text: 'すみません……あと五分。', en: 'Sorry... five more minutes.' },
    { do: 'phone', who: 'kuroda', state: 'tap' },
    { do: 'cam', back: true },
  ],
};
// what the held view must show while each line is up (null: nothing)
const HELD = {
  bun: [null],
  music: [null, 'music'],
  reader: [null, 'reader', 'reader'],
  kuroda: ['kuroda'],
};
const ids = Object.keys(SCENES).filter((id) => !only || only.includes(id));

const story = process.env.STORY === '1';
const firstPassengers = new Set(['bun', 'music']);
const seenFlag = (id) => `train_${id === 'kuroda' ? 'hamada' : id}_seen`;
const expectedLines = (id) => SCENES[id].flatMap((step) => {
  if (typeof step === 'string') return [{ text: step.replace(/^(>\s*|\w+: )/, ''), sub: false }];
  return step.say ? [{ text: step.en || step.text, sub: !!step.en }] : [];
});

async function prepare(page) {
  await page.evaluate(async ({ scenes, story, mute }) => {
    const g = globalThis.__game;
    const { setSetting } = await import(new URL('js/settings.js', globalThis.location.href));
    setSetting('textSpeed', 'instant');
    setSetting('autoAdvance', false);
    if (mute) (await import(new URL('js/ui.js', globalThis.location.href))).setMuted(true);
    g.walker.speed = 8;
    if (!story) for (const [id, steps] of Object.entries(scenes)) {
      g.runner.story.nodes['test_' + id] = steps;
      g.runner.story.on['talk:' + id] = 'test_' + id;
    }
    // Observe the real hooks without replacing their behavior.
    globalThis.__findChecks = { gestures: [], goals: [], emotes: [], lines: 0 };
    for (const [hook, list] of [['gesture', 'gestures'], ['goal', 'goals'], ['emote', 'emotes']]) {
      const original = g.hooks[hook];
      g.hooks[hook] = function (step) {
        globalThis.__findChecks[list].push({ ...step });
        return original.apply(this, arguments);
      };
    }
    const say = g.ui.say;
    g.ui.say = function () {
      globalThis.__findChecks.lines++;
      return say.apply(this, arguments);
    };
  }, { scenes: SCENES, story, mute: !!process.env.MUTE });
}

async function readLine(page) {
  return page.evaluate(() => {
    const held = globalThis.document.getElementById('held');
    return {
      text: globalThis.document.querySelector('#talk .line')?.textContent,
      sub: !!globalThis.document.querySelector('#talk .subtag'),
      held: held && !held.hidden && !held.classList.contains('out') ? held.dataset.id : null,
    };
  });
}

async function usePassenger(page, id) {
  await page.evaluate((id) => {
    const g = globalThis.__game;
    const m = g.markers.list.find((x) => x.id === id);
    if (!m?.enabled()) throw new Error('no marker ' + id);
    g.use(m);
  }, id);
}

async function waitForBeat(page) {
  return page.waitForFunction(() => {
    const g = globalThis.__game;
    if (g.ui._advance) return 'line';
    if (!g.busy && !g.walker.path && !g.runner.frames.length) return 'done';
    return false;
  }, null, { timeout: 20000 }).then((h) => h.jsonValue());
}

async function continueHeld(page, tag, id, line, lineIndex) {
  const saved = await page.evaluate(async () => {
    const { save, loadSave } = await import(new URL('js/sim.js', globalThis.location.href));
    // A learned-word fixture makes preservation meaningful even before Mio's lesson.
    const { known } = await import(new URL('js/lang.js', globalThis.location.href));
    known.add('ohayo');
    save(globalThis.__game);
    return loadSave();
  });
  if (!saved?.runner?.execution || !saved.world?.finds) throw new Error('held save has no execution/world checkpoint');
  const titleUrl = new URL(page.url());
  titleUrl.searchParams.delete('skip');
  await page.goto(titleUrl.href, { timeout: 60000 });
  await page.locator('#title .mcont').waitFor({ state: 'visible', timeout: 60000 });
  await prepare(page);
  await page.locator('#title .mcont').click();
  await page.locator('#saves .slot').filter({ hasText: 'Autosave' }).click();
  await page.waitForFunction(() => globalThis.__game.ui._advance && !globalThis.document.body.classList.contains('title-leaving'), null, { timeout: 30000 });
  // Continue replays the active node from its saved staging. Check and advance only the
  // preceding lines, then leave the saved line waiting for the encounter loop's one tap.
  const replay = expectedLines(id);
  for (let i = 0; i <= lineIndex; i++) {
    if (await waitForBeat(page) !== 'line') throw new Error(`Continue ${id} ended before saved line ${lineIndex}`);
    await page.waitForTimeout(300);
    const actual = await readLine(page);
    const expected = { ...replay[i], held: HELD[id][i] ?? null };
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      throw new Error(`Continue ${id} replay line ${i}: ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (i < lineIndex) await page.evaluate(() => globalThis.__game.ui._advance?.());
  }
  const resumed = await readLine(page);
  const state = await page.evaluate(async () => {
    const { flags } = await import(new URL('js/narrative/state.js', globalThis.location.href));
    const { known } = await import(new URL('js/lang.js', globalThis.location.href));
    const g = globalThis.__game;
    return { flags: { ...flags }, known: [...known], goal: g.ui.goalText, finds: g.place.snapshotState().finds, recovery: g.runner.recoveryError };
  });
  if (JSON.stringify(resumed) !== JSON.stringify(line)) fails.push(`FAIL ${tag} Continue ${id}: resumed ${JSON.stringify(resumed)}, expected ${JSON.stringify(line)}`);
  if (state.recovery || state.goal !== saved.ui.goal || JSON.stringify(state.known.sort()) !== JSON.stringify(saved.known.sort()))
    fails.push(`FAIL ${tag} Continue: recovery, goal or learned words changed`);
  for (const key of ['seat_goal', ...Object.keys(SCENES).map(seenFlag)]) {
    if (state.flags[key] !== saved.flags[key]) fails.push(`FAIL ${tag} Continue: flag ${key} changed`);
  }
  for (const key of ['bag', 'music', 'cup', 'kuroda', 'printout']) {
    if (state.finds[key] !== saved.world.finds[key]) fails.push(`FAIL ${tag} Continue: prop ${key} changed`);
  }
  await page.screenshot({ path: path.join(out, `${id}-${tag}-continued.png`) });
  notes.push(`${tag}: saved Continue replayed ${lineIndex} earlier ${id} lines; checked saved subtitle, held view, props, flags, learned words and goal`);
}

for (const [W, H] of sizes) await withBrowserJob('train-finds-check', async (browser) => {
  const tag = `${W}x${H}`;
  const context = await browser.newContext({ viewport: { width: W, height: H }, isMobile: W < 700, hasTouch: W < 700 });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`${tag}: ${m.text()}`);
  });
  try {
    await page.goto(`http://127.0.0.1:8771/${base}/index.html?q=1&place=train&skip`, { timeout: 60000 });
    await page.waitForFunction(() => globalThis.__done, null, { timeout: 60000 });
    await page.keyboard.press('Shift');
    await waitForBeat(page);
    const calls = await page.evaluate(async () => {
      const info = globalThis.__game.renderer.info;
      const frame = () => new Promise((r) => globalThis.requestAnimationFrame(r));
      globalThis.__perfHold = true;
      await frame();
      info.autoReset = false;
      info.reset();
      await frame();
      const calls = info.render.calls;
      info.autoReset = true;
      globalThis.__perfHold = false;
      return calls;
    });
    notes.push(`${tag}: draw calls a frame at the start ${calls}`);
    if (process.env.PERF_ONLY) return;
    await prepare(page);
    // Prefer the reader so Continue also preserves the preceding passenger's seat goal.
    const continueId = ids.includes('reader') ? 'reader' : ids.find((id) => HELD[id].some(Boolean));
    let continued = false;
    for (const id of ids) {
      if (story && firstPassengers.has(id)) await page.evaluate(async () => {
        const { flags } = await import(new URL('js/narrative/state.js', globalThis.location.href));
        delete flags.seat_goal;
        flags.passengers = 0;
        globalThis.__game.ui.goal('');
        globalThis.__findChecks.gestures.length = 0;
        globalThis.__findChecks.goals.length = 0;
      });
      const lines = [];
      await usePassenger(page, id);
      for (let n = 0; n < 12; n++) {
        if (await waitForBeat(page) === 'done') break;
        // The dialogue's input guard lasts 250 ms; instant text avoids a reveal-only first tap.
        await page.waitForTimeout(300);
        const seen = await readLine(page);
        lines.push(seen);
        await page.screenshot({ path: path.join(out, `${id}-${tag}-${n}.png`) });
        if (story && !continued && id === continueId && seen.held) {
          await continueHeld(page, tag, id, seen, n);
          continued = true;
        }
        await page.evaluate(() => globalThis.__game.ui._advance?.());
      }
      const expected = expectedLines(id);
      if (lines.length !== expected.length) fails.push(`FAIL ${tag} ${id}: ${lines.length} lines, expected ${expected.length}`);
      lines.forEach((line, i) => {
        const want = expected[i];
        if (!want || line.text !== want.text || line.sub !== want.sub || line.held !== (HELD[id][i] ?? null))
          fails.push(`FAIL ${tag} ${id} line ${i}: ${JSON.stringify(line)}, expected ${JSON.stringify({ ...want, held: HELD[id][i] ?? null })}`);
      });
      if (await waitForBeat(page) !== 'done') throw new Error(`${id} did not finish`);
      const after = await page.evaluate(async () => {
        const { flags } = await import(new URL('js/narrative/state.js', globalThis.location.href));
        const g = globalThis.__game, held = globalThis.document.getElementById('held');
        return { ...g.place.snapshotState().finds, heldUp: held && !held.hidden && !held.classList.contains('out'), flags: { ...flags }, goal: g.ui.goalText, checks: globalThis.__findChecks };
      });
      if (after.heldUp) fails.push(`FAIL ${tag} ${id}: held view stayed up after scene`);
      if (id === 'bun' && after.bag !== 1) fails.push(`FAIL ${tag} bun: bag is not shut`);
      if (id === 'music' && (after.music !== 'lap' || after.cup !== 'on')) fails.push(`FAIL ${tag} music: ${after.music} ${after.cup}`);
      if (id === 'kuroda' && after.kuroda !== 'off') fails.push(`FAIL ${tag} kuroda: phone ${after.kuroda}`);
      if (id === 'reader' && after.printout !== 'away') fails.push(`FAIL ${tag} reader: printout ${after.printout}`);
      if (story) {
        if (!after.flags[seenFlag(id)]) fails.push(`FAIL ${tag} ${id}: missing ${seenFlag(id)}`);
        if (firstPassengers.has(id)) {
          const directed = after.checks.gestures.some((s) => s.who === id && s.kind === 'point' && s.to === 'seat_far_r');
          const goal = after.checks.goals.some((s) => s.at === 'seat_far_r' && s.text === 'Sit by the lunchbox.');
          if (!after.flags.seat_goal || after.flags.passengers !== 1 || after.goal !== 'Sit by the lunchbox.' || !directed || !goal)
            fails.push(`FAIL ${tag} first_${id}: missing directed seat point/goal or nod_seat ran incorrectly`);
        }
        const beforeRepeat = await page.evaluate(() => ({ lines: globalThis.__findChecks.lines, voices: globalThis.__voiceLog.plays, emotes: globalThis.__findChecks.emotes.length, gestures: globalThis.__findChecks.gestures.length }));
        await usePassenger(page, id);
        if (await waitForBeat(page) !== 'done') throw new Error(`${id} repeated a dialogue line`);
        const repeat = await page.evaluate(() => ({ lines: globalThis.__findChecks.lines, voices: globalThis.__voiceLog.plays, emotes: globalThis.__findChecks.emotes, gestures: globalThis.__findChecks.gestures }));
        const quietResponse = repeat.emotes.slice(beforeRepeat.emotes).some((s) => s.who === id);
        if (repeat.lines !== beforeRepeat.lines || repeat.voices !== beforeRepeat.voices || !quietResponse)
          fails.push(`FAIL ${tag} ${id}: repeat must respond quietly without new dialogue or voice`);
      }
      notes.push(`${tag} ${id}: ${lines.length} lines checked${story ? '; first visit and quiet repeat' : ''}`);
    }
    if (story && continueId && !continued) fails.push(`FAIL ${tag}: never reached a held view for Continue`);
  } catch (error) {
    fails.push(`FAIL ${tag}: ${error.message}`);
  } finally {
    await context.close();
  }
}, { timeoutMs: 290000 });
console.log(notes.join('\n'));
if (errors.length) console.log('page errors:\n' + errors.join('\n'));
console.log(fails.length ? fails.join('\n') : errors.length ? 'FAIL: page errors' : `PASS: stills in ${out}`);
process.exit(fails.length || errors.length ? 1 : 0);
