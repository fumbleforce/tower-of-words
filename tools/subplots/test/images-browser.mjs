import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {withBrowserJob} from '../../lib/browser-job.mjs';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'subplot-images-'));
const port = 8797;
const base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['tools/review_server.py', String(port)], {env: {...process.env, SUBPLOTS_ROOT: root, SUBPLOTS_PUBLIC_ONLY: '1'}, stdio: 'ignore'});
const picture = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="400" height="240" fill="#dae4ed"/><circle cx="200" cy="80" r="30" fill="#86a5bd"/><path d="M150 210v-65q50-60 100 0v65" fill="#567c98"/></svg>');
const fixture = {id:'fixture:scene',steps:[{say:'alice',text:'Hello.'}],images:[{id:'one',label:'First shot',url:picture},{id:'two',label:'Second shot',url:picture},{id:'three',label:'Third shot',url:picture,available:true}],metadata:{}};
const presets = {character:[{id:'alice',v:1,data:{name:'Alice',gender:'female',outfit:'blue coat',portrait:'art/fixture.webp'}}],model:[{id:'local',v:1,data:{name:'Local model',file:'fixture.safetensors'}}],style:[{id:'paint',v:1,data:{name:'Painted',quality:'illustration'}}],framing:[{id:'wide',v:1,data:{name:'Wide',w:1200,h:800}}],camera:[{id:'near',v:1,data:{name:'Close',prompt:'close camera'}},{id:'left',v:1,data:{name:'From left',prompt:'left camera'}}],scene:[{id:'reading',v:1,data:{name:'Reading',text:'Reading a letter'}}],negative:[],pose:[{id:'seated',v:1,data:{name:'Seated',text:'seated on a bench'}}],location:[{id:'bathhouse',v:1,data:{name:'Bathhouse',text:'in a bathhouse'}}],light:[{id:'night',v:1,data:{name:'Night lighting',text:'night lighting'}}],outfit:[]};
const html = `<html><head><link rel="stylesheet" href="/tools/subplots/web/editor.css"><link rel="stylesheet" href="/tools/subplots/web/images.css"></head><body><div id="notice" role="status" hidden></div><main style="max-width:450px;margin:auto;padding:16px"><button data-inspect="images">Images</button><section id="images" hidden><button id="loadPresets">Connect</button><p id="imageStatus"></p><div id="composition"></div><div id="renders"></div></section></main><script type="module">import {installImages} from '/tools/subplots/web/images.js';window.fixture=${JSON.stringify(fixture)};window.edits=0;document.querySelector('[data-inspect]').onclick=()=>document.querySelector('#images').hidden=false;window.editor=installImages(()=>window.fixture,()=>window.edits++);window.editor.render();</script></body></html>`;
try {
  for (let i = 0; i < 60; i++) {try {if ((await fetch(base + '/tools/subplots/web/images.js')).ok) break;} catch {} await new Promise(resolve => setTimeout(resolve, 100));}
  await withBrowserJob('codex-subplot-image-editor', async browser => {
    const page = await browser.newPage({viewport:{width:550,height:900}});
    const errors = [], generated = [], created = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/island/private/**', route => route.abort());
    await page.route('**/api/subplots/picture-source**', route => route.fulfill({json:{how:'the fixture round', start:{image:'art/fixture.webp'},
      job:{positive:'Original words, close camera', negative:'bad hands', seed:77, model_file:'fixture.safetensors', w:1200, h:800, steps:28, cfg:4}}}));
    await page.route('**/image-harness', route => route.fulfill({contentType:'text/html',body:html}));
    await page.route('**/api/subplots/image/**', async route => {
      const u = new URL(route.request().url());
      if (u.pathname.includes('/repo/') || u.pathname.includes('/out/') || u.pathname.includes('/thumb/')) return route.fulfill({contentType:'image/svg+xml',body:decodeURIComponent(picture.split(',')[1])});
      let body = [];
      if (u.pathname.endsWith('/presets')) body = presets;
      if (u.pathname.endsWith('/history')) body = [{run_id:'old',at:'2026-10-01',characters:['alice'],positive:'A previous picture.',model_file:'fixture.safetensors',renders:[{id:'old-picture',file:'fixture.png',thumb:'fixture.webp',seed:8}]}];
      if (u.pathname.endsWith('/portraits')) body = [{path:'art/fixture.webp',group:'Portrait'}];
      if (u.pathname.endsWith('/generate')) { generated.push(route.request().postDataJSON()); body = {run_id:'new'}; }
      if (u.pathname.endsWith('/mode')) body = {private: false};
      if (u.pathname.endsWith('/create')) { const b = route.request().postDataJSON(); created.push({path: u.pathname, ...b}); presets.location.push({id:'outside-sento',v:1,data:b.data}); body = {id:'outside-sento'}; }
      await route.fulfill({json:body});
    });
    await page.goto(base + '/image-harness');
    await page.locator('[data-inspect=images]').click();
    await page.locator('[data-char=alice]').waitFor();
    assert.equal(await page.locator('[data-char=alice]').getAttribute('aria-pressed'),'true');
    await page.locator('[data-outfit-for=alice]').selectOption('usual');
    await page.locator('[data-compose=scenePreset]').selectOption('reading');
    await page.locator('[data-compose=pose]').selectOption('seated');
    await page.locator('[data-camera=near]').click();
    await page.locator('[data-camera=left]').click();
    await page.locator('#generate').click();
    assert.equal(generated.length,1);
    assert.match(generated[0].positive,/Reading a letter/);
    assert.match(generated[0].positive,/wearing blue coat/);
    assert.equal(generated[0].presets.cameras.length,2);
    await page.locator('[data-library=all]').click();
    await page.locator('[data-use]').click();
    assert.equal(await page.evaluate(()=>fixture.metadata.images.one.file),'fixture.png');
    await page.evaluate(()=>globalThis.editor.focus('two'));
    await page.locator('[data-use]').click();
    assert.deepEqual(await page.evaluate(()=>Object.keys(fixture.metadata.images)),['one','two']);
    await page.locator('[data-reuse]').click();
    assert.equal(await page.locator('[data-compose=seed]').inputValue(),'8');
    // no blocks on that picture: Fill from prompt puts its words in the free text, and the original prompt stays as is
    assert.equal(await page.locator('[data-compose=scene]').inputValue(),'A previous picture.');
    assert.equal(await page.locator('[data-original=positive]').inputValue(),'A previous picture.');
    assert.match(await page.locator('#assembled').textContent(),/A previous picture/);
    await page.locator('[data-compose=light]').selectOption('night');
    assert.match(await page.locator('#assembled').textContent(),/night lighting/);
    // a shot's own picture opens filled in from its source, and "Small changes" starts from it with the same seed
    await page.evaluate(()=>globalThis.editor.focus('three'));
    await page.waitForFunction(()=>globalThis.document.querySelector('[data-original=positive]')?.value === 'Original words, close camera');
    assert.equal(await page.locator('[data-compose=seed]').inputValue(),'77');
    assert.equal(await page.evaluate(()=>[...globalThis.document.querySelectorAll('[data-camera]')].filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>b.dataset.camera).join()),'near');
    await page.locator('[data-small-changes]').click();
    await page.locator('[data-compose=startDenoise]').waitFor();
    await page.locator('#generate').click();
    assert.equal(generated.length,2);
    assert.deepEqual(generated[1].start,{image:'art/fixture.webp',denoise:0.35});
    assert.equal(generated[1].seed,77);
    assert.equal(generated[1].positive,'Original words, close camera');
    // "+ New…" in a picker: a setting made from Bathhouse, saved as a block and used at once
    await page.locator('[data-compose=environment]').selectOption('__new__');
    await page.locator('#blockDialog [data-from]').selectOption('bathhouse');
    assert.equal(await page.locator('#blockDialog [data-f=text]').inputValue(),'in a bathhouse');
    await page.locator('#blockDialog [data-f=name]').fill('Outside sento');
    await page.locator('#blockDialog [data-f=text]').fill('outside a sento, a noren curtain');
    await page.locator('#blockDialog [data-save]').click();
    await page.waitForFunction(()=>globalThis.document.querySelector('[data-compose=environment]').value === 'outside-sento');
    assert.equal(created[0].path,'/api/subplots/image/api/preset/location/bathhouse/create');
    assert.equal(created[0].private,false);
    assert.match(await page.locator('#assembled').textContent(),/outside a sento, a noren curtain/);
    assert.deepEqual(errors,[]);
    fs.mkdirSync('/tmp/codex-subplot-image-editor',{recursive:true});
    await page.screenshot({path:'/tmp/codex-subplot-image-editor/550.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth > globalThis.innerWidth),false);
    await page.screenshot({path:'/tmp/codex-subplot-image-editor/390.png',fullPage:true});
    await page.close();
    console.log('PASS image editor: auto-connect, scene direction, cast/outfit, multiple cameras, generation request, full history, separate shot selections, reuse with Fill from prompt, + New setting from Bathhouse, a shot opened from its source with Small changes, 390px layout.');
  }, {timeoutMs:60000,gpuWaitMs:60000});
} finally {server.kill('SIGTERM');fs.rmSync(root,{recursive:true,force:true});}
