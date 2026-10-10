// The scene editor in a real browser, on fixture data only: a temporary public story file and a routed private
// scene. Never opens the real private library, never starts a render.
// GL=soft node tools/subplots/test/browser.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
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
    later: ['eric: See you there.'],
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
const privateRow = { id: 'local:fixture:bath:start', provider: 'local', title: 'bath · start', node: 'start', scene: 'enc_bath', group: 'Encounters', where: 'island/private/rewards/tools/fixture.src.mjs', count: 3, audience: 'private' };
const privateScene = {
  ...privateRow, recipe: true, revision: 'p1', metadata: {}, entries: [], routesEditable: false, history: [],
  placement: { place: 'office', day: 2, condition: null }, previewUrl: '/game3d/index.html?scene=enc_bath',
  images: [{ id: 'image:0', file: 'encounters/missing.webp', available: false }],
  steps: [
    { narration: 'Steam over the water.', $recipe: "n('Steam over the water.')" },
    { shot: { fade: 900 }, $staging: { fade: 900 }, imageSlot: 'image:0', $recipe: "pic('missing')" },
    { say: 'mio', text: 'ちょっと待って', en: 'Wait a second.', ja: 'ちょっと待って', emo: '', $recipe: "duo(s('mio','ちょっと待って'),'Wait a second.')" },
  ],
};

const wait = ms => new Promise(r => setTimeout(r, ms));
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base + '/api/subplots/catalog')).ok) break; } catch { /* starting */ } await wait(100); }
  await withBrowserJob('scene-editor-browser', async browser => {
    for (const width of [2560, 1366]) {
      fs.writeFileSync(file, original);
      fs.rmSync(path.join(root, 'state'), { recursive: true, force: true });
      const page = await browser.newPage({ viewport: { width, height: width > 2000 ? 1440 : 860 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      let privateSave = null;
      await page.route('**/island/private/**', r => r.abort());
      await page.route('**/api/subplots/authoring', r => r.fulfill({ json: authoring }));
      await page.route('**/fixture/mio.webp', r => r.fulfill({ path: portraitFile }));
      await page.route('**/api/subplots/catalog?scope=all', async r => {
        const real = await (await fetch(base + '/api/subplots/catalog')).json();
        r.fulfill({ json: { ...real, scenes: [...real.scenes, privateRow], local: true } });
      });
      await page.route('**/api/subplots/read?id=local*', r => r.fulfill({ json: privateScene }));
      await page.route('**/api/subplots/draft', r => r.request().postDataJSON().id.startsWith('local:') ? r.fulfill({ json: { ok: true } }) : r.continue());
      await page.route('**/api/subplots/save', r => {
        const body = r.request().postDataJSON();
        if (!body.id.startsWith('local:')) return r.continue();
        privateSave = body;
        return r.fulfill({ json: { ...privateScene, ...body, revision: 'p2' } });
      });
      await page.route('**/api/subplots/image/**', r => {
        const u = new URL(r.request().url());
        if (u.pathname.endsWith('/history')) return r.fulfill({ json: [{ at: '2026-10-10T10:00:00', positive: 'steam', renders: [{ id: 'r-41', n: 41, file: 'x.png', thumb: 'x.png' }] }] });
        if (u.pathname.includes('/thumb/') || u.pathname.includes('/out/')) return r.fulfill({ path: portraitFile });
        return r.fulfill({ json: {} });
      });
      await page.goto(base + '/tools/subplots/web/');

      // open from the list; labels say what goes where
      await page.locator('.area-head', { hasText: 'IT support, B2' }).click();
      await page.locator('.scene-row', { hasText: 'Welcome' }).click();
      await page.locator('.beat').first().waitFor();
      assert.equal(await page.locator('#docAudience').innerText(), 'Public game');
      assert.equal(await page.locator('#docWhere').innerText(), 'game3d/story/office.js');
      assert.equal(await page.locator('.beat').count(), 4);
      assert.match(await page.locator('.beat').nth(0).innerText(), /Camera moves in on Mio/);
      assert.doesNotMatch(await page.locator('#timeline').innerText(), /\$expression|do:|go:/);

      // edit a line in place, undo and redo
      const line = page.locator('.beat').nth(1).locator('[data-field=main]');
      await line.fill('The meeting starts at nine.');
      assert.equal(await page.locator('#status').innerText(), 'Unsaved changes');
      await page.locator('.timeline-wrap').click({ position: { x: 5, y: 5 } });
      await page.keyboard.press('Control+z');
      assert.equal(await line.inputValue(), 'The meeting starts in ten minutes.');
      await page.keyboard.press('Control+Shift+z');
      assert.equal(await line.inputValue(), 'The meeting starts at nine.');

      // change the speaker from the picker
      await page.locator('.beat').nth(2).locator('.speaker').click();
      await page.locator('.people button', { hasText: 'Emi' }).click();
      assert.match(await page.locator('.beat').nth(2).locator('.speaker').innerText(), /Emi/);

      // drag the choice above the first line
      await page.locator('.beat').nth(3).locator('.grip').hover();
      await page.locator('.beat').nth(3).locator('.grip').dragTo(page.locator('.beat').nth(1), { targetPosition: { x: 200, y: 4 } });
      assert.match(await page.locator('.beat').nth(1).innerText(), /Choice/i);

      // add narration at the end
      await page.locator('#timeline > .add-row.full button', { hasText: 'Narration' }).click();
      await page.keyboard.type('The room is cold.');
      assert.equal(await page.locator('.beat').count(), 5);

      // save: the file changes, untouched text stays as written
      await page.keyboard.press('Control+s');
      await page.locator('#status', { hasText: /^Saved$/ }).waitFor();
      const saved = fs.readFileSync(file, 'utf8');
      assert.match(saved, /'mio: The meeting starts at nine\.'/);
      assert.match(saved, /'emi: Which room are we using\?'/);
      assert.match(saved, /\{ do: 'cam', on: 'mio', zoom: 1.4 \}, \/\/ close on her/);
      assert.match(saved, /'> The room is cold\.'/);
      assert.ok(saved.indexOf('Ask about the room') < saved.indexOf('starts at nine'), 'choice moved up');
      assert.match(saved, /room: \['mio: The room beside reception\.'\]/);

      // preview in the game's style, through the choice into another part
      await page.locator('.beat').first().click({ position: { x: 20, y: 12 } });
      await page.locator('#preview').click();
      await page.locator('.pv-talk').first().waitFor();
      assert.match(await page.locator('.pv-line').first().innerText(), /meeting starts at nine|Camera/);
      await page.keyboard.press('Escape');

      // a revision restores the old text, and saving makes it the scene again
      await page.locator('[data-tab=scene]').click();
      await page.locator('.revision button').first().click();
      assert.equal(await page.locator('.beat').nth(1).locator('[data-field=main]').inputValue(), 'The meeting starts in ten minutes.');
      await page.locator('#save').click();
      await page.locator('#status', { hasText: /^Saved$/ }).waitFor();
      assert.match(fs.readFileSync(file, 'utf8'), /ten minutes/);

      // a private scene is labelled; its picture is replaced from the history
      await page.locator('[data-filter=private]').click();
      await page.locator('.area-head', { hasText: 'Encounters' }).click();
      await page.locator('.scene-row').first().click();
      await page.locator('.beat.k-picture').waitFor();
      assert.equal(await page.locator('#docAudience').innerText(), 'Private · Adult');
      assert.equal(await page.locator('#play').getAttribute('href'), '/game3d/index.html?scene=enc_bath');
      await page.locator('.beat.k-picture .change').click();
      await page.locator('.history-grid button').first().click();
      await page.locator('.beat.k-picture.selected img').waitFor();
      assert.match(await page.locator('.pic-facts').innerText(), /New pick #41/);
      await page.locator('#save').click();
      await page.locator('#status', { hasText: /^Saved$/ }).waitFor();
      assert.equal(privateSave.metadata.images['image:0'].file, 'x.png');

      assert.equal(await page.evaluate(() => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth), false);
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`PASS ${width}: open, labels, inline edit, undo and redo, speaker picker, drag, add, save, preview, revisions, private picture pick`);
    }
  }, { timeoutMs: 150000, gpuWaitMs: 60000 });
} finally {
  server.kill('SIGTERM');
  fs.rmSync(root, { recursive: true, force: true });
}
