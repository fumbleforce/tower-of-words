import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {withBrowserJob} from '../../lib/browser-job.mjs';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'subplot-loading-'));
const port = +process.env.SUBPLOTS_TEST_PORT || 8798;
const base = `http://127.0.0.1:${port}`;
if (await fetch(base + '/').then(() => true, () => false)) throw Error('Test port is already in use.');
const server = spawn('python3', ['tools/review_server.py', String(port)], {env:{...process.env,SUBPLOTS_ROOT:root,SUBPLOTS_PUBLIC_ONLY:'1'},stdio:'ignore'});
const saved = {environment:'room',light:'day',style:'paint',framing:'wide',model:'model',characters:[],castInitialized:true,sourceChecked:true,
  blockOverrides:{location:{room:{text:'a sunny terrace'}},style:{paint:{quality:'ink drawing',anchors:''}}}};
const presets = {location:[{id:'room',data:{name:'Room',text:'an old room'}}],light:[{id:'day',data:{name:'Day',text:'daylight'}}],
  style:[{id:'paint',data:{name:'Paint',quality:'painting'}}],framing:[{id:'wide',data:{name:'Wide',w:1200,h:800}}],model:[{id:'model',data:{name:'Model',file:'fixture.safetensors'}}]};
const html = `<button id="open">Open picture</button><button data-inspect="images">Images</button><div id="notice" hidden></div><section id="images"><button id="loadPresets">Connect</button><p id="imageStatus"></p><div id="composition"></div><div id="renders"></div></section><script type="module">
import {installImages} from '/tools/subplots/web/images.js';
import {normalizeComposition} from '/tools/subplots/web/image-compose.js';
window.scene={id:'fixture:loading',steps:[],images:[{id:'one',label:'New picture',available:false}],metadata:{compositions:{one:normalizeComposition(${JSON.stringify(saved)})}}};
window.editor=installImages(()=>window.scene,()=>{});document.querySelector('#open').onclick=()=>window.editor.focus('one');window.ready=true;</script>`;
let page;
try {
  for (let i = 0; i < 60; i++) {try {if ((await fetch(base + '/tools/subplots/web/images.js')).ok) break;} catch {} await new Promise(resolve => setTimeout(resolve, 100));}
  await withBrowserJob('codex-shot-loading', async browser => {
    page = await browser.newPage({viewport:{width:390,height:844}});
    const errors = [], pending = [], generated = [];
    let presetArrived;
    const nextPreset = () => new Promise(resolve => { presetArrived = resolve; });
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/island/private/**', route => route.abort());
    await page.route('**/loading-fixture', route => route.fulfill({contentType:'text/html',body:html}));
    await page.route('**/api/subplots/**', route => {
      const url = route.request().url();
      if (url.endsWith('/presets')) { pending.push(route); presetArrived?.(); return; }
      if (url.endsWith('/generate')) generated.push(route.request().postDataJSON());
      return route.fulfill({json:url.endsWith('/mode') ? {private:false} : url.includes('/pictures?') ? {runs:[]} : []});
    });
    await page.goto(base + '/loading-fixture');
    await page.waitForFunction(() => globalThis.ready);
    const firstRequest = nextPreset();
    await page.locator('#open').click();
    assert.deepEqual(errors, [], 'focus must render the saved shot before presets arrive');
    const local = page.locator('[data-block-kind=location][data-block-word=text]');
    assert.equal(await local.inputValue(), 'a sunny terrace');
    assert.equal(await page.locator('#generate').isDisabled(), true);
    assert.equal(await page.locator('.image-current [data-preview-place]').isDisabled(), true);
    await firstRequest;
    assert.equal(pending.length, 1);
    await pending.shift().fulfill({status:503,json:{error:'Fixture is offline'}});
    await page.waitForFunction(() => globalThis.document.querySelector('#imageStatus').textContent.includes('Fixture is offline'));
    assert.equal(await local.inputValue(), 'a sunny terrace');
    // Reopening while offline still renders; retry can then resolve the saved template references.
    const retryRequest = nextPreset();
    await page.locator('#open').click();
    assert.deepEqual(errors, []);
    await retryRequest;
    await page.waitForFunction(() => globalThis.document.querySelector('#imageStatus').textContent.includes('Loading'));
    assert.equal(pending.length, 1);
    await pending.shift().fulfill({json:presets});
    await page.waitForFunction(() => !globalThis.document.querySelector('#generate').disabled);
    assert.equal(await local.inputValue(), 'a sunny terrace');
    assert.equal(await page.locator('[data-block-kind=style][data-block-word=quality]').inputValue(), 'ink drawing');
    assert.match(await page.locator('#assembled').textContent(), /ink drawing.*a sunny terrace.*daylight/);
    assert.deepEqual(await page.evaluate(() => globalThis.scene.metadata.compositions.one.blockOverrides), saved.blockOverrides);
    assert.equal(await page.locator('.image-current [data-preview-place]').isDisabled(), false);
    await page.locator('#generate').click();
    assert.match(generated[0].positive, /ink drawing.*a sunny terrace/);
    assert.deepEqual(errors, []);
    await page.close(); page = null;
    console.log('PASS saved shot focus before slow presets, offline render, retry, local words preserved and generation enabled only after loading.');
  }, {timeoutMs:60000,gpuWaitMs:60000});
} finally {
  if (page) await page.close().catch(() => {});
  server.kill('SIGTERM'); fs.rmSync(root,{recursive:true,force:true});
}
