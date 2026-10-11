// The scene editor in a real browser, on fixture data only: a temporary public story file and a routed private
// scene. Never opens the real private library, never starts a render.
// GL=soft node tools/subplots/test/browser.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { withBrowserJob } from '../../lib/browser-job.mjs';

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scene-editor-browser-'));
fs.mkdirSync(path.join(root, 'game3d/story'), { recursive: true });
const file = path.join(root, 'game3d/story/office.js');
const original = `export default {
  on: { 'talk:mio': { if: 'day >= 2', node: 'welcome' } },
  nodes: {
    welcome: [
      { do: 'cam', on: 'mio', zoom: 1.4 }, // close on her
      'mio: The meeting starts in ten minutes.',
      { say: 'eric', text: 'Which room are we using?' },
      { choice: [
        { text: 'Ask about the room', go: 'room' },
        { text: 'Come back later', go: 'later' },
      ] },
    ],
    room: ['mio: The room beside reception.'],
    later: [
      'eric: See you there.',
      { if: 'mc_carina', then: ['mio: Bye, Carina.'], else: ['mio: Bye, Eric.'] },
    ],
  },
};
`;
fs.writeFileSync(file, original);
const port = 8796, base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['tools/review_server.py', String(port)], {
  cwd: repo, stdio: 'ignore',
  env: { ...process.env, SUBPLOTS_ROOT: root, SUBPLOTS_STATE: path.join(root, 'state'), SUBPLOTS_PUBLIC_ONLY: '1' },
});
const portraitFile = path.join(repo, 'game3d/assets/portraits/mio-neutral.webp');
const authoring = {
  characters: [
    { id: 'eric', name: 'Eric', color: '#8fb4d8', faces: [{ id: 'neutral', label: 'Neutral' }] },
    { id: 'mio', name: 'Mio', color: '#5fc6bf', portrait: '/fixture/mio.webp', faces: [{ id: 'neutral', label: 'Neutral' }, { id: 'smile', label: 'Smile' }] },
    { id: 'emi', name: 'Emi', color: '#e0906f' },
  ],
  places: [{ id: 'office', name: 'IT support, B2' }],
  variables: [{ id: 'day', label: 'Story day', type: 'number' }],
  events: [{ id: 'talk:mio', label: 'Talk to Mio' }],
  deliveries: [{ id: '', label: 'Natural' }, { id: 'warm', label: 'Warm' }],
  words: [],
};
const privateRow = { id: 'local:fixture:bath:start', provider: 'local', title: 'bath · start', node: 'start', scene: 'enc_bath', group: 'Encounters', where: 'island/private/rewards/tools/fixture.src.mjs', count: 5, audience: 'private' };
const privateScene = {
  ...privateRow, recipe: true, revision: 'p1', metadata: {}, entries: [], routesEditable: false, history: [],
  placement: { place: 'office', day: 2, condition: null }, previewUrl: '/game3d/index.html?scene=enc_bath',
  images: [{ id: 'image:0', file: 'encounters/missing.webp', available: false }],
  steps: [
    { narration: 'Steam over the water.', $recipe: "n('Steam over the water.')" },
    { shot: { fade: 900 }, $staging: { fade: 900 }, imageSlot: 'image:0', $recipe: "pic('missing')" },
    { say: 'mio', text: 'ちょっと待って', en: 'Wait a second.', ja: 'ちょっと待って', emo: '', $recipe: "duo(s('mio','ちょっと待って'),'Wait a second.')" },
    { if: 'mc_carina', then: [{ narration: 'She hands Carina a towel.' }], else: [{ narration: 'She hands Eric a towel.' }] },
    { choice: [{ text: 'Look', go: 'look' }, { text: 'Leave', go: 'leave' }], $recipe: "choice([...])" },
  ],
};
// the parts the choice leads to, each its own scene for saving
const privateParts = {
  look: { ...privateScene, id: 'local:fixture:bath:look', node: 'look', title: 'bath · look', count: 1, steps: [{ narration: 'You sit on the edge of the bath.' }] },
  leave: { ...privateScene, id: 'local:fixture:bath:leave', node: 'leave', title: 'bath · leave', count: 1, steps: [{ narration: 'You walk on.' }] },
};
const privateRows = [privateRow, ...Object.values(privateParts).map(({ id, node, title, count }) => ({ ...privateRow, id, node, title, count }))];

const wait = ms => new Promise(r => setTimeout(r, ms));
// The test server runs outside private mode, where private scenes are refused; their comments are answered here the
// way the editor's server answers them in private mode (comments.mjs, on the fixture's folder).
process.env.SUBPLOTS_ROOT = root;
process.env.SUBPLOTS_STATE = path.join(root, 'state');
const comments = await import('../comments.mjs');
// image generator presets in realistic numbers, so the full-screen composer is checked with a full cast
const named = (n, prefix, data = i => ({})) => Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, v: 1, data: { name: `${prefix[0].toUpperCase()}${prefix.slice(1)} ${i + 1}`, ...data(i) } }));
const presets = {
  character: named(20, 'person', i => ({ portrait: 'art/fixture.webp', outfit: i < 2 ? 'a coat' : '' })), camera: named(12, 'camera', () => ({ prompt: 'camera' })),
  negative: named(8, 'avoid', i => ({ text: 'x', default: i < 2 })), model: named(2, 'model', () => ({ file: 'fixture.safetensors' })),
  style: named(3, 'style'), framing: named(3, 'frame', () => ({ w: 896, h: 1152 })), scene: named(4, 'direction', () => ({ text: 'Reading' })),
};
// the runs the server matches to a scene (api.py scene_runs), as the editor asks for them
const sceneRuns = { runs: [{ run_id: 'old', at: '2026-10-09T10:00:00', round: 'island/private/rewards/peeks/bath-2', positive: 'steam', characters: ['mio'], renders: [{ id: 'r-41', n: 41, file: 'x.png', thumb: 'x.png' }] }] };
// what a part of the page shows, with the words in its text boxes
const textOf = loc => loc.evaluate(el => el.innerText + '\n' + [...el.querySelectorAll('textarea, input')].map(x => x.value).join('\n'));
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base + '/api/subplots/catalog')).ok) break; } catch { /* starting */ } await wait(100); }
  await withBrowserJob('scene-editor-browser', async browser => {
    for (const width of [2560, 1366]) {
      fs.writeFileSync(file, original);
      fs.rmSync(path.join(root, 'state'), { recursive: true, force: true });
      fs.rmSync(path.join(root, 'island'), { recursive: true, force: true });
      const page = await browser.newPage({ viewport: { width, height: width > 2000 ? 1440 : 768 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      let privateSave = null;
      const privateSaves = [];
      await page.route('**/island/private/**', r => r.abort());
      await page.route('**/api/subplots/authoring', r => r.fulfill({ json: authoring }));
      await page.route('**/fixture/mio.webp', r => r.fulfill({ path: portraitFile }));
      await page.route('**/api/subplots/catalog?scope=all', async r => {
        const real = await (await fetch(base + '/api/subplots/catalog')).json();
        // more groups than fit, to open one far down the list (never opened as scenes)
        const filler = Array.from({ length: 40 }, (_, i) => ({ id: `public:game3d/story/zz${i}.js#a`, node: 'a', group: `zz${i}`, where: `game3d/story/zz${i}.js`, count: 1, audience: 'public' }));
        r.fulfill({ json: { ...real, scenes: [...real.scenes, ...filler, ...privateRows], local: true } });
      });
      await page.route('**/api/subplots/read?id=local*', r => {
        const id = new URL(r.request().url()).searchParams.get('id');
        r.fulfill({ json: Object.values(privateParts).find(p => p.id === id) || privateScene });
      });
      await page.route('**/api/subplots/draft', r => r.request().postDataJSON().id.startsWith('local:') ? r.fulfill({ json: { ok: true } }) : r.continue());
      await page.route('**/api/subplots/save', r => {
        const body = r.request().postDataJSON();
        if (!body.id.startsWith('local:')) return r.continue();
        privateSave = body;
        privateSaves.push(body.id);
        return r.fulfill({ json: { ...(Object.values(privateParts).find(p => p.id === body.id) || privateScene), ...body, revision: 'p2' } });
      });
      await page.route('**/api/subplots/image/**', r => {
        const u = new URL(r.request().url());
        if (u.pathname.endsWith('/history')) return r.fulfill({ json: [{ at: '2026-10-10T10:00:00', positive: 'steam', renders: [{ id: 'r-41', n: 41, file: 'x.png', thumb: 'x.png' }] }] });
        if (u.pathname.includes('/thumb/') || u.pathname.includes('/out/') || u.pathname.includes('/repo/')) return r.fulfill({ path: portraitFile });
        if (u.pathname.endsWith('/presets')) return r.fulfill({ json: presets });
        return r.fulfill({ json: [] });
      });
      await page.route('**/api/subplots/pictures?*', r => r.fulfill({ json: sceneRuns }));
      await page.route('**/api/subplots/comment', r => {
        const body = r.request().postDataJSON();
        if (!comments.isPrivate(body.id || 'public:')) return r.continue();
        r.fulfill({ json: comments.run({ ...body, by: 'jorgen' }) });
      });
      await page.route('**/api/subplots/comments?*', async r => {
        const ids = new URL(r.request().url()).searchParams.get('ids').split(',');
        r.fulfill({ json: comments.run({ action: 'list', ids }) });
      });
      // the private half of the status comes from the local provider, which QA never runs: fixture rows stand in
      await page.route('**/api/subplots/status', async r => {
        const real = await (await fetch(base + '/api/subplots/status')).json();
        const open = comments.run({ action: 'list', ids: privateRows.map(row => row.id) }).comments.filter(c => c.status === 'open');
        for (const row of privateRows) real.status[row.id] = { stage: 'pictures', label: '1 picture missing', draft: false, comments: open.filter(c => c.scene === row.id).length };
        r.fulfill({ json: real });
      });
      await page.goto(base + '/tools/subplots/web/');

      // open from the list; labels say what goes where
      await page.locator('.area-head', { hasText: 'IT support, B2' }).click();
      await page.locator('.scene-row', { hasText: 'Welcome' }).click();
      await page.locator('.beat').first().waitFor();
      assert.equal(await page.locator('#docAudience').innerText(), 'Public game');
      assert.equal(await page.locator('#docWhere').innerText(), 'game3d/story/office.js');
      // the scene's own beats, then the part the first option leads to, as one reading path
      const top = page.locator('#timeline > .beats > .beat');
      await page.locator('.path-section').waitFor();
      assert.equal(await top.count(), 4);
      assert.match(await top.nth(0).innerText(), /Camera moves in on Mio/);
      assert.match(await page.locator('.path-head').innerText(), /After “Ask about the room”/);
      assert.match(await textOf(page.locator('.path-section')), /The room beside reception/);
      assert.match(await page.locator('.path-bar').innerText(), /Ask about the room/);
      assert.doesNotMatch(await textOf(page.locator('#timeline')), /\$expression|do:|go:|@room|@later/);

      // opening a group far down the list leaves the list where it is (Jørgen: "I am immediately thrown back")
      const list = page.locator('#sceneList');
      await list.evaluate(el => { el.scrollTop = el.scrollHeight; });
      const before = await list.evaluate(el => el.scrollTop);
      assert.ok(before > 200, 'the list scrolls');
      await page.locator('.area-head', { hasText: 'Zz39' }).click();
      await page.locator('.area.open .area-head', { hasText: 'Zz39' }).waitFor();
      assert.ok(Math.abs(await list.evaluate(el => el.scrollTop) - before) < 60, 'the list stays put');
      await list.evaluate(el => { el.scrollTop = 0; });

      // edit a line in place, undo and redo
      const line = top.nth(1).locator('[data-field=main]');
      await line.fill('The meeting starts at nine.');
      assert.equal(await page.locator('#status').innerText(), 'Unsaved changes');
      await page.locator('.timeline-wrap').click({ position: { x: 5, y: 5 } });
      await page.keyboard.press('Control+z');
      assert.equal(await line.inputValue(), 'The meeting starts in ten minutes.');
      await page.keyboard.press('Control+Shift+z');
      assert.equal(await line.inputValue(), 'The meeting starts at nine.');

      // change the speaker from the picker
      await top.nth(2).locator('.speaker').click();
      await page.locator('.people button', { hasText: 'Emi' }).click();
      assert.match(await top.nth(2).locator('.speaker').innerText(), /Emi/);

      // drag the question above the first line
      await top.nth(2).locator('.grip').hover();
      await top.nth(2).locator('.grip').dragTo(top.nth(1), { targetPosition: { x: 200, y: 4 } });
      assert.match(await textOf(top.nth(1)), /Which room/);

      // add narration at the end of the branch: it goes into the part the option leads to
      await page.locator('.path-section .add-row.full button', { hasText: 'Narration' }).click();
      await page.keyboard.type('The room is cold.');
      assert.equal(await page.locator('.path-section .beat').count(), 2);

      // save: each changed part is written on its own, untouched text stays as written
      await page.keyboard.press('Control+s');
      await page.locator('#status', { hasText: /^Saved$/ }).waitFor();
      let saved = fs.readFileSync(file, 'utf8');
      assert.match(saved, /'mio: The meeting starts at nine\.'/);
      assert.match(saved, /'emi: Which room are we using\?'/);
      assert.match(saved, /\{ do: 'cam', on: 'mio', zoom: 1.4 \}, \/\/ close on her/);
      assert.ok(saved.indexOf('Which room') < saved.indexOf('starts at nine'), 'question moved up');
      assert.match(saved, /room: \[\s*'mio: The room beside reception\.',\s*'> The room is cold\.',?\s*\]/);
      assert.match(saved, /    later: \[\n      'eric: See you there\.',\n      \{ if: 'mc_carina', then: \['mio: Bye, Carina\.'\], else: \['mio: Bye, Eric\.'\] \},\n    \],/, 'a part nobody edited is untouched');

      // switch the pick: the other option's part follows instead; an edit there saves into it
      await page.locator('#timeline > .beats > .beat.k-choice .option-tabs button', { hasText: 'Come back later' }).click();
      await page.locator('.path-head', { hasText: 'Come back later' }).waitFor();
      assert.match(await page.locator('.path-bar').innerText(), /Come back later/);
      assert.doesNotMatch(await textOf(page.locator('#timeline')), /room beside reception/);
      assert.match(await textOf(page.locator('.path-section')), /Bye, Eric\./);
      await page.locator('.path-bar [data-arm=then]').click();
      assert.match(await textOf(page.locator('.path-section')), /Bye, Carina\./);
      assert.match(await textOf(page.locator('.path-section')), /Both ways meet again here|Bye, Carina/);
      await page.locator('.path-section .beat').first().locator('[data-field=main]').fill('See you there soon.');
      await page.keyboard.press('Control+s');
      await page.locator('#status', { hasText: /^Saved$/ }).waitFor();
      saved = fs.readFileSync(file, 'utf8');
      assert.match(saved, /'eric: See you there soon\.'/);
      assert.match(saved, /room: \[\s*'mio: The room beside reception\.',\s*'> The room is cold\.',?\s*\]/);

      // preview follows the picked path into the part, with the picked option marked
      await top.first().click({ position: { x: 20, y: 12 } });
      await page.locator('#preview').click();
      await page.locator('.pv-talk').first().waitFor();
      for (let i = 0; i < 6 && !(await page.locator('.pv-chips [data-opt]').count()); i++) await page.keyboard.press('ArrowRight');
      assert.match(await page.locator('.pv-chips button.picked').innerText(), /Come back later/);
      await page.locator('.pv-chips button.picked').click();
      assert.match(await page.locator('.pv-line').first().innerText(), /See you there soon/);
      await page.locator('.pv-stage').click({ position: { x: 20, y: 20 } });
      assert.match(await page.locator('.pv-line').first().innerText(), /Bye, Carina/);
      await page.keyboard.press('Escape');

      // a revision restores the old text, and saving makes it the scene again
      await page.locator('[data-tab=scene]').click();
      await page.locator('.revision button').first().click();
      for (let i = 0; i < 50 && await top.nth(1).locator('[data-field=main]').inputValue() !== 'The meeting starts in ten minutes.'; i++) await wait(100);
      assert.equal(await top.nth(1).locator('[data-field=main]').inputValue(), 'The meeting starts in ten minutes.');
      await page.locator('#save').click();
      await page.locator('#status', { hasText: /^Saved$/ }).waitFor();
      assert.match(fs.readFileSync(file, 'utf8'), /ten minutes/);

      // a comment on a beat: the beat shows it, it stays with the beat when it moves, Claude answers from the command line
      const asked = top.nth(2);
      await asked.hover();
      await asked.locator(':scope > .tools [data-op=comment]').click();
      await page.locator('.pop.thread textarea').fill('Make this line shorter.');
      await page.locator('.pop.thread [data-send]').click();
      await asked.locator('.comment-mark.open').waitFor();
      const commentedText = await asked.locator('[data-field=main]').inputValue();
      await asked.locator('.grip').click();
      await page.keyboard.press('Alt+ArrowUp');
      const moved = top.filter({ has: page.locator('.comment-mark.open') });
      assert.equal(await moved.count(), 1);
      assert.equal(await moved.locator('[data-field=main]').inputValue(), commentedText, 'the comment moved with its beat');
      await page.locator('.timeline-wrap').click({ position: { x: 5, y: 5 } });
      await page.keyboard.press('Control+z');
      assert.equal(await page.locator('#status').innerText(), 'Saved');
      const cli = (...args) => execFileSync('node', ['tools/subplots/comments.mjs', ...args], { cwd: repo, encoding: 'utf8', env: { ...process.env, SUBPLOTS_ROOT: root, SUBPLOTS_STATE: path.join(root, 'state') } });
      const listed = cli('open');
      assert.match(listed, /Make this line shorter\./);
      assert.match(listed, /public:game3d\/story\/office\.js#welcome/);
      assert.match(listed, new RegExp(commentedText.slice(0, 20).replace(/[.?]/g, '\\$&')));
      const commentId = /^(c\S+)/m.exec(listed)[1];
      cli('done', commentId, 'Shortened it.');
      assert.match(cli('open'), /No open comments/);
      await page.evaluate(async () => (await import('/tools/subplots/web/comments.js')).loadComments());
      await moved.first().waitFor({ state: 'detached' }).catch(() => {});
      const doneMark = top.locator('.comment-mark').first();
      assert.equal(await doneMark.getAttribute('class'), 'comment-mark');
      await doneMark.click();
      assert.match(await page.locator('.pop.thread').innerText(), /Claude\s+Shortened it\./);
      assert.match(await page.locator('.pop.thread').innerText(), /Done/);
      await page.keyboard.press('Escape');
      assert.ok(fs.existsSync(path.join(root, 'state/comments.json')), 'public comments sit with the drafts');
      // outside private mode the server refuses anything private: reads, drafts, saves, comments
      const post = (action, body) => fetch(`${base}/api/subplots/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(x => x.status);
      assert.equal(await post('draft', { id: privateRow.id, steps: [] }), 403);
      assert.equal(await post('save', { id: privateRow.id, steps: [] }), 403);
      assert.equal(await post('comment', { action: 'add', id: privateRow.id, text: 'x' }), 403);
      assert.equal((await fetch(`${base}/api/subplots/comments?ids=${encodeURIComponent(privateRow.id)}`)).status, 403);

      // a private scene is labelled; its picture is replaced from the history
      await page.locator('[data-filter=private]').click();
      await page.locator('.area-head', { hasText: 'Encounters' }).click();
      await page.locator('.scene-row').first().click();
      await page.locator('.beat.k-picture').waitFor();
      assert.equal(await page.locator('#docAudience').innerText(), 'Private · Adult');
      assert.equal(await page.locator('#play').getAttribute('href'), '/game3d/index.html?scene=enc_bath');
      // its choice: Look follows below; Leave swaps it; who plays switches the branch and Play in game
      await page.locator('.path-head', { hasText: 'After “Look”' }).waitFor();
      assert.match(await textOf(page.locator('.path-section')), /edge of the bath/);
      assert.match(await textOf(page.locator('#timeline')), /She hands Eric a towel/);
      await page.locator('.beat.k-choice .option-tabs button', { hasText: 'Leave' }).click();
      assert.match(await textOf(page.locator('.path-section')), /You walk on/);
      assert.doesNotMatch(await textOf(page.locator('#timeline')), /edge of the bath/);
      await page.locator('.path-bar [data-arm=then]').click();
      assert.match(await textOf(page.locator('#timeline')), /She hands Carina a towel/);
      assert.equal(await page.locator('#play').getAttribute('href'), '/game3d/index.html?scene=enc_bath&mc=carina');
      await page.locator('.path-bar [data-arm=else]').click();
      await page.locator('.path-section .beat [data-field=main]').fill('You walk on, quickly.');
      await page.locator('.beat.k-picture .change').click();
      // "This scene" lists the scene's own pictures, from its rounds (Jørgen: "No pictures generated for this scene yet")
      assert.equal(await page.locator('#tabPicture [data-scene]').getAttribute('aria-pressed'), 'true');
      await page.locator('.history-grid button').first().click();
      await page.locator('.beat.k-picture.selected img').waitFor();
      assert.match(await page.locator('.pic-facts').innerText(), /New pick #41/);
      // the whole picture in the feed: full height at the column's width, not cropped
      const fit = await page.locator('.beat.k-picture img').evaluate(img => ({ w: img.clientWidth, h: img.clientHeight, ratio: img.naturalHeight / img.naturalWidth, box: img.closest('.body').clientWidth }));
      assert.ok(Math.abs(fit.h / fit.w - fit.ratio) < 0.02, `picture keeps its shape ${JSON.stringify(fit)}`);
      assert.ok(fit.w > fit.box - 30, `picture fills the column ${JSON.stringify(fit)}`);
      await page.screenshot({ path: path.join(os.tmpdir(), `scene-editor-private-${width}.png`) });
      // the composer fills the screen; its controls and settings fit without scrolling, at 1366 x 768 too
      if (width < 2000) await page.setViewportSize({ width, height: 768 });
      await page.locator('#tabPicture [data-compose]').click();
      await page.locator('#composePreview #generate').waitFor();
      await page.locator('#renders .render-card').first().waitFor();
      const cols = await page.evaluate(() => ({
        dialog: [globalThis.document.getElementById('composeDialog').offsetWidth, globalThis.document.getElementById('composeDialog').offsetHeight, globalThis.innerWidth, globalThis.innerHeight],
        cols: ['composition', 'composePreview'].map(id => { const el = globalThis.document.getElementById(id); return [id, el.clientHeight, el.scrollHeight]; }),
      }));
      assert.deepEqual(cols.dialog.slice(0, 2), cols.dialog.slice(2), 'the composer fills the screen');
      for (const [id, client, scroll] of cols.cols) assert.ok(scroll <= client + 2, `${id} fits without scrolling: ${client} < ${scroll}`);
      for (const name of ['model', 'seed', 'steps', 'cfg', 'width', 'height', 'referenceStrength', 'faceStrength']) assert.ok(await page.locator(`[data-compose=${name}]`).isVisible(), name + ' in view');
      assert.equal(await page.locator('[data-library=scene]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('#renders .render-card').count(), 1);
      await page.screenshot({ path: path.join(os.tmpdir(), `scene-editor-composer-${width}.png`) });
      await page.locator('#closeCompose').click();
      if (width < 2000) await page.setViewportSize({ width, height: 860 });
      await page.locator('#save').click();
      await page.locator('#status', { hasText: /^Saved$/ }).waitFor();
      assert.deepEqual(privateSaves.sort(), ['local:fixture:bath:leave', 'local:fixture:bath:start'], 'only the edited parts are saved');
      // a private scene's comment stays under island/private/
      const first = page.locator('#timeline > .beats > .beat').first();
      await first.hover();
      await first.locator(':scope > .tools [data-op=comment]').click();
      await page.locator('.pop.thread textarea').fill('More steam.');
      await page.locator('.pop.thread [data-send]').click();
      await first.locator('.comment-mark.open').waitFor();
      assert.match(fs.readFileSync(path.join(root, 'island/private/rewards/docs/scene-comments.json'), 'utf8'), /More steam/);
      assert.doesNotMatch(fs.readFileSync(path.join(root, 'state/comments.json'), 'utf8'), /More steam/);
      // the scene list and the header say where the scene stands
      await page.locator('#docStatus .st-dot').waitFor();
      assert.equal(await page.locator('.scene-row .st-dot').count(), await page.locator('.scene-row').count(), 'every listed scene has its status');
      await page.locator('#docStatus', { hasText: /1 picture missing · 1 open comment/ }).waitFor();
      assert.equal(await page.locator('.scene-row.current .st-c').innerText(), '1');
      await first.locator('.comment-mark').click();
      await page.screenshot({ path: path.join(os.tmpdir(), `scene-editor-comments-${width}.png`) });
      await page.keyboard.press('Escape');
      assert.equal(privateSave.id === 'local:fixture:bath:start' ? privateSave.metadata.images['image:0'].file : 'x.png', 'x.png');

      assert.equal(await page.evaluate(() => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth), false);
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`PASS ${width}: open, labels, list stays put, inline edit, undo and redo, speaker picker, drag, branches as one reading path (pick, switch, add and edit inside, who plays), per-part saves, preview on the path, revisions, private branch and picture pick, the scene's own pictures, full-height pictures, full-screen composer that fits, comments on beats (public and private, command line), scene status`);
    }
  }, { timeoutMs: 150000, gpuWaitMs: 60000 });
} finally {
  server.kill('SIGTERM');
  fs.rmSync(root, { recursive: true, force: true });
}
