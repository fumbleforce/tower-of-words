// Deliberately remove one real factory registration without modifying repository files.
// Startup must fail at main.prepare's validation, before the fast driver can run.
import assert from 'node:assert/strict';
import { withBrowserJob } from '../lib/browser-job.mjs';
import { openGame } from '../../game3d/test/support/open-game.mjs';

try {
  await withBrowserJob('registration-negative', async browser => {
    const intercepted = {
      async newContext(options) {
        const context = await browser.newContext(options);
        await context.route(url => url.pathname.endsWith('/game3d/js/places/train.js')
          && !url.searchParams.has('registration-original'), route => route.fulfill({
          contentType: 'text/javascript',
          body: `export * from './train.js?registration-original=1';
            import { trainPlace as original } from './train.js?registration-original=1';
            export async function trainPlace(...args) {
              const place = await original(...args);
              delete place.things.aoi;
              return place;
            }`,
        }));
        return context;
      },
    };
    let opened;
    try {
      await assert.rejects(async () => { opened = await openGame(intercepted, { mode: 'fast' }); },
        /train\.things: missing \[aoi\]/);
    } finally { if (opened) await opened.close(); }
  });
  console.log('PASS registration: actual missing factory object fails during startup');
} catch (error) {
  console.error(`${error.code === 'LOAD_DEFERRED' ? 'DEFERRED' : 'FAIL'} registration: ${error.message}`);
  process.exitCode = error.code === 'LOAD_DEFERRED' ? 75 : 1;
}
