// Synthetic pages only: verify the shared toggle without loading any private content or user presets.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {withBrowserJob} from '../lib/browser-job.mjs';
const port = +process.env.NAV_TEST_PORT || 8798;
const base = `http://127.0.0.1:${port}`;
const out = process.env.NAV_SHOTS || '/tmp/codex-shot-people/nav';
fs.mkdirSync(out, {recursive:true});
if (await fetch(base).then(() => true, () => false)) throw Error('Test port is occupied');
const fixture = `tools/nav/.mode-fixture-${process.pid}.html`;
fs.writeFileSync(fixture, '<html><head><title>Mode toggle fixture</title></head><body style="margin:0;background:#12161d;color:white;font:16px system-ui"><script src="/tools/nav/nav.js"></script><main style="padding:24px"><h1>Scene editor</h1><p>Mode toggle test fixture.</p></main></body></html>');
const server = spawn('python3', ['tools/review_server.py', String(port)], {env:{...process.env, SUBPLOTS_PUBLIC_ONLY:'1'}, stdio:'ignore'});
try {
  for (let i=0; i<60; i++) {
    if (await fetch(base + '/tools/nav/nav.js').then(r=>r.ok,()=>false)) break;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  await withBrowserJob('codex-mode-toggle', async browser => {
    const page = await browser.newPage();
    const errors=[];
    page.on('pageerror', e=>errors.push(e.message));
    await page.addInitScript(()=>{globalThis.AMAKAWA_NAV=true;});
    await page.route('**/island/private/**', route=>route.abort());
    await page.route('**/api/nav-private.js', route=>route.fulfill({contentType:'text/javascript',body:'/* fixture has no private content */'}));

    const url=base+'/'+fixture+'?fixture=1#public:fixture';
    for (const width of [390,1366,2560]) {
      await page.setViewportSize({width,height:width===390?844:900});
      await page.goto(url);
      assert.equal(await page.title(), 'Mode toggle fixture');
      assert.equal(await page.locator('[data-mode=nonadult]').getAttribute('aria-pressed'),'true');
      for (const mode of ['adult','nonadult']) {
        const b=await page.locator(`[data-mode=${mode}]`).boundingBox();
        assert.ok(b.x>=0 && b.x+b.width<=width,'Toggle stays on screen');
      }
      await page.locator('[data-mode=adult]').click();
      await page.waitForFunction(()=>globalThis.AmakawaNav?.privateMode===true);
      assert.equal(page.url(),url);
      assert.equal(await page.title(), 'Mode toggle fixture');
      assert.equal(await page.locator('[data-mode=adult]').getAttribute('aria-pressed'),'true');
      await page.screenshot({path:`${out}/adult-${width}.png`});
      await page.locator('[data-mode=nonadult]').click();
      await page.waitForFunction(()=>globalThis.AmakawaNav?.privateMode===false);
      assert.equal(page.url(),url);
      assert.equal(await page.title(), 'Mode toggle fixture');
      await page.screenshot({path:`${out}/nonadult-${width}.png`});
    }
    // Navigation gives the editor's unsaved-changes handler a chance to cancel before the cookie changes.
    await page.evaluate(()=>globalThis.addEventListener('beforeunload',e=>{e.preventDefault();e.returnValue='';}));
    page.once('dialog', dialog=>dialog.dismiss());
    await page.locator('[data-mode=adult]').click();
    assert.equal(await page.evaluate(()=>globalThis.document.cookie.includes('amakawa_mode=private')),false);
    assert.equal(page.url(),url);
    assert.deepEqual(errors,[]);
    console.log('Mode toggle: both directions, page/query/scene retained, phone/desktop visibility, canceled navigation passed.');
    await page.close({runBeforeUnload:false});
  }, {gpuWaitMs:180000});
} finally {
  fs.unlinkSync(fixture);
  server.kill();
  await new Promise(resolve=>server.once('exit',resolve));
}
