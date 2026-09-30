// Focused check of the train passengers' discovery hooks (train/discoveries.js) and English subtitles for spoken
// Japanese (runner `en`), before and after the story uses them. Each encounter runs as a small test scene through the
// real marker tap (Eric walks up), with the steps the draft stages (reviews/train-discoveries-1/draft-notes.md), and
// takes a still at every line: the held view (photo, video, reminder, pages) must be up where it belongs, subtitled
// lines must show their English with the "in Japanese" tag, and the props must end where they should (bag shut,
// phones away, headphone back on). Then a snapshot/restore round trip, and the draw calls at rest.
//   node game3d/tools/train-finds-check.mjs [outdir]      SIZES=1366x860,390x844  BASE=<worktree>/game3d  MUTE=1
// PERF_ONLY=1 only counts the draw calls (also against a build without the hooks, for comparison).
// ONLY=bun,youth runs some. STORY=1 uses the story's own talk triggers instead of the test scenes (after
// integration).
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
  youth: [
    cam('youth'),
    { do: 'phone', who: 'youth', state: 'show' },
    { say: 'youth', text: '負けたけど、初めてゴール決めたんだ。', en: 'We lost, but I scored my first goal.' },
    { do: 'gesture', who: 'eric', kind: 'point', to: 'youth' },
    "eric: That's you?",
    { do: 'phone', who: 'youth', state: 'point' },
    { do: 'gesture', who: 'youth', kind: 'nod', to: 'eric' },
    { do: 'phone', who: 'youth', state: 'away' },
    { do: 'cam', back: true },
  ],
  music: [
    cam('music'),
    { do: 'headphones', who: 'music', state: 'lift' },
    { say: 'music', text: 'あ、ごめん。音、漏れてた？', en: 'Oh, sorry. Could you hear that?' },
    'eric: Only a little.',
    { do: 'phone', who: 'music', state: 'show' },
    { say: 'music', text: '自分で録ったの。まだ下手だけど。', en: "I recorded it myself. I'm still pretty bad, though." },
    { do: 'phone', who: 'music', state: 'away' },
    { do: 'headphones', who: 'music', state: 'on' },
    { do: 'cam', back: true },
  ],
  reader: [
    cam('reader'),
    '> The book is called "Excel for People Who Hate Excel".',
    { do: 'printout', state: 'show' },
    { say: 'reader', text: '会社のは古くて、同じボタンがないんだよ。', en: "The version at work is old. It doesn't have the same buttons." },
    'eric: Windows 95?',
    { say: 'reader', text: 'うん。会社の。', en: "Yes, that's the one at work." },
    { do: 'printout', state: 'away' },
    { do: 'cam', back: true },
  ],
  kuroda: [
    cam('kuroda'),
    '> A sticky note on his briefcase says "12F 9:00!!"',
    { do: 'phone', who: 'kuroda', state: 'buzz' },
    { do: 'phone', who: 'kuroda', state: 'tap' },
    { say: 'kuroda', text: 'すみません……あと五分。', en: 'Sorry... five more minutes.' },
    { do: 'cam', back: true },
  ],
};
// what the held view must show while each line is up (null: nothing)
const HELD = {
  bun: [null],
  youth: ['youth', 'youth'],
  music: [null, null, 'music'],
  reader: [null, 'reader', 'reader', 'reader'],
  kuroda: [null, null],
};
const ids = Object.keys(SCENES).filter((id) => !only || only.includes(id));

await withBrowserJob(
  'train-finds-check',
  async (browser) => {
    for (const [W, H] of sizes) {
      const phone = W < 700,
        tag = `${W}x${H}`;
      const context = await browser.newContext({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone });
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`${tag}: ${m.text()}`);
      });
      await page.addInitScript(() => {
        globalThis.__starts = [];
        const start = globalThis.AudioBufferSourceNode.prototype.start;
        globalThis.AudioBufferSourceNode.prototype.start = function (when, offset) {
          globalThis.__starts.push({ d: +(this.buffer?.duration || 0).toFixed(2), offset: offset || 0 });
          return start.apply(this, arguments);
        };
      });
      await page.goto(`http://127.0.0.1:8771/${base}/index.html?q=1&place=train&skip`, { timeout: 60000 });
      await page.waitForFunction(() => globalThis.__done, null, { timeout: 120000 });
      // a key unlocks audio as the player's first input does
      await page.keyboard.press('Shift');
      await page.waitForFunction(() => !globalThis.__game.busy && !globalThis.__game.walker.path, null, { timeout: 60000 });
      // one whole frame's draw calls (every pass), counted the way perf/metrics.js does
      const calls = await page.evaluate(async () => {
        const info = globalThis.__game.renderer.info,
          frame = () => new Promise((r) => globalThis.requestAnimationFrame(r));
        globalThis.__perfHold = true;
        await frame();
        info.autoReset = false;
        info.reset();
        await frame();
        const c = info.render.calls;
        info.autoReset = true;
        globalThis.__perfHold = false;
        return c;
      });
      notes.push(`${tag}: draw calls a frame at the start ${calls}`);
      if (process.env.PERF_ONLY) {
        await context.close();
        continue;
      }
      await page.evaluate(
        async ({ scenes, story, mute }) => {
          const g = globalThis.__game;
          if (mute) (await import(new URL("js/ui.js", globalThis.location.href))).setMuted(true);
          if (!story)
            for (const [id, steps] of Object.entries(scenes)) {
              g.runner.story.nodes['test_' + id] = steps;
              g.runner.story.on['talk:' + id] = 'test_' + id;
            }
        },
        { scenes: SCENES, story: !!process.env.STORY, mute: !!process.env.MUTE },
      );
      for (const id of ids) {
        const lines = [];
        await page.evaluate((id) => {
          const g = globalThis.__game;
          const m = g.markers.list.find((x) => x.id === id);
          if (!m?.enabled()) throw new Error('no marker ' + id);
          g.use(m);
        }, id);
        // between the lines too: stills every 0.6 s while nothing waits on a tap (the bag closing, the phone buzzing)
        let motion = 0;
        const film = setInterval(async () => {
          if (motion >= 16) return;
          const waiting = await page.evaluate(() => !!globalThis.__game.ui._advance).catch(() => true);
          if (waiting) return;
          const k = motion++;
          await page.screenshot({ path: path.join(out, `${id}-${tag}-m${k}.png`) }).catch(() => {});
        }, 600);
        for (let n = 0; n < 12; n++) {
          const st = await page
            .waitForFunction(
              () => {
                const g = globalThis.__game;
                if (g.ui._advance) return 'line';
                if (!g.busy && !g.walker.path && !g.runner.frames.length) return 'done';
                return false;
              },
              null,
              { timeout: 30000 },
            )
            .then((h) => h.jsonValue())
            .catch(() => 'stuck');
          if (st !== 'line') {
            if (st === 'stuck') fails.push(`FAIL ${tag} ${id}: stuck`);
            break;
          }
          await page.waitForTimeout(phone ? 700 : 600);
          const seen = await page.evaluate(() => {
            const held = globalThis.document.getElementById('held');
            return {
              text: globalThis.document.querySelector('#talk .line')?.textContent,
              sub: !!globalThis.document.querySelector('#talk .subtag'),
              held: held && !held.hidden && !held.classList.contains('out') ? held.dataset.id : null,
            };
          });
          lines.push(seen);
          await page.screenshot({ path: path.join(out, `${id}-${tag}-${n}.png`) });
          await page.evaluate(() => globalThis.__game.ui._advance?.());
        }
        clearInterval(film);
        const want = HELD[id];
        lines.forEach((l, i) => {
          if (!process.env.STORY && want && (want[i] ?? null) !== l.held)
            fails.push(`FAIL ${tag} ${id}: line ${i} "${l.text}" held view ${l.held}, expected ${want[i] ?? null}`);
          if (/[ぁ-んァ-ン一-龯]/.test(l.text || '') && l.sub) fails.push(`FAIL ${tag} ${id}: subtitle shows Japanese: ${l.text}`);
        });
        const subs = lines.filter((l) => l.sub).map((l) => l.text);
        notes.push(`${tag} ${id}: ${lines.length} lines; subtitled: ${JSON.stringify(subs)}`);
        await page.waitForTimeout(400);
        const after = await page.evaluate(() => {
          const g = globalThis.__game,
            f = g.place.snapshotState().finds,
            held = globalThis.document.getElementById('held');
          return { ...f, heldUp: held && !held.hidden && !held.classList.contains('out') };
        });
        if (after.heldUp) fails.push(`FAIL ${tag} ${id}: the held view stayed up after the scene`);
        if (id === 'bun' && after.bag !== 1) fails.push(`FAIL ${tag} bun: the bag isn't shut (${after.bag})`);
        if (id === 'youth' && after.youth !== 'away') fails.push(`FAIL ${tag} youth: phone ${after.youth}`);
        if (id === 'music' && (after.music !== 'lap' || after.cup !== 'on')) fails.push(`FAIL ${tag} music: ${after.music} ${after.cup}`);
        if (id === 'kuroda' && after.kuroda !== 'off') fails.push(`FAIL ${tag} kuroda: phone ${after.kuroda}`);
        if (id === 'reader' && after.printout !== 'away') fails.push(`FAIL ${tag} reader: printout ${after.printout}`);
      }
      const sounds = await page.evaluate(() => globalThis.__starts.map((s) => s.d));
      notes.push(`${tag}: buffers started (s): ${JSON.stringify(sounds)}`);
      // Continue: a snapshot taken mid-way (bag half shut, youth's phone out) comes back exactly
      const rt = await page.evaluate(async () => {
        const g = globalThis.__game,
          P = g.place,
          before = JSON.stringify(P.snapshotState().finds);
        await P.hooks.phone({ who: 'youth', state: 'show' });
        const mid = P.snapshotState();
        await P.hooks.phone({ who: 'youth', state: 'away' });
        P.restoreState({ flags: {}, world: mid, runner: { execution: true } });
        const back = JSON.stringify(P.snapshotState().finds) === JSON.stringify(mid.finds);
        P.restoreState({ flags: {}, world: { ...mid, finds: JSON.parse(before) }, runner: { execution: true } });
        return { back, clean: JSON.stringify(P.snapshotState().finds) === before };
      });
      if (!rt.back || !rt.clean) fails.push(`FAIL ${tag}: snapshot/restore round trip ${JSON.stringify(rt)}`);
      await context.close();
    }
  },
  { timeoutMs: 290000 },
);
console.log(notes.join('\n'));
if (errors.length) console.log('page errors:\n' + errors.join('\n'));
console.log(fails.length ? fails.join('\n') : `PASS: stills in ${out}`);
process.exit(fails.length || errors.length ? 1 : 0);
