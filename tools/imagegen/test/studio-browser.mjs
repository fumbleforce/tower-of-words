// Entirely intercepted fixture traffic: this test never reads or writes live image data, presets, scenes or the GPU.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {withBrowserJob} from '../../lib/browser-job.mjs';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const output = process.env.STUDIO_SHOTS || '/tmp/amakawa-image-studio-qa';
const record = (id, data) => ({id, v: 1, data});
const presets = {
  character: [record('alice', {name: 'Alice', gender: 'female', age: 'adult', look: 'short black hair', outfit: 'blue coat', portrait: 'art/fixture.webp'}), record('bob', {name: 'Bob', gender: 'male', look: 'curly brown hair'})],
  model: [record('local', {name: 'Local illustration model', file: 'fixture.safetensors', steps: 30, cfg: 5})],
  style: [record('paint', {name: 'Painted', quality: 'illustration', anchors: 'painted anime'})],
  framing: [record('wide', {name: 'Wide', w: 1152, h: 896, prompt: 'wide frame'}), record('tall', {name: 'Portrait', w: 896, h: 1152})],
  camera: [record('cowboy', {name: 'Cowboy shot', prompt: 'cowboy shot', group: 'shot', diagram: 'thighs'}), record('full', {name: 'Full body', prompt: 'full body', group: 'shot', diagram: 'full'})],
  negative: [record('clean', {name: 'Clean', text: 'watermark, blurry', default: true})],
  location: [record('room', {name: 'Station waiting room', text: 'inside a station waiting room'})],
  light: [record('day', {name: 'Window light', text: 'soft light from a window'})],
  pose: [record('sit', {name: 'Sitting', text: 'sitting on a bench'})], outfit: [], scene: [],
};
const jobs = Array.from({length: 6}, (_, i) => ({id: 'picture-' + (i + 1), run_id: 'fixture', n: i + 1, at: '2026-10-11T10:00:00Z', at_epoch: 1000 + i, file: 'fixture-' + i + '.png', thumb: 'fixture-' + i + '.webp', status: 'done', seed: 123 + i,
  positive: 'An adult woman reading beside a station window.', negative: 'watermark', model_file: 'fixture.safetensors', w: 1152, h: 896, steps: 30, cfg: 5, rating: 'safe', characters: ['alice'],
  compose: {subplotId: 'scene:old', imageSlot: 'old-shot', characters: ['alice'], scene: 'Reading beside a window', environment: 'room', light: 'day', people: {alice: {appearance: 'short black hair', clothing: 'linen jacket'}}, stage: {contact: ''}},
}));
delete jobs[0].file;
Object.assign(jobs[0], {source: 'agent', out_path: 'art/fixture.webp'});
const picture = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#4d6872"/><rect x="54" y="38" width="470" height="305" fill="#b5cbd1"/><path d="M54 245h470M290 38v305" stroke="#34515d" stroke-width="15"/><path d="M0 470L800 365V600H0Z" fill="#263d48"/><rect x="230" y="430" width="475" height="40" fill="#9b8268"/><rect x="248" y="470" width="22" height="90" fill="#88745f"/><rect x="659" y="470" width="22" height="80" fill="#88745f"/></svg>';
await fs.mkdir(output, {recursive: true});
await withBrowserJob('codex-image-studio', async browser => {
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
  const errors = [], unexpected = [], writes = [], sceneRequests = [];
  let trash = [], privateMode = false;
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), p = url.pathname;
    if (p.includes('/island/private/') || p.includes('/api/nav-private')) { unexpected.push(p); return route.abort(); }
    if (p.endsWith('/tools/nav/nav.js')) return route.fulfill({contentType: 'text/javascript', body: ''});
    if (/\/(out|thumb|repo|trashthumb|agentsrc)\//.test(p)) return route.fulfill({contentType: 'image/svg+xml', body: picture});
    if (p.startsWith('/api/')) {
      if (request.method() !== 'GET') writes.push({path: p, body: request.postDataJSON()});
      const suffix = p.replace(/^\/api\/subplots\/image\/api\//, '').replace(/^\/api\//, '');
      let json;
      if (suffix === 'mode') json = {private: privateMode};
      else if (suffix === 'state') json = {session: {state: 'on', idle_left: 1200, vram: {used: 4096, total: 16384}, lock: {mine: true}}, running: 0, queued: 0};
      else if (suffix === 'presets') json = presets;
      else if (suffix === 'models/files') json = ['fixture.safetensors'];
      else if (['loras', 'controls', 'portraits'].includes(suffix)) json = [];
      else if (suffix === 'jobs') json = jobs.filter(j => !trash.includes(j));
      else if (suffix === 'history') json = url.searchParams.has('preset') ? [] : [{run_id: 'fixture', at: jobs[0].at, renders: jobs.filter(j => !trash.includes(j))}];
      else if (suffix === 'trash') json = trash;
      else if (/^render\//.test(suffix)) {
        const id = suffix.split('/')[1], image = jobs.find(j => j.id === id);
        if (request.method() === 'GET') json = {...image, private: false, url: '/api/subplots/image/' + (image.file ? 'out/' + image.file : 'agentsrc/' + image.id)};
        else if (suffix.endsWith('/delete')) { trash.push(image); json = {ok: true}; }
        else if (suffix.endsWith('/restore')) { trash = trash.filter(j => j.id !== id); json = {ok: true}; }
        else { Object.assign(image, request.postDataJSON()); json = {ok: true}; }
      } else if (suffix === 'generate' || suffix.startsWith('session/') || suffix === 'cancel') json = {ok: true};
      else if (suffix === 'character-from-image') { const b = request.postDataJSON(); presets.character.push(record('created', b.data)); json = {id: 'created'}; }
      else if (p === '/api/subplots/create-from-image') { sceneRequests.push(request.postDataJSON()); json = {id: 'studio:fixture'}; }
      else { unexpected.push(p); return route.fulfill({status: 404, json: {error: 'Unexpected fixture request'}}); }
      return route.fulfill({json});
    }
    let file = p === '/' ? 'tools/imagegen/web/index.html' : p.startsWith('/web/') ? 'tools/imagegen' + p : p.slice(1);
    if (!/^(tools\/(imagegen|subplots)\/web\/|game3d\/fonts\/)/.test(file) || file.includes('..')) { unexpected.push(p); return route.abort(); }
    const contentType = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2'}[path.extname(file)];
    try { return route.fulfill({contentType, body: await fs.readFile(path.join(root, file))}); }
    catch { unexpected.push(p); return route.abort(); }
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://studio.test/');
  await page.waitForFunction(() => !globalThis.document.querySelector('#generate')?.disabled && globalThis.document.querySelectorAll('.render-card').length === 6);
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
  const positive = page.locator('#posOut'), negative = page.locator('#negOut');
  const pos = await positive.boundingBox(), neg = await negative.boundingBox(), results = await page.locator('#renders').boundingBox();
  assert.equal(pos.y, neg.y, 'prompt and negative are side by side');
  assert.ok(results.y > pos.y + pos.height, 'image rows follow prompts');
  assert.equal(await page.locator('[data-library=scene]').count(), 0);
  assert.equal(await page.locator('[data-lib=reuse]').first().textContent(), 'Load prompt and settings');
  const numbers = await page.locator('.render-card small .link:first-child').allTextContents();
  assert.deepEqual(numbers, ['#6', '#5', '#4', '#3', '#2', '#1']);
  // The left lane stays narrow on wide monitors, so shared tile sizes must not push Mood outside it.
  for (const width of [390, 720, 900, 1024, 1440, 1920, 2560]) {
    await page.setViewportSize({width, height: 1000});
    if (width <= 720 && !await page.locator('.studio-controls').evaluate(el => el.open)) await page.locator('.studio-controls-toggle').click();
    const containment = await page.locator('.studio-controls').evaluate(sidebar => {
      const bounds = sidebar.getBoundingClientRect();
      const controls = [...sidebar.querySelectorAll('.place-more button, .place-more input')].map(el => {
        const box = el.getBoundingClientRect();
        return {label: el.getAttribute('data-stage-field') || el.textContent.trim(), left: box.left, right: box.right, width: box.width};
      });
      return {left: bounds.left, right: bounds.right, controls};
    });
    assert.ok(containment.controls.every(c => c.left >= containment.left && c.right <= containment.right), 'Place controls fit sidebar at ' + width + ': ' + JSON.stringify(containment));
    assert.ok(containment.controls.find(c => c.label === 'mood').width >= 100, 'Mood is usable at ' + width);
  }
  await page.setViewportSize({width: 1440, height: 1000});
  await page.screenshot({path: path.join(output, 'desktop.png')});
  await page.setViewportSize({width: 2560, height: 1440});
  await page.screenshot({path: path.join(output, 'desktop-wide.png')});
  await page.setViewportSize({width: 1440, height: 1000});
  // A direct edit is used exactly, retained through settings, and persisted in the mode-specific draft.
  await positive.fill('A quiet station platform.');
  await negative.fill('watermark, extra hands');
  await page.locator('[data-settings-open] > summary').click();
  await page.locator('[data-compose=count]').fill('2');
  assert.equal(await positive.inputValue(), 'A quiet station platform.');
  await page.locator('#generate').click();
  const directJob = writes.find(x => x.path.endsWith('/generate')).body;
  assert.equal(directJob.positive, 'A quiet station platform.');
  assert.equal(directJob.negative, 'watermark, extra hands');
  assert.equal(directJob.count, 2);
  assert.ok(!('subplotId' in directJob.compose)); assert.ok(!('imageSlot' in directJob.compose));
  await page.reload(); await positive.waitFor();
  assert.equal(await positive.inputValue(), 'A quiet station platform.');
  await page.locator('[data-lib=reuse]').first().click();
  assert.equal(await page.locator('[data-shot-person-field=clothing]').inputValue(), 'linen jacket');
  await page.locator('[data-studio-direction] > summary').click();
  await page.locator('[data-stage]').waitFor();
  await page.locator('[data-shot-person-field=clothing]').fill('green coat');
  assert.match(await positive.inputValue(), /green coat/);
  await page.locator('#generate').click();
  const reused = writes.filter(x => x.path.endsWith('/generate')).at(-1).body;
  assert.ok(!('subplotId' in reused.compose)); assert.ok(!('imageSlot' in reused.compose));
  assert.equal(reused.seed, 128);
  await page.locator('[data-lib=use]').first().click();
  assert.match(await page.locator('#studioSelection').textContent(), /picture #6/);
  await page.screenshot({path: path.join(output, 'selection.png')});
  await page.locator('[data-create-scene]').click();
  await page.locator('#createSceneFromImage [name=title]').fill('Waiting at the station');
  await page.screenshot({path: path.join(output, 'create-scene.png')});
  await page.locator('#createSceneFromImage [type=submit]').click();
  assert.deepEqual(sceneRequests[0], {imageId: 'picture-6', title: 'Waiting at the station'});
  assert.match(await page.locator('#createSceneFromImage a').getAttribute('href'), /8771\/tools\/subplots\/web\/#studio%3Afixture/);
  await page.locator('#createSceneFromImage [data-close]').click();
  await page.locator('[data-create-character]').click();
  await page.locator('#blockDialog').waitFor();
  const footerVisible = await page.locator('#blockDialog').evaluate(dialog => {
    const frame = dialog.getBoundingClientRect();
    return ['[data-cancel]', '[data-save]'].every(selector => {
      const button = dialog.querySelector(selector), box = button.getBoundingClientRect();
      const target = globalThis.document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return box.top >= frame.top && box.bottom <= frame.bottom && (target === button || button.contains(target));
    });
  });
  assert.equal(footerVisible, true, 'Character Add and Cancel are visible and clickable before scrolling');
  await page.locator('#blockDialog [data-f=name]').fill('Station artist');
  await page.locator('#blockDialog [data-f=look]').fill('Adult, short black hair');
  await page.screenshot({path: path.join(output, 'create-character.png')});
  await page.locator('#blockDialog [data-save]').click();
  await page.waitForFunction(() => !globalThis.document.querySelector('#blockDialog').open);
  assert.equal(writes.find(x => x.path.endsWith('/character-from-image')).body.imageId, 'picture-6');
  // Library rating and trash remain backed by the shared routes.
  await page.locator('[data-lib=star]').first().click();
  await page.locator('[data-lib=del]').first().click();
  await page.locator('[data-trash]').click();
  await page.locator('[data-restore]').first().click();
  assert.equal(trash.length, 0);
  await page.locator('[data-trash]').click();
  await page.locator('[data-lib=open]').first().click();
  await page.locator('#libLightbox [data-a=scene]').waitFor();
  assert.equal(await page.locator('#libLightbox [data-a=sameseed]').textContent(), 'Load prompt and settings');
  await page.keyboard.press('Escape');
  await page.locator('[data-lib=use]').last().click();
  assert.match(await page.locator('#studioSelection img').getAttribute('src'), /agentsrc\/picture-1$/);
  await page.locator('[data-create-character]').click();
  await page.locator('#blockDialog[open]').waitFor();
  assert.match(await page.locator('#blockDialog .block-portrait img').getAttribute('src'), /agentsrc\/picture-1$/);
  await page.locator('#blockDialog [data-cancel]').click();
  await page.locator('[data-session]').click();
  assert.ok(writes.some(x => x.path === '/api/session/end'));
  // Desktop staging and phone have no horizontal page overflow.
  await page.locator('.studio-canvas').evaluate(el => { el.style.scrollBehavior = 'auto'; el.scrollTop = 0; });
  const stageBox = await page.locator('[data-stage]').boundingBox();
  assert.ok(stageBox.y > 0 && stageBox.y + stageBox.height < 1000, 'Staging is in view for its capture');
  await page.screenshot({path: path.join(output, 'staging.png')});
  await page.setViewportSize({width: 390, height: 844});
  assert.equal(await page.locator('.studio-controls').evaluate(el => el.open), false, 'Phone opens with Composition collapsed');
  await page.screenshot({path: path.join(output, 'phone.png')});
  await page.locator('[data-studio-direction] > summary').click();
  await page.locator('#studioPrompt').scrollIntoViewIfNeeded();
  await page.screenshot({path: path.join(output, 'phone-prompts.png')});
  await page.locator('.studio-controls-toggle').click();
  const mobileControls = await page.locator('.studio-controls').evaluate(el => ({open: el.open, height: el.getBoundingClientRect().height, scroll: el.scrollHeight, client: el.clientHeight, overflow: globalThis.getComputedStyle(el).overflowY}));
  assert.equal(mobileControls.open, true);
  assert.equal(mobileControls.overflow, 'visible');
  assert.ok(mobileControls.height > 500 && mobileControls.scroll <= mobileControls.client + 1, 'Expanded phone Composition uses natural page height');
  await page.locator('[data-stage-field=mood]').scrollIntoViewIfNeeded();
  await page.locator('[data-stage-field=mood]').fill('calm');
  await page.screenshot({path: path.join(output, 'phone-controls.png')});
  await page.locator('.studio-controls-toggle').click();
  const overflow = await page.evaluate(() => [...globalThis.document.querySelectorAll('body *')].filter(e => !e.closest('[hidden], dialog:not([open])') && e.getBoundingClientRect().right > globalThis.innerWidth + 1).map(e => ({tag: e.tagName, cls: e.className, right: e.getBoundingClientRect().right})));
  assert.equal(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth), true, JSON.stringify({overflow, widths: await page.evaluate(() => [...globalThis.document.querySelectorAll('body *')].filter(e => e.scrollWidth > e.clientWidth && globalThis.getComputedStyle(e).overflowX === 'visible').map(e => ({tag:e.tagName, cls:e.className, id:e.id, scroll:e.scrollWidth, client:e.clientWidth})))}));
  // Private draft can be changed independently and is never restored in public mode.
  await page.setViewportSize({width: 1440, height: 1000});
  privateMode = true; await page.reload(); await positive.waitFor();
  await positive.fill('Private fixture draft.');
  privateMode = false; await page.reload(); await positive.waitFor();
  assert.notEqual(await positive.inputValue(), 'Private fixture draft.');
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
  await context.close();
  console.log('PASS studio prompts, rows, persistence, mode separation, scene-free generation, reuse, create actions, library, GPU controls, desktop and phone. Shots: ' + output);
}, {timeoutMs: 90000, gpuWaitMs: 60000});
