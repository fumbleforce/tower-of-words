import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blockedSource, scopedFetch, scopedRoute } from '../../../tools/bible/check-scope.mjs';
test('Bible QA blocks protected sources, including encoded links, before requesting them', () => {
  for (const target of [
    '/island/private/user/test.png',
    '/island/private//user/test.png',
    '/island//private/user/test.png',
    '/island/private/bible/../user/test.png',
    '/island%2Fprivate%2Fuser/test.png',
    '/island%252Fprivate%252Fuser/test.png',
    '/island/private/manifest.user.json',
    '/bible/#doc/island/private/user/test.md',
    '/bible/#doc/island\\private\\user/test.md',
    '/bible/#doc/island//private/user/test.md',
  ]) assert.equal(blockedSource(target), true, target);
  assert.equal(blockedSource('/bible/data.json'), false);
  assert.equal(blockedSource('/island/private/bible/'), false);
  assert.equal(blockedSource('/island/private/bible/', true), true);
  assert.equal(blockedSource('/bible/#doc/island/private/bible/data.json', true), true);
  assert.equal(blockedSource('/island//private/bible/private.json', true), true);
});
test('HTTP reads and browser requests deny protected URLs before sending anything', async () => {
  let requests = 0, aborts = 0;
  const failures = [];
  const url = 'http://127.0.0.1:8771/island/private//user/fixture';
  await assert.rejects(scopedFetch(url, { fetchImpl: async () => { requests++; } }), /Out-of-scope/);
  await scopedRoute({ onFailure: message => failures.push(message) })({
    request: () => ({ url: () => url }), fetch: async () => { requests++; }, abort: async () => { aborts++; },
  });
  assert.equal(requests, 0);
  assert.equal(aborts, 1);
  assert.match(failures[0], /private\/\/user/);
});
test('both transports refuse redirects and the browser never fulfills one', async () => {
  let fulfilled = false, aborted = false;
  await scopedFetch('http://127.0.0.1:8771/bible/', { fetchImpl: async (_url, options) => {
    assert.equal(options.redirect, 'error'); return { status: 200 };
  } });
  const failures = [];
  await scopedRoute({ onFailure: message => failures.push(message) })({
    request: () => ({ url: () => 'http://127.0.0.1:8771/redirect' }),
    fetch: async options => { assert.equal(options.maxRedirects, 0); return { status: () => 301 }; },
    abort: async () => { aborted = true; }, fulfill: async () => { fulfilled = true; },
  });
  assert.equal(fulfilled, false); assert.equal(aborted, true);
  assert.match(failures[0], /redirect refused/);
});
test('controlled shutdown catches a late fulfillment rejection', async () => {
  const failures = [];
  await scopedRoute({ isClosing: () => true, onFailure: message => failures.push(message) })({
    request: () => ({ url: () => 'http://127.0.0.1:8771/bible/' }),
    fetch: async () => ({ status: () => 200 }), fulfill: async () => { throw new Error('context closed'); },
  });
  assert.deepEqual(failures, []);
});


test('cached public font revalidation is fulfilled without treating 304 as a redirect', async () => {
  const failures = [], response = { status: () => 304 };
  let fulfilled = false;
  await scopedRoute({ publicOnly: true, onFailure: message => failures.push(message) })({
    request: () => ({ url: () => 'http://127.0.0.1:8771/game3d/fonts/zkg-bold.woff2' }),
    fetch: async options => { assert.equal(options.maxRedirects, 0); return response; },
    abort: async () => { assert.fail('304 must not be aborted'); },
    fulfill: async options => { assert.equal(options.response, response); fulfilled = true; },
  });
  assert.equal(fulfilled, true);
  assert.deepEqual(failures, []);
});
