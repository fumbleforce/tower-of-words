// End-to-end image-to-scene authoring with a fixture image service and temporary editor state.
// No real render queue, local provider, protected files or gameplay sources are used.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {withBrowserJob} from '../../lib/browser-job.mjs';

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scene-studio-browser-'));
const port = +process.env.SUBPLOTS_STUDIO_TEST_PORT || 8897;
const base = `http://127.0.0.1:${port}`;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');
const job = {id:'fixture-1',private:false,file:'fixture/one.png',url:'/api/subplots/image/out/fixture/one.png',
  positive:'a rainy station, a red umbrella',negative:'blurry',seed:42,w:896,h:1152,steps:24,cfg:6,
  sampler:'euler',scheduler:'normal',model_file:'fixture.safetensors',compose:{}};
const presets = {model:[{id:'model',data:{name:'Model',file:'fixture.safetensors'}}],framing:[{id:'portrait',data:{name:'Portrait',w:896,h:1152}}]};
let deleted = false;
const imageService = http.createServer((req, res) => {
  const name = new URL(req.url, 'http://fixture').pathname;
  if (name === '/out/fixture/one.png') {res.writeHead(deleted ? 404 : 200, {'Content-Type':'image/png'}); res.end(deleted ? '' : png); return;}
  res.setHeader('Content-Type', 'application/json');
  if (name === '/api/render/fixture-1') {res.statusCode = deleted ? 404 : 200; res.end(JSON.stringify(deleted ? {error:'Deleted'} : job)); return;}
  res.end(JSON.stringify(name === '/api/presets' ? presets : name === '/api/mode' ? {private:false} : []));
});
await new Promise(resolve => imageService.listen(0, '127.0.0.1', resolve));
if (await fetch(base + '/').then(() => true, () => false)) throw Error('Studio test port is already in use.');
fs.mkdirSync(path.join(root, 'game3d/story'), {recursive:true});
const story = path.join(root, 'game3d/story/fixture.js');
const original = "export default {nodes:{start:['> Existing story.']}};";
fs.writeFileSync(story, original);
const server = spawn('python3', ['tools/review_server.py', String(port)], {cwd:repo,stdio:'ignore',env:{...process.env,
  SUBPLOTS_ROOT:root,SUBPLOTS_STATE:path.join(root,'state'),SUBPLOTS_PUBLIC_ONLY:'1',IMAGEGEN_URL:`http://127.0.0.1:${imageService.address().port}`}});
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
let page;
try {
  for (let i=0;i<80;i++) {try {if ((await fetch(base+'/tools/subplots/web/app.js')).ok) break;} catch {} await wait(100);}
  const response = await fetch(base+'/api/subplots/create-from-image', {method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({imageId:job.id,title:'Rain at the station'})});
  assert.equal(response.status,200);
  const {id} = await response.json();
  assert.match(id,/^studio:public:/);
  assert.equal((await fetch(base+'/api/subplots/read?id='+encodeURIComponent(id))).status,200, 'public studio ID passes the review server guard');
  const privateId = id.replace(':public:',':private:');
  assert.equal((await fetch(base+'/api/subplots/read?id='+encodeURIComponent(privateId))).status,403);
  deleted = true;
  await withBrowserJob('codex-image-scene-draft', async browser => {
    page = await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/island/private/**', route => route.abort());
    await page.goto(base+'/tools/subplots/web/#'+encodeURIComponent(id));
    await page.locator('#docTitle', {hasText:'Rain at the station'}).waitFor();
    assert.equal(await page.locator('#docAudience').innerText(),'Scene draft');
    assert.equal(await page.locator('#save').innerText(),'Save draft');
    assert.equal(await page.locator('#play').getAttribute('aria-disabled'),'true');
    assert.equal(await page.locator('#days [data-day=any]').getAttribute('aria-pressed'),'true');
    assert.match(await page.locator('#sceneList').innerText(),/Drafts[\s\S]*Rain at the station/);
    await page.waitForFunction(() => globalThis.document.querySelector('#timeline .pic img')?.naturalWidth > 0);
    await page.locator('#timeline .pic .change').click();
    await page.locator('#tabPicture [data-compose]').click();
    await page.locator('[data-original-open] > summary').click();
    await page.locator('[data-original=positive]').waitFor();
    assert.equal(await page.locator('[data-original=positive]').inputValue(),job.positive);
    assert.equal(await page.locator('[data-original=negative]').inputValue(),job.negative);
    const originalSettings=await page.evaluate(async () => (await import('/tools/subplots/web/store.js')).S.scene.metadata.compositions['image:0'].original);
    assert.equal(originalSettings.seed,42);
    assert.equal(originalSettings.steps,24);
    assert.equal(originalSettings.cfg,6);
    assert.match(originalSettings.start,/^\/api\/subplots\/draft-picture\?/);
    await page.locator('#closeCompose').click();
    await page.locator('#timeline .add-row.full [data-k=narration]').click();
    await page.locator('#timeline textarea.text-main').fill('The platform falls quiet.');
    await page.locator('#save').click();
    await page.waitForFunction(() => globalThis.document.querySelector('#status').textContent.includes('Draft saved locally'));
    await page.reload();
    await page.locator('#timeline textarea.text-main').waitFor();
    assert.equal(await page.locator('#timeline textarea.text-main').inputValue(),'The platform falls quiet.');
    await page.locator('[data-tab=scene]').click();
    assert.match(await page.locator('#tabScene').innerText(),/Scene draft[\s\S]*revision/);
    assert.doesNotMatch(await page.locator('#tabScene').innerText(),/When it plays/);
    assert.equal(await page.locator('#tabScene .revision').count(),1);
    await page.locator('#preview').click();
    await page.waitForFunction(() => globalThis.document.querySelector('#previewDialog .pv-bg')?.naturalWidth > 0);
    assert.deepEqual(errors,[]);
    await page.close(); page=null;
    assert.equal(fs.readFileSync(story,'utf8'),original);
    console.log('PASS image-to-scene creation, public guard, draft grouping, durable picture, original prompt/settings, narrative save/reload/revision and preview.');
  }, {timeoutMs:90000,gpuWaitMs:60000});
} finally {
  if (page) await page.close().catch(()=>{});
  server.kill('SIGTERM');
  await new Promise(resolve => imageService.close(resolve));
  fs.rmSync(root,{recursive:true,force:true});
}
