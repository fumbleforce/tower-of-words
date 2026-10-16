import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {withBrowserJob} from '../../lib/browser-job.mjs';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'subplot-images-'));
const port = +process.env.SUBPLOTS_TEST_PORT || 8797;
const base = `http://127.0.0.1:${port}`;
if (await fetch(base + '/').then(() => true, () => false)) throw Error(`Port ${port} already has a server (one an earlier run left behind?). Stop it or set SUBPLOTS_TEST_PORT.`);
const server = spawn('python3', ['tools/review_server.py', String(port)], {env: {...process.env, SUBPLOTS_ROOT: root, SUBPLOTS_PUBLIC_ONLY: '1'}, stdio: 'ignore'});
const picture = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="400" height="240" fill="#dae4ed"/><circle cx="200" cy="80" r="30" fill="#86a5bd"/><path d="M150 210v-65q50-60 100 0v65" fill="#567c98"/></svg>');
const fixture = {id:'fixture:scene',steps:[{say:'alice',text:'Hello.'}],images:[{id:'one',label:'First shot',url:picture},{id:'two',label:'Second shot',url:picture},{id:'three',label:'Third shot',url:picture,available:true}],metadata:{}};
const presets = {character:[{id:'alice',v:1,data:{name:'Alice',gender:'female',outfit:'blue coat',portrait:'art/fixture.webp'}},{id:'bob',v:1,data:{name:'Bob',gender:'male',portrait:'art/fixture.webp'}}],model:[{id:'local',v:1,data:{name:'Local model',file:'fixture.safetensors'}}],style:[{id:'paint',v:1,data:{name:'Painted',quality:'illustration'}}],framing:[{id:'wide',v:1,data:{name:'Wide',w:1200,h:800}}],camera:[{id:'near',v:1,data:{name:'Close',prompt:'close camera'}},{id:'left',v:1,data:{name:'From left',prompt:'left camera'}},{id:'cowboy',v:1,data:{name:'Cowboy shot',prompt:'cowboy shot',group:'shot',diagram:'thighs'}},{id:'full',v:1,data:{name:'Full body',prompt:'full body',group:'shot',diagram:'full'}}],scene:[{id:'reading',v:1,data:{name:'Reading',text:'Reading a letter'}}],negative:[{id:'clean',v:1,data:{name:'Clean',text:'watermark',default:true}},{id:'soft',v:1,data:{name:'Soft (nonadult rewards)',text:'visible nipples, visible genitals, uncovered crotch, frontal explicit view, explicit sexual action, transparent unobstructed body',default:false,soft:true}}],pose:[{id:'seated',v:1,data:{name:'Seated',text:'seated on a bench'}}],location:[{id:'bathhouse',v:1,data:{name:'Bathhouse',text:'in a bathhouse'}}],light:[{id:'night',v:1,data:{name:'Night lighting',text:'night lighting'}}],outfit:[]};
const html = `<html><head><link rel="stylesheet" href="/tools/subplots/web/editor.css"><link rel="stylesheet" href="/tools/subplots/web/images.css"></head><body><script>window.AMAKAWA_NAV=true;</script><script src="/tools/nav/nav.js"></script><div id="notice" role="status" hidden></div><main style="max-width:450px;margin:auto;padding:16px"><button data-inspect="images">Images</button><section id="images" hidden><button id="loadPresets">Connect</button><p id="imageStatus"></p><div id="composition"></div><div id="renders"></div></section></main><script type="module">import {installImages} from '/tools/subplots/web/images.js';window.fixture=${JSON.stringify(fixture)};window.edits=0;globalThis.document.querySelector('[data-inspect]').onclick=()=>globalThis.document.querySelector('#images').hidden=false;window.editor=installImages(()=>window.fixture,()=>window.edits++);window.editor.render();</script></body></html>`;
try {
  for (let i = 0; i < 60; i++) {try {if ((await fetch(base + '/tools/subplots/web/images.js')).ok) break;} catch {} await new Promise(resolve => setTimeout(resolve, 100));}
  await withBrowserJob('codex-subplot-shot-blocks', async browser => {
    const page = await browser.newPage({viewport:{width:550,height:900}});
    const errors = [], generated = [], created = [], rated = [], history = [], examples = [], jobsNow = [], historyQueries = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/nav-private.js', route => route.fulfill({contentType:'text/javascript',body:''}));
    await page.route('**/island/private/**', route => route.abort());
    await page.route('**/api/subplots/picture-source**', route => route.fulfill({json:{how:'the fixture round', start:{image:'art/fixture.webp'},
      job:{positive:'Original words, close camera', negative:'bad hands', seed:77, model_file:'fixture.safetensors', w:1024, h:768, steps:28, cfg:4}}}));
    await page.route('**/image-harness', route => route.fulfill({contentType:'text/html',body:html}));
    await page.route('**/api/subplots/image/**', async route => {
      const u = new URL(route.request().url());
      if (u.pathname.includes('/repo/') || u.pathname.includes('/out/') || u.pathname.includes('/thumb/')) return route.fulfill({contentType:'image/svg+xml',body:decodeURIComponent(picture.split(',')[1])});
      let body = [];
      if (u.pathname.endsWith('/presets')) body = presets;
      if (u.pathname.endsWith('/jobs')) body = jobsNow;
      if (u.pathname.endsWith('/history')) historyQueries.push(Object.fromEntries(u.searchParams));
      if (u.pathname.endsWith('/history')) body = u.searchParams.has('before') ? [] : u.searchParams.get('preset') ? examples.filter(r => r.example === u.searchParams.get('preset')).map(r => r.run) : history.length ? history : [{run_id:'old',at:'2026-10-01',characters:['alice'],positive:'A previous picture.',model_file:'fixture.safetensors',renders:[{id:'old-picture',file:'fixture.png',thumb:'fixture.webp',seed:8}]}];
      if (u.pathname.endsWith('/portraits')) body = [{path:'art/fixture.webp',group:'Portrait'}];
      if (u.pathname.endsWith('/generate')) { generated.push(route.request().postDataJSON()); body = {run_id:'new'}; }
      if (u.pathname.endsWith('/mode')) body = {private: false};
      if (u.pathname.includes('/api/render/')) { rated.push([u.pathname, route.request().postDataJSON()]); body = {ok: true}; }
      if (u.pathname.endsWith('/create')) { const b = route.request().postDataJSON(); created.push({path: u.pathname, ...b}); presets.location.push({id:'outside-sento',v:1,data:b.data}); body = {id:'outside-sento'}; }
      await route.fulfill({json:body});
    });
    await page.goto(base + '/image-harness');
    await page.locator('[data-inspect=images]').click();
    // the scene's speaker is already in the shot, so People shows only her, with her outfit; the full picker opens on request
    await page.locator('[data-person=alice]').waitFor();
    assert.equal(await page.locator('[data-char]').count(),0);
    await page.locator('[data-people-open]').click();
    assert.equal(await page.locator('[data-char=alice]').getAttribute('aria-pressed'),'true');
    await page.locator('[data-people-open]').click();
    await page.locator('[data-person=alice]').waitFor();
    await page.locator('[data-outfit-for=alice]').selectOption('usual');
    await page.locator('[data-compose=scenePreset]').selectOption('reading');
    await page.locator('[data-compose=pose]').selectOption('seated');
    await page.locator('[data-cam-tab=angle]').click();
    await page.locator('[data-cam=near]').click();
    await page.locator('[data-cam=left]').click();
    // the tabs name what is chosen in each
    assert.match(await page.locator('[data-cam-tab=angle]').textContent(), /Close, From left/);
    await page.locator('[data-cam-tab=shot]').click();
    await page.locator('#generate').click();
    assert.equal(generated.length,1);
    assert.match(generated[0].positive,/Reading a letter/);
    assert.match(generated[0].positive,/wearing blue coat/);
    assert.equal(generated[0].presets.cameras.length,2);
    // generation settings are folded to one line; seed is Auto unless Fixed, and Fixed picks a seed to repeat
    assert.equal(generated[0].seed_mode,'random');
    assert.match(await page.locator('.settings-peek').textContent(),/Local model · 1 picture · seed auto · 30 steps · CFG 5 · Wide 1200×800/);
    assert.equal(await page.locator('[data-compose=seed]').isVisible(),false);
    await page.locator('.image-settings > summary').click();
    assert.equal(await page.locator('[data-compose=seed]').isDisabled(),true);
    await page.locator('[data-seed-mode=fixed]').click();
    assert.ok(+await page.locator('[data-compose=seed]').inputValue() > 0);
    await page.locator('[data-seed-mode=random]').click();
    assert.equal(await page.locator('[data-size=wide]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('[data-compose=width]').count(),0);
    await page.locator('[data-library=all]').click();
    // the lightbox: s stars, the reject reason, arrows and Escape (the dashboard's keys)
    await page.locator('[data-lib=open]').click();
    await page.locator('#libLightbox .lb').waitFor();
    assert.match(await page.locator('#libLightbox h2').textContent(),/1 of 1/);
    await page.keyboard.press('s');
    await page.waitForFunction(()=>globalThis.document.querySelector('#libLightbox [data-a=star]')?.getAttribute('aria-pressed') === 'true');
    assert.deepEqual(rated.at(-1),['/api/subplots/image/api/render/old-picture',{star:true,reject:false}]);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#libLightbox').isHidden(),true);
    assert.equal(await page.locator('[data-lib=star]').getAttribute('aria-pressed'),'true');
    await page.locator('[data-lib=use]').click();
    assert.equal(await page.evaluate(()=>fixture.metadata.images.one.file),'fixture.png');
    await page.evaluate(()=>globalThis.editor.focus('two'));
    await page.locator('[data-lib=use]').click();
    assert.deepEqual(await page.evaluate(()=>Object.keys(fixture.metadata.images)),['one','two']);
    await page.locator('[data-lib=reuse]').click();
    assert.equal(await page.locator('[data-compose=seed]').inputValue(),'8');
    // no blocks on that picture: Fill from prompt puts its words in the free text, and the original prompt stays as is
    assert.equal(await page.locator('[data-compose=scene]').inputValue(),'A previous picture.');
    assert.equal(await page.locator('[data-original=positive]').inputValue(),'A previous picture.');
    assert.match(await page.locator('#assembled').textContent(),/A previous picture/);
    await page.locator('[data-block-tile=light][data-id=night]').click();
    // a chosen light folds its row to the choice with Change (Jørgen, 2026-10-11: "upon selecting one, collapse the options")
    assert.equal(await page.locator('[data-row=light] [data-block-tile]').count(), 0);
    assert.equal(await page.locator('[data-chosen=light][data-id=night]').count(), 1);
    assert.match(await page.locator('#assembled').textContent(),/night lighting/);
    // a shot's own picture opens filled in from its source, and "Small changes" starts from it with the same seed
    await page.evaluate(()=>globalThis.editor.focus('three'));
    await page.waitForFunction(()=>globalThis.document.querySelector('[data-original=positive]')?.value === 'Original words, close camera');
    assert.equal(await page.locator('[data-compose=seed]').inputValue(),'77');
    // a size no preset has still opens, and shows as the shot's own size
    assert.match(await page.locator('[data-size-own]').textContent(),/1024×768/);
    assert.equal(await page.locator('[data-size=wide]').getAttribute('aria-pressed'),'false');
    assert.deepEqual(await page.evaluate(()=>[...globalThis.document.querySelectorAll('[data-cam-tab]')].map(b=>b.querySelector('.cam-choice').textContent)),['none','Close','none']);
    await page.locator('[data-small-changes]').click();
    await page.locator('.image-tools summary').click();
    await page.locator('[data-tool=denoise]').waitFor();
    await page.locator('#generate').click();
    assert.equal(generated.length,2);
    assert.deepEqual(generated[1].start,{image:'art/fixture.webp',denoise:0.35});
    assert.equal(generated[1].seed,77);
    assert.equal(generated[1].positive,'Original words, close camera');
    assert.deepEqual([generated[1].w,generated[1].h],[1024,768]);
    // a size preset after Small changes keeps the same seed and the original prompt
    await page.locator('[data-size=wide]').click();
    await page.locator('#generate').click();
    assert.deepEqual([generated[2].w,generated[2].h,generated[2].seed,generated[2].seed_mode,generated[2].positive],[1200,800,77,'fixed','Original words, close camera']);
    assert.deepEqual(generated[2].start,{image:'art/fixture.webp',denoise:0.35});
    // "+ New…" in a picker: a setting made from Bathhouse, saved as a block and used at once
    if (await page.locator('[data-unfold=location]').count()) await page.locator('[data-row=location] [data-unfold=location].small').click();
    await page.locator('[data-block-tile=location][data-id=bathhouse]').click();
    await page.locator('[data-new-tile=location]').click();
    await page.locator('#blockDialog [data-from]').selectOption('bathhouse');
    assert.equal(await page.locator('#blockDialog [data-f=text]').inputValue(),'in a bathhouse');
    await page.locator('#blockDialog [data-f=name]').fill('Outside sento');
    await page.locator('#blockDialog [data-f=text]').fill('outside a sento, a noren curtain');
    await page.locator('#blockDialog [data-save]').click();
    await page.waitForFunction(()=>globalThis.document.querySelector('[data-chosen=location][data-id=outside-sento]')?.getAttribute('aria-pressed') === 'true');
    assert.equal(created[0].path,'/api/subplots/image/api/preset/location/bathhouse/create');
    assert.equal(created[0].private,false);
    assert.match(await page.locator('#assembled').textContent(),/outside a sento, a noren curtain/);
    // Direct the shot (Jørgen, 2026-10-11: "I want previews for positioning. the camera and composition belongs wit hthis"):
    // one shot size at a time, people dragged on the stage, facing and gaze, and all of it in the prompt
    if (!await page.locator('[data-char=alice]').count()) await page.locator('[data-people-open]').click();
    for (const who of ['alice', 'bob']) if (await page.locator(`[data-char=${who}]`).getAttribute('aria-pressed') !== 'true') await page.locator(`[data-char=${who}]`).click();
    await page.locator('[data-people-open]').click();
    assert.match(await page.locator('.same-face-note').textContent(),/one person/);
    await page.locator('[data-cam=cowboy]').click();
    await page.locator('[data-cam=full]').click();
    assert.deepEqual(await page.evaluate(()=>[...globalThis.document.querySelectorAll('[data-row=shot] [data-cam]')].filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>b.dataset.cam)),['full']);
    const drag = async (id, dx, dy) => {
      await page.locator(`[data-fig="${id}"]`).first().scrollIntoViewIfNeeded();
      const box = await page.locator(`[data-fig="${id}"] ellipse`).last().boundingBox();  // the head
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y + dy, {steps: 6}); await page.mouse.up();
    };
    await drag('alice', -30, 0);
    await drag('bob', 25, -40);
    assert.match(await page.locator('.stage-say').textContent(),/Placed: Alice left, in front\. Bob right, (further|at the) back/);
    await page.locator('[data-who=bob]').click();
    await page.locator('[data-facing=partner]').click();
    await page.locator('[data-gaze=partner]').click();
    await page.locator('[data-person-field=expression]').fill('smiling');
    await page.locator('[data-light-from=back]').click();
    assert.match(await page.locator('#assembled').textContent(),/Alice on the left in the foreground\. Bob on the right [a-z ]+, turned toward Alice, looking at Alice, smiling.*backlighting, rim light.*full body/);
    // the arrow keys move the person whose button has focus
    const bobX = () => page.evaluate(()=>Object.values(globalThis.fixture.metadata.compositions).find(c=>c.stage).stage.people.bob.x);
    const before = await bobX();
    await page.locator('[data-who=bob]').focus();
    await page.keyboard.press('ArrowLeft');
    assert.ok(await bobX() < before, 'arrow left moves Bob');
    await page.locator('#generate').click();
    const staged = generated.at(-1);
    assert.equal(staged.compose.stage.people.bob.facing,'partner');
    // a staged picture reopens with its stage: Reuse settings fills it back in
    history.push({run_id:'staged',at:'2026-10-11',characters:['alice','bob'],positive:staged.positive,model_file:'fixture.safetensors',compose:staged.compose,renders:[{id:'staged-1',file:'staged.png',thumb:'staged.webp',seed:5,compose:staged.compose,positive:staged.positive}]});
    await page.locator('[data-refresh-images]').click();
    await page.locator('[data-lib=reuse]').first().waitFor();
    await page.evaluate(()=>{ for (const c of Object.values(globalThis.fixture.metadata.compositions)) delete c.stage; });
    await page.locator('[data-lib=reuse]').first().click();
    await page.waitForFunction(()=>/Placed: Alice left/.test(globalThis.document.querySelector('.stage-say')?.textContent || ''));
    assert.match(await page.locator('#assembled').textContent(),/turned toward Alice, looking at Alice, smiling/);
    // Make examples queues a small stand-in render per block without a picture; when it is done the tile shows it
    if (await page.locator('[data-row=light] [data-unfold=light].small').count()) await page.locator('[data-row=light] [data-unfold=light].small').click();
    await page.locator('[data-make-examples=light]').click();
    const asked = generated.filter(g => g.compose?.example);
    assert.deepEqual(asked.map(g => g.compose.example), ['light:night']);
    assert.match(asked[0].positive, /mannequin/);
    examples.push({example:'light:night',run:{run_id:'ex',compose:{example:'light:night'},renders:[{id:'ex-1',file:'ex.png',thumb:'ex.webp',compose:{example:'light:night'}}]}});
    jobsNow.push({id:'ex-1',status:'done',file:'ex.png',thumb:'ex.webp',compose:{example:'light:night'}});
    await page.locator('[data-refresh-images]').click();
    await page.locator('[data-block-tile=light][data-id=night] img').waitFor();
    // Preview this place: the setting in its light, no people, small, through the queue, and the empty picture slot shows
    // it (Jørgen, 2026-10-11: "gen that background scene as a preview ther ... and not get a blank preview as now")
    if (await page.locator('[data-block-tile=light][data-id=night]').getAttribute('aria-pressed') !== 'true') await page.locator('[data-block-tile=light][data-id=night]').click();
    await page.evaluate(()=>{ for (const im of globalThis.fixture.images) { im.available = false; im.url = ''; } globalThis.fixture.metadata.images = {}; globalThis.editor.render(); });
    assert.match(await page.locator('.image-current').textContent(), /Preview its place|Place preview/);
    await page.locator('.image-current [data-preview-place]').click();
    const place = generated.at(-1);
    assert.match(place.compose.placePreview, /^place:outside-sento\|night\|/);
    assert.match(place.positive, /no people.*outside a sento, a noren curtain.*night lighting/);
    assert.doesNotMatch(place.positive, /1girl|Alice/);
    assert.ok(place.w <= 640 && place.h <= 640 && place.steps === 20, 'small and quick');
    jobsNow.push({id:'pl-1',status:'done',file:'pl.png',thumb:'pl.webp',compose:{placePreview:place.compose.placePreview}});
    await page.locator('[data-refresh-images]').click();
    await page.waitForFunction(()=>/Place preview: Outside sento, Night lighting\./.test(globalThis.document.querySelector('.place-preview figcaption')?.textContent || ''));
    assert.equal(await page.locator('.place-preview img').count(), 1);
    // the generated prompt shows each block's words on its own tint, named on hover; the text is unchanged
    assert.ok(await page.locator('#assembled .pp-place[title=Setting]').count());
    assert.ok(await page.locator('#assembled .pp-light').count());
    await page.locator('#generate').click();
    assert.equal(generated.at(-1).positive, await page.locator('#assembled').textContent());
    assert.equal(await page.locator('#renders [data-lib]').filter({hasText: 'ex.png'}).count(), 0);
    // Local prompt blocks are editable on the person, persist through history and never write a template.
    await page.locator('[data-outfit-for=alice]').selectOption('usual');
    const local = key => page.locator(`[data-person-id=alice][data-shot-person-field=${key}]`);
    await local('appearance').fill('Alice, adult woman, black hair in a tidy bun');
    await local('clothing').fill('blue sweater halfway on, one arm through its sleeve');
    await page.locator('[data-person=alice] .person-exclusions summary').click();
    await local('appearanceNegative').fill('messy bun');
    await local('clothingNegative').fill('coat');
    await page.locator('#generate').click();
    const localJob = generated.at(-1);
    assert.match(localJob.positive, /tidy bun, blue sweater halfway on/);
    assert.equal(localJob.positive, await page.locator('#assembled').textContent());
    assert.match(localJob.negative, /messy bun, coat/);
    assert.equal(presets.character[0].data.outfit, 'blue coat');
    assert.equal(created.length, 1, 'only the earlier explicit new setting writes a shared preset');
    // Round-trip saved metadata, then restore from a generated history record.
    await page.evaluate(() => { fixture.metadata = JSON.parse(JSON.stringify(fixture.metadata)); globalThis.editor.render(); });
    assert.equal(await local('clothing').inputValue(), localJob.compose.people.alice.clothing);
    history.unshift({run_id:'local',at:'2026-10-12',characters:['alice','bob'],positive:localJob.positive,negative:localJob.negative,model_file:'fixture.safetensors',compose:localJob.compose,renders:[{id:'local-1',file:'local.png',thumb:'local.webp',seed:6}]});
    await page.locator('[data-refresh-images]').click();
    await page.waitForFunction(() => globalThis.document.querySelectorAll('[data-lib=reuse]').length >= 2);
    await local('clothing').fill('temporary words');
    await page.locator('[data-lib=reuse]').first().click();
    assert.equal(await local('clothing').inputValue(), localJob.compose.people.alice.clothing);
    await local('clothing').fill('');
    await page.locator('#generate').click();
    assert.doesNotMatch(generated.at(-1).positive, /blue coat|sweater/);
    await page.locator('[data-reset-person=clothing][data-person-id=alice]').click();
    assert.equal(await local('clothing').inputValue(), 'wearing blue coat');
    await local('clothing').fill(localJob.compose.people.alice.clothing);
    fs.mkdirSync('/tmp/codex-subplot-shot-blocks',{recursive:true});
    // A shot containing only the unnamed person still has reusable local prompt blocks.
    presets.character.push({id:'extra',v:1,data:{generic:true,name:'Unnamed adult',gender:'male',look:'brown hair'}});
    await page.locator('#loadPresets').click();
    history.unshift({run_id:'generic',at:'2026-10-13',characters:['extra'],positive:'Unnamed adult with a neat haircut',model_file:'fixture.safetensors',compose:{characters:[],man:true,people:{extra:{appearance:'Unnamed adult with a neat haircut',clothing:'green jacket'}}},renders:[{id:'generic-1',file:'generic.png',seed:9}]});
    await page.locator('[data-refresh-images]').click();
    await page.waitForFunction(() => globalThis.document.querySelectorAll('[data-lib=reuse]').length >= 3);
    await page.locator('[data-lib=reuse]').first().click();
    assert.equal(await page.locator('[data-person=extra]').count(), 1);
    assert.equal(await page.locator('[data-shot-person-field=appearance][data-person-id=extra]').inputValue(), 'Unnamed adult with a neat haircut');
    await page.locator('[data-lib=reuse]').nth(1).click();
    assert.equal(await local('appearance').inputValue(), localJob.compose.people.alice.appearance);
    // Use the actual composer's three columns for the visual checks.
    await page.evaluate(() => {
      const main = globalThis.document.querySelector('main');
      main.style = '';
      const dialog = globalThis.document.createElement('dialog'); dialog.className = 'compose-dialog'; dialog.id = 'composeDialog';
      const head = globalThis.document.createElement('div'); head.className = 'compose-head'; head.innerHTML = '<h2>Compose a new picture <span id=composeFor></span></h2><span class=quiet></span><button id=closeCompose>Done</button>';
      dialog.append(head); globalThis.document.body.append(dialog);
      for (const overlay of globalThis.document.querySelectorAll('.lib-overlay')) dialog.append(overlay);
      const body = globalThis.document.createElement('div'); body.className = 'compose-body';
      const composition = globalThis.document.querySelector('#composition'); composition.className = 'compose-col';
      const stage = globalThis.document.createElement('div'); stage.id = 'composePreview'; stage.className = 'compose-col compose-stage';
      const side = globalThis.document.createElement('div'); side.className = 'compose-col compose-side';
      const shot = globalThis.document.createElement('div'); shot.id = 'composeShot';
      side.append(shot, globalThis.document.querySelector('#renders'));
      body.append(composition, stage, side); dialog.append(body); main.hidden = true; dialog.showModal(); globalThis.editor.render();
    });
    assert.equal(await page.locator('.compose-head .shot-mode').count(), 1);
    assert.equal(await page.locator('.compose-head .shot-mode button').count(), 2);
    await page.locator('.compose-head .shot-mode button').first().click();
    await page.setViewportSize({width:1366,height:844});
    // Every selected prompt block can be adapted without a shared-preset API write.
    await page.locator('[data-compose=pose]').selectOption('seated');
    const word = (kind, id, key = 'text') => page.locator(`[data-block-kind="${kind}"][data-block-id="${id}"][data-block-word="${key}"]`);
    const openWords = async (kind, id) => {
      const d = page.locator(`[data-local-block="${kind}"][data-local-id="${id}"]`);
      if (!await d.evaluate(el => el.open)) await d.locator('summary').click();
    };
    await openWords('location', 'outside-sento');
    await word('location', 'outside-sento').fill('outside a cafe with its door open');
    await openWords('light', 'night');
    await word('light', 'night').fill('warm window light');
    await openWords('style', 'paint');
    await word('style', 'paint', 'quality').fill('ink drawing');
    await word('style', 'paint', 'anchors').fill('fine pen strokes');
    await word('style', 'paint', 'suffix').fill('muted colours');
    await word('style', 'paint', 'negative').fill('rough lines');
    await openWords('pose', 'seated');
    await word('pose', 'seated').fill('leaning forward');
    await page.locator('[data-cam-tab=shot]').click();
    await openWords('camera', 'full');
    await word('camera', 'full', 'prompt').fill('full length view from across the room');
    if (!await page.locator('.image-settings').evaluate(el => el.open)) await page.locator('.image-settings > summary').click();
    await openWords('framing', 'wide');
    await word('framing', 'wide', 'prompt').fill('extra room above the head');
    if (!await page.locator('.image-exclude').evaluate(el => el.open)) await page.locator('.image-exclude > summary').click();
    await page.locator('[data-negative=clean]').click();
    if (await page.locator('[data-negative=clean]').getAttribute('aria-pressed') !== 'true') await page.locator('[data-negative=clean]').click();
    await openWords('negative', 'clean');
    await word('negative', 'clean').fill('window reflections');
    const beforeLocal = JSON.stringify(presets);
    await page.locator('#generate').click();
    const adapted = generated.at(-1);
    assert.match(adapted.positive, /ink drawing.*fine pen strokes.*leaning forward.*outside a cafe.*warm window light.*full length view.*extra room above the head.*muted colours/);
    assert.match(adapted.negative, /window reflections, rough lines/);
    assert.equal(adapted.negative, await page.locator('#assembledNegative').textContent());
    assert.equal(adapted.positive, await page.locator('#assembled').textContent());
    assert.equal(created.length, 1);
    assert.equal(JSON.stringify(presets), beforeLocal);
    await word('negative', 'clean').fill('');
    assert.doesNotMatch(await page.locator('#assembledNegative').textContent(), /window reflections|watermark/);
    await page.locator('[data-reset-block-words=negative]').click();
    assert.match(await page.locator('#assembledNegative').textContent(), /watermark/);
    // Local setting changes make a fresh place preview with the same local words.
    await page.locator('#composeShot [data-preview-place]').click();
    assert.match(generated.at(-1).positive, /ink drawing.*outside a cafe.*warm window light.*extra room above the head/);
    assert.notEqual(generated.at(-1).compose.placePreview, place.compose.placePreview);
    // The shot mode edits hard in place. It does not navigate, discard copied prompts or change the library cookie.
    await page.locator('[data-compose=rating]').selectOption('nsfw');
    const cookieBefore = await page.context().cookies(), urlBefore = page.url();
    await page.locator('[data-shot-mode=adult]').click();
    assert.doesNotMatch(await page.locator('#assembledNegative').textContent(), /visible genitals/);
    await page.locator('[data-shot-mode=nonadult]').click();
    assert.match(await page.locator('#assembledNegative').textContent(), /visible genitals/);
    await page.evaluate(() => { fixture.metadata.compositions.three.override = {positive:'Exact original words',negative:'visible nipples, original exclusions'}; globalThis.editor.render(); });
    await page.locator('[data-shot-mode=adult]').click();
    assert.equal(await page.locator('#assembled').textContent(), 'Exact original words');
    assert.equal(await page.locator('#assembledNegative').textContent(), 'visible nipples, original exclusions');
    assert.deepEqual(await page.context().cookies(), cookieBefore);
    assert.equal(page.url(), urlBefore);
    // A picture of a private scene is a reward: its soft preset is on and locked in Exclude while the shot is Nonadult,
    // at General as well, and Adult leaves it out (CLAUDE.md, Reward tiers by mode)
    await page.evaluate(() => { fixture.metadata.compositions.three.override = null; fixture.audience = 'private'; globalThis.editor.render(); });
    await page.locator('[data-compose=rating]').selectOption('safe');
    await page.locator('[data-shot-mode=nonadult]').click();
    const softChip = page.locator('[data-negative=soft]');
    assert.equal(await softChip.getAttribute('aria-pressed'), 'true');
    assert.notEqual(await softChip.getAttribute('disabled'), null);
    assert.match(await page.locator('#assembledNegative').textContent(), /visible genitals/);
    assert.match(await page.locator('.image-exclude p.hint', {hasText: 'Nonadult reward'}).textContent(), /always on/);
    // the reward's configured defaults are locked too, and section words never take them out (#616)
    assert.notEqual(await page.locator('[data-negative=clean]').getAttribute('disabled'), null);
    await page.locator('[data-section-negative=details]').fill('visible genitals');
    assert.equal((await page.locator('#assembledNegative').textContent()).split(', ').filter(t => t === 'visible genitals').length, 1);
    await page.locator('[data-section-negative=details]').fill('');
    await page.locator('[data-shot-mode=adult]').click();
    assert.notEqual(await page.locator('[data-negative=clean]').getAttribute('disabled'), null);
    assert.equal(await softChip.getAttribute('disabled'), null);
    assert.equal(await softChip.getAttribute('aria-pressed'), 'false');
    assert.doesNotMatch(await page.locator('#assembledNegative').textContent(), /visible genitals/);
    await page.locator('[data-shot-mode=nonadult]').click();
    await page.evaluate(() => { fixture.audience = undefined; for (const c of Object.values(fixture.metadata.compositions || {})) delete c.reward; globalThis.editor.render(); });
    assert.equal(await page.locator('[data-negative=soft]').getAttribute('disabled'), null);
    assert.equal(await page.locator('[data-compose=rating]').inputValue(), 'safe');
    await page.locator('[data-compose=rating]').selectOption('nsfw');
    assert.match(await page.locator('#assembledNegative').textContent(), /visible genitals/);
    await page.locator('[data-compose=rating]').selectOption('safe');
    // Each section has its own words to avoid, under it; they join the exclusions in section order and are kept (#616)
    await page.locator('[data-section-negative=setting]').fill('crowd, street signs');
    await page.locator('[data-section-negative=pose]').fill('crossed arms');
    await page.locator('[data-section-negative=scene]').fill('phone');
    assert.match(await page.locator('#assembledNegative').textContent(), /phone, crossed arms, crowd, street signs, bad hands, child, loli$/);
    assert.match(await page.locator('.image-exclude-peek, .exclude-peek').first().textContent(), /words by section/);
    await page.locator('#generate').click();
    assert.deepEqual(generated.at(-1).compose.sectionNegatives, {setting: 'crowd, street signs', pose: 'crossed arms', scene: 'phone'});
    assert.equal(generated.at(-1).negative, await page.locator('#assembledNegative').textContent());
    await page.locator('[data-section-negative=scene]').fill('');
    await page.locator('[data-section-negative=pose]').fill('');
    // Background-only generated compositions keep their local words on history reuse.
    const background = structuredClone(adapted.compose); background.characters = []; background.chars = []; background.man = false;
    history.unshift({run_id:'blocks',at:'2026-10-14',characters:[],positive:adapted.positive,negative:adapted.negative,model_file:'fixture.safetensors',compose:background,renders:[{id:'blocks-1',file:'blocks.png',seed:10}]});
    await page.locator('[data-refresh-images]').click();
    await page.waitForFunction(() => globalThis.document.querySelectorAll('[data-lib=reuse]').length >= 4);
    await page.locator('[data-lib=reuse]').first().click();
    assert.equal(await word('location', 'outside-sento').inputValue(), background.blockOverrides.location['outside-sento'].text);
    assert.equal(await page.locator('[data-person]').count(), 0);
    await page.evaluate(c => { fixture.metadata.compositions.three = c; globalThis.editor.render(); }, adapted.compose);
    await openWords('location', 'outside-sento');
    await openWords('style', 'paint');
    await openWords('camera', 'full');
    await openWords('pose', 'seated');
    // The grid and lightbox share exact newest-first image order, including merged live jobs.
    const at = '2026-10-15T12:00:00Z', epoch = Date.parse(at) / 1000;
    history.splice(0, history.length, {run_id:'ordered',at,characters:['alice'],renders:[
      {id:'old-order',file:'order-old.png',n:39,at_epoch:epoch,idx:0},
      {id:'batch-zero',file:'order-zero.png',n:40,at_epoch:epoch+1,idx:0},
      {id:'batch-one',file:'order-one.png',n:41,at_epoch:epoch+1,idx:1},
      {id:'later-run',file:'order-later.png',n:42,at_epoch:epoch+1,idx:0},
    ]});
    jobsNow.push({id:'batch-one',status:'done',file:'order-one.png',at_epoch:epoch+1,n:null,idx:1},
      {id:'completed-live',status:'done',file:'order-live.png',at_epoch:epoch+2,n:43},
      {id:'pending-live',status:'running',created:epoch+3});
    await page.locator('[data-refresh-images]').click();
    await page.waitForFunction(() => globalThis.document.querySelectorAll('#renders [data-lib=open]').length === 5);
    assert.deepEqual(await page.locator('#renders [data-lib=open] img').evaluateAll(els => els.map(el => el.src.split('/').at(-1))), ['order-live.png','order-later.png','order-one.png','order-zero.png','order-old.png']);
    assert.match(await page.locator('#renders .render-card').nth(3).textContent(), /#41/);
    await page.locator('#renders [data-lib=open]').first().click();
    assert.match(await page.locator('#libLightbox .pic img').getAttribute('src'), /order-live.png/);
    await page.keyboard.press('ArrowRight');
    assert.match(await page.locator('#libLightbox .pic img').getAttribute('src'), /order-later.png/);
    await page.keyboard.press('Escape');
    await page.locator('[data-section-negative=setting]').fill('crowd, street signs');
    for (const width of [2560, 1366, 390]) {
      await page.setViewportSize({width,height:844});
      await page.locator('[data-person=alice]').screenshot({path:`/tmp/codex-subplot-shot-blocks/people-${width}.png`});
      for (const section of ['place', 'look', 'direction']) await page.locator('.image-' + section).screenshot({path:`/tmp/codex-subplot-shot-blocks/${section}-${width}.png`});
      await page.locator('[data-local-block=pose]').screenshot({path:`/tmp/codex-subplot-shot-blocks/pose-${width}.png`});
      await page.locator('.section-avoid', {has: page.locator('[data-section-negative=setting]')}).screenshot({path:`/tmp/codex-subplot-shot-blocks/setting-avoid-${width}.png`});
      await page.locator('.image-direction').evaluate(el => el.scrollIntoView({block:'start'}));
      await page.evaluate(() => { globalThis.document.querySelector('#composeDialog').scrollTop = 0; globalThis.scrollTo(0,0); });
      await page.screenshot({path:`/tmp/codex-subplot-shot-blocks/direction-screen-${width}.png`});
      await page.evaluate(() => { globalThis.document.querySelector('#composeDialog').scrollTop = 0; globalThis.scrollTo(0,0); globalThis.document.querySelector('.compose-body').scrollTop = 0; for (const col of globalThis.document.querySelectorAll('.compose-col')) col.scrollTop = 0; });
      await page.screenshot({path:`/tmp/codex-subplot-shot-blocks/editor-${width}.png`});
      assert.ok(await local('appearance').evaluate(el => el.getBoundingClientRect().width) > 200);
      assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth > globalThis.innerWidth),false);
    }
    assert.deepEqual(errors,[]);
    fs.mkdirSync('/tmp/codex-subplot-shot-blocks',{recursive:true});
    await page.screenshot({path:'/tmp/codex-subplot-shot-blocks/550.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth > globalThis.innerWidth),false);
    await page.screenshot({path:'/tmp/codex-subplot-shot-blocks/390.png',fullPage:true});
    history.splice(0, history.length, ...Array.from({length:100}, (_, i) => ({run_id:'page-'+i,at:'2026-10-15T12:00:00Z',last_n:100-i,renders:[]})));
    await page.locator('[data-refresh-images]').click();
    await page.locator('[data-more-images]').click();
    await page.waitForFunction(() => !globalThis.document.querySelector('[data-more-images]'));
    assert.deepEqual(historyQueries.findLast(q => q.before), {limit:'100',who:'all',pictures:'1',before:'2026-10-15T12:00:00Z',before_run:'page-99',before_n:'1'});
    await page.close();
    console.log('PASS local prompt blocks, explicit blanks, reset, saved history, background-only reuse, adapted place previews, shot modes with copied prompts and unchanged cookies; image editor: Preview this place in the empty picture slot, setting and light rows folded to the choice, the prompt tinted by block, Direct the shot (camera tabs, shot size tiles, stage drag, facing, gaze, arrow keys, the stage reopened by Reuse), Make examples, auto-connect, scene direction, cast/outfit, multiple cameras, generation request, full history, separate shot selections, reuse with Fill from prompt, + New setting from Bathhouse, lightbox star and keys, a shot opened from its source with Small changes, people folded to the cast, settings folded with seed Auto or Fixed and size presets, 390px layout.');
  }, {timeoutMs:60000,gpuWaitMs:60000});
} finally {server.kill('SIGTERM');fs.rmSync(root,{recursive:true,force:true});}
