import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import { openGame } from '../support/open-game.mjs';

function browserFixture({ http = 200, closeFails = false } = {}) {
  const page = new EventEmitter(), calls = { modes: [], init: [], clicked: 0, tapped: 0, closed: 0 };
  page.addInitScript = async (fn, data) => calls.init.push({ fn, data });
  page.goto = async url => { calls.url = new URL(url); return { ok: () => http < 400, status: () => http }; };
  page.waitForFunction = async (fn, mode) => calls.modes.push(mode);
  page.evaluate = async () => null;
  page.locator = selector => {
    assert.equal(selector, '#title .go');
    return { click: async () => { calls.clicked++; }, tap: async () => { calls.tapped++; } };
  };
  const context = { newPage: async () => page, close: async () => { calls.closed++; if (closeFails) throw new Error('close boom'); } };
  return { calls, page, browser: { newContext: async options => { calls.options = options; return context; } } };
}
test('default startup preserves fresh onboarding and enters through the title', async () => {
  const { browser, calls } = browserFixture();
  const opened = await openGame(browser);
  assert.deepEqual(calls.init, []);
  assert.deepEqual(calls.modes, ['title', 'play']);
  assert.equal(calls.clicked, 1);
  assert.equal(calls.url.searchParams.has('test'), false);
  await opened.close();
  assert.equal(calls.closed, 1);
});
test('fast route startup is explicit and does not dismiss a title', async () => {
  const { browser, calls } = browserFixture();
  const opened = await openGame(browser, { mode: 'fast', route: 'social', quality: 1 });
  assert.equal(calls.url.searchParams.get('test'), 'fast');
  assert.equal(calls.url.searchParams.get('route'), 'social');
  assert.equal(calls.url.searchParams.get('q'), '1');
  assert.deepEqual(calls.modes, ['fast']);
  assert.equal(calls.clicked + calls.tapped, 0);
  await opened.close();
});
test('touch and preloaded history are explicit; the real Start action owns reset', async () => {
  const { browser, calls } = browserFixture();
  const fixture = { moved: true, talked: true };
  const opened = await openGame(browser, { touch: true, initialOnboarding: fixture, viewport: { width: 390, height: 844 } });
  assert.equal(calls.options.isMobile, true);
  assert.equal(calls.options.hasTouch, true);
  assert.equal(calls.tapped, 1);
  assert.deepEqual(calls.init[0].data, fixture);
  await opened.close();
});
test('navigation failure closes the context and includes HTTP status', async () => {
  const { browser, calls } = browserFixture({ http: 503 });
  await assert.rejects(openGame(browser), /Game HTTP 503/);
  assert.equal(calls.closed, 1);
});

test('cleanup failure preserves the original startup error', async () => {
  const { browser, calls } = browserFixture({ http: 503, closeFails: true });
  await assert.rejects(openGame(browser), error => /Game HTTP 503/.test(error.message) && /close boom/.test(error.message));
  assert.equal(calls.closed, 1);
});
