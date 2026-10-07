import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

// Issue #234 (Codex X-0538 on 6349e7ea): Skip moved seen lines on with a plain 70 ms timer, so with the pause menu
// open the conversation carried on behind it. The real dialogue.js, vn-controls.js and dialogue-text.js; the DOM,
// audio, words, portraits and backlog are stubs (every line counts as seen).
const STUBS = {
  '/js/audio/core.js': `export let paused = false; export let muted = false;
    export function pauseAudio(on) { paused = !!on; }
    export function voice() { return null; } export function stopVoice() {}`,
  '/js/lang.js': `export const WORDS = {}; export const known = () => false; export const nameAt = () => null;
    export const lineHTML = (t) => t;`,
  '/js/settings.js': `export const settings = { skipUnread: false, textSpeed: 'normal', autoSpeed: 'normal' };
    export const CPS = {}; export const AUTO_WAIT = { normal: [500, 30] };`,
  '/js/ui/portraits.js': 'export function showPortraits() {} export function resetPortraitSpeaker() {} export function clearPortraits() {}',
  '/js/ui/door-card.js': 'export function showDoorCard() {}',
  '/js/ui/backlog.js': `export const lineId = (w, t) => t; export const wasRead = () => true; export function markRead() {}
    export function logLine() {} export const logToJSON = () => []; export function logLoad() {}
    export function openLog() {} export function closeLog() {} export const logOpen = () => false;
    export const logSize = () => 0; export function scrollLog() {}
    export function focusLog() {} export function activateLog() {}`,
  '/js/ui/dom.js': `const node = () => ({ hidden: false, innerHTML: '', textContent: 'a line', offsetWidth: 1,
      classList: { toggle() {}, add() {}, remove() {}, contains: () => false },
      querySelector() { return (this.kids ||= {}); }, querySelectorAll: () => [] });
    const talk = node(); talk.querySelector = (s) => (talk[s] ||= node());
    export const $ = (s) => (s === '#talk' ? talk : null); export const el = () => node();`,
};

test('Skip holds while the game is paused and stops when turned off meanwhile', async () => {
  registerHooks({
    load(url, context, next) {
      const k = Object.keys(STUBS).find((s) => url.endsWith(s));
      if (k) return { format: 'module', source: STUBS[k], shortCircuit: true };
      return next(url, context);
    },
  });
  globalThis.window = globalThis;
  globalThis.addEventListener ||= () => {};
  globalThis.document = { body: { classList: { contains: () => false, toggle() {} } }, querySelector: () => null };
  const { createDialogue } = await import('../../js/ui/dialogue.js');
  const { vn } = await import('../../js/ui/vn-controls.js');
  const { pauseAudio } = await import('../../js/audio/core.js');
  const ui = Object.assign(createDialogue({ sfx() {} }), { refreshWords() {} });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let done = 0;
  const say = () => ui.say({ name: 'Mio' }, 'a line').then(() => done++);

  vn.skip = true;
  say();
  await sleep(150);
  assert.equal(done, 1, 'a seen line skips on its own');

  pauseAudio(true); // the pause menu (menu.js) pauses this
  say();
  await sleep(600);
  assert.equal(done, 1, 'nothing moves on behind the pause menu');
  pauseAudio(false);
  await sleep(300);
  assert.equal(done, 2, 'Skip carries on after the pause');

  pauseAudio(true);
  say();
  await sleep(150);
  vn.skip = false; // turned off in the pause menu's wait
  pauseAudio(false);
  await sleep(400);
  assert.equal(done, 2, 'Skip turned off: the line waits for a tap');
  ui._advance = null; // let the test end
});
