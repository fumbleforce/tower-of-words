import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { openGame } from '../test/support/open-game.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
// Actual keyboard input through the production learning hook, including protagonist-specific audio.
// BASE=.claude/worktrees/<name>/game3d selects an isolated checkout served from the repository root.
const results = [],
  output = new URL(`../shots/typed-word-audio/${Date.now()}/`, import.meta.url);
fs.mkdirSync(output, { recursive: true });
const base = `http://127.0.0.1:${process.env.PORT || 8771}/${process.env.BASE || 'game3d'}`;
await withBrowserJob(
  'day3-typed-word-audio',
  async (browser) => {
    for (const [width, height, mc] of [
      [1366, 860, 'eric'],
      [390, 844, 'carina'],
    ]) {
      const blocked = [];
      let closing = false;
      const saved = {
        v: 1,
        day: 2,
        period: 'afternoon',
        place: 'dorms',
        mc,
        known: ['ohayo'],
        met: ['mio'],
        yen: 4000,
        flags: { day: 2, period: 'afternoon', place: 'dorms', d2_started: true, d2_brief_done: true },
        world: { inside: true },
        inv: [],
        found: [],
        seen: [],
        taught: {},
        bonds: {},
        ui: { goal: '' },
      };
      const opened = await openGame(browser, {
        mode: 'title',
        viewport: { width, height },
        touch: width < 700,
        url: `${base}/index.html?q=0`,
        beforeNavigate: async (page, context) => {
          await context.route('**/*', scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (s) => blocked.push(s) }));
          await page.addInitScript((saved) => {
            globalThis.localStorage.setItem('amakawa-day1-save', JSON.stringify(saved));
            globalThis.localStorage.setItem(
              'amakawa-settings',
              JSON.stringify({ v: 2, textSpeed: 'instant', voiceOn: true, privateMode: false }),
            );
            globalThis.localStorage.setItem(
              'amakawa-onboard',
              JSON.stringify({ moved: true, talked: true, uses: 1, sayUsed: true }),
            );
            globalThis.__actualAudio = [];
            const play = globalThis.HTMLMediaElement.prototype.play;
            globalThis.HTMLMediaElement.prototype.play = function (...args) {
              const src = this.currentSrc || this.src;
              if (/(?:eric|carina)-(?:yoyaku|oyogu|gamen)/.test(src))
                for (const event of ['playing', 'ended', 'error'])
                  this.addEventListener(event, () => globalThis.__actualAudio.push({ src, event }), { once: true });
              return play.apply(this, args);
            };
          }, saved);
        },
      });
      try {
        const { page } = opened;
        await page.locator('#title .mcont').click();
        await page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
        await opened.waitForSettled();
        for (const word of ['yoyaku', 'oyogu', 'gamen']) {
          // Invoke the production typing hook, then supply real keyboard input; no audio resolver or learning flag substitution.
          await page.evaluate((word) => {
            const g = globalThis.__game;
            g.beat(() => g.hooks.type({ word, prompt: `Try this word: ${word}.` }));
          }, word);
          await page.locator('.tp-in').fill(word);
          await opened.waitForSettled();
          await page.waitForFunction(
            (key) => globalThis.__actualAudio.some((e) => e.event === 'ended' && e.src.includes(key)),
            `${mc}-${word}`,
          );
        }
        const audio = await page.evaluate(() => globalThis.__actualAudio);
        for (const word of ['yoyaku', 'oyogu', 'gamen']) {
          assert(audio.some((e) => e.src.includes(`${mc}-${word}`) && e.event === 'playing'));
          assert(audio.some((e) => e.src.includes(`${mc}-${word}`) && e.event === 'ended'));
        }
        assert(!audio.some((e) => e.event === 'error'));
        assert.deepEqual(opened.errors, []);
        assert.deepEqual(blocked, []);
        await page.screenshot({ path: new URL(`${width}-typed.png`, output).pathname });
        results.push({ width, mc, audio, pass: true });
        fs.writeFileSync(new URL('result.json', output), JSON.stringify(results, null, 2));
      } finally {
        closing = true;
        await opened.close();
      }
    }
  },
  { timeoutMs: 120000 },
);
console.log('PASS actual typed-word playback', JSON.stringify(results));
console.log('artifacts:', output.pathname);
